/**
 * scripts/lib/model-config.mjs
 *
 * Model-Provider and Checkpoint Configuration Subsystem
 * Goal: G-ML-017 (Model-Provider and Checkpoint Configuration Subsystem)
 *
 * Provides a centralized configuration manager and validator for model serving providers,
 * endpoint URIs, checkpoint versions, threshold parameters, and pre-flight health checks.
 */

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

/**
 * Valid supported model provider types.
 */
export const SUPPORTED_PROVIDERS = Object.freeze(['vllm', 'ollama', 'local', 'remote']);

/**
 * Typed error class representing endpoint connectivity or reachability failures.
 */
export class ModelEndpointUnreachableError extends Error {
  /**
   * @param {string} message - Error description
   * @param {object} [options]
   * @param {string} [options.code] - ENDPOINT_UNREACHABLE | CONNECTION_REFUSED | TIMEOUT | HTTP_ERROR | INVALID_CONFIG
   * @param {string} [options.endpoint] - Target endpoint URI
   * @param {number|null} [options.status] - HTTP status code if response received
   * @param {number} [options.latencyMs] - Measured latency before failure
   * @param {any} [options.details] - Extra diagnostic payload
   * @param {Error|null} [options.cause] - Underlying network or parsing error
   */
  constructor(message, { code = 'ENDPOINT_UNREACHABLE', endpoint = null, status = null, latencyMs = 0, details = null, cause = null } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ModelEndpointUnreachableError';
    this.code = code;
    this.endpoint = endpoint;
    this.status = status;
    this.latencyMs = latencyMs;
    this.details = details;
  }
}

/**
 * Validates a candidate URL string.
 * @param {string} urlStr
 * @returns {URL}
 * @throws {TypeError|RangeError}
 */
function parseAndValidateUrl(urlStr) {
  if (typeof urlStr !== 'string' || urlStr.trim().length === 0) {
    throw new TypeError(`Endpoint URI must be a non-empty string, received: ${typeof urlStr}`);
  }
  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch (err) {
    throw new TypeError(`Invalid endpoint URI format: "${urlStr}" (${err.message})`, { cause: err });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new RangeError(`Endpoint protocol must be http: or https:, received: "${parsed.protocol}"`);
  }
  return parsed;
}

/**
 * Centralized Model Serving Configuration Manager
 */
export class ModelConfig {
  /**
   * @param {object} [options]
   * @param {string} [options.provider] - Serving provider (vllm | ollama | local | remote)
   * @param {string} [options.endpoint] - Base HTTP/HTTPS endpoint URL
   * @param {string} [options.checkpoint] - Model checkpoint version or path
   * @param {number} [options.timeoutMs] - Request timeout SLA in milliseconds
   * @param {number} [options.healthTimeoutMs] - Pre-flight health check timeout in milliseconds
   * @param {number} [options.thresholdTau] - Confidence threshold parameter in [0.0, 1.0]
   * @param {string|null} [options.apiKey] - Optional authorization token
   * @param {string} [options.healthPath] - Path relative to endpoint for health probes (default: /health)
   * @param {string} [options.filePath] - Optional explicit path to configuration JSON file
   */
  constructor(options = {}) {
    let fileConfig = {};
    const configPath = options.filePath || process.env.SODA_MODEL_CONFIG_FILE;

    if (configPath) {
      const resolvedPath = path.resolve(process.cwd(), configPath);
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Model configuration file not found: ${resolvedPath}`);
      }
      try {
        const fileContent = fs.readFileSync(resolvedPath, 'utf8');
        fileConfig = JSON.parse(fileContent);
      } catch (err) {
        throw new Error(`Failed to parse configuration file at ${resolvedPath}: ${err.message}`, { cause: err });
      }
    } else {
      // Check default fallback configuration file if present
      const defaultPath = path.resolve(process.cwd(), 'soda-model.config.json');
      if (fs.existsSync(defaultPath)) {
        try {
          const fileContent = fs.readFileSync(defaultPath, 'utf8');
          fileConfig = JSON.parse(fileContent);
        } catch {}
      }
    }

    // 1. Resolve Provider
    const rawProvider = options.provider !== undefined
      ? options.provider
      : process.env.SODA_MODEL_PROVIDER !== undefined
        ? process.env.SODA_MODEL_PROVIDER
        : fileConfig.provider !== undefined
          ? fileConfig.provider
          : 'local';

    if (typeof rawProvider !== 'string' || !SUPPORTED_PROVIDERS.includes(rawProvider.toLowerCase())) {
      throw new RangeError(
        `Invalid model provider "${rawProvider}". Supported providers are: ${SUPPORTED_PROVIDERS.join(', ')}`
      );
    }
    this.provider = rawProvider.toLowerCase();

    // 2. Resolve Endpoint
    const rawEndpoint = options.endpoint !== undefined
      ? options.endpoint
      : process.env.SODA_MODEL_ENDPOINT !== undefined
        ? process.env.SODA_MODEL_ENDPOINT
        : fileConfig.endpoint !== undefined
          ? fileConfig.endpoint
          : 'http://127.0.0.1:8000/v1';

    const parsedUrl = parseAndValidateUrl(rawEndpoint);
    this.endpoint = parsedUrl.toString().replace(/\/+$/, '');

    // 3. Resolve Checkpoint
    const rawCheckpoint = options.checkpoint !== undefined
      ? options.checkpoint
      : process.env.SODA_MODEL_CHECKPOINT !== undefined
        ? process.env.SODA_MODEL_CHECKPOINT
        : fileConfig.checkpoint !== undefined
          ? fileConfig.checkpoint
          : 'v1.0.0';

    if (typeof rawCheckpoint !== 'string' || rawCheckpoint.trim().length === 0) {
      throw new TypeError(`Checkpoint version must be a non-empty string, received: ${typeof rawCheckpoint}`);
    }
    this.checkpoint = rawCheckpoint.trim();

    // 4. Resolve Request Timeout
    const rawTimeout = options.timeoutMs !== undefined
      ? options.timeoutMs
      : process.env.SODA_MODEL_TIMEOUT_MS !== undefined
        ? Number(process.env.SODA_MODEL_TIMEOUT_MS)
        : fileConfig.timeoutMs !== undefined
          ? Number(fileConfig.timeoutMs)
          : 5000;

    if (typeof rawTimeout !== 'number' || !Number.isFinite(rawTimeout) || rawTimeout <= 0 || rawTimeout > 60000) {
      throw new RangeError(`Request timeoutMs must be a finite positive number <= 60000, received: ${rawTimeout}`);
    }
    this.timeoutMs = Math.floor(rawTimeout);

    // 5. Resolve Health Check Timeout
    const rawHealthTimeout = options.healthTimeoutMs !== undefined
      ? options.healthTimeoutMs
      : process.env.SODA_MODEL_HEALTH_TIMEOUT_MS !== undefined
        ? Number(process.env.SODA_MODEL_HEALTH_TIMEOUT_MS)
        : fileConfig.healthTimeoutMs !== undefined
          ? Number(fileConfig.healthTimeoutMs)
          : 2000;

    if (typeof rawHealthTimeout !== 'number' || !Number.isFinite(rawHealthTimeout) || rawHealthTimeout <= 0 || rawHealthTimeout > 10000) {
      throw new RangeError(`Health check timeoutMs must be a finite positive number <= 10000, received: ${rawHealthTimeout}`);
    }
    this.healthTimeoutMs = Math.floor(rawHealthTimeout);

    // 6. Resolve Threshold Tau
    const rawTau = options.thresholdTau !== undefined
      ? options.thresholdTau
      : process.env.SODA_MODEL_THRESHOLD_TAU !== undefined
        ? Number(process.env.SODA_MODEL_THRESHOLD_TAU)
        : fileConfig.thresholdTau !== undefined
          ? Number(fileConfig.thresholdTau)
          : 0.80;

    if (typeof rawTau !== 'number' || !Number.isFinite(rawTau) || rawTau < 0.0 || rawTau > 1.0) {
      throw new RangeError(`Threshold tau must be bounded in [0.0, 1.0], received: ${rawTau}`);
    }
    this.thresholdTau = Number(rawTau.toFixed(4));

    // 7. Resolve API Key
    const rawApiKey = options.apiKey !== undefined
      ? options.apiKey
      : process.env.SODA_MODEL_API_KEY !== undefined
        ? process.env.SODA_MODEL_API_KEY
        : fileConfig.apiKey !== undefined
          ? fileConfig.apiKey
          : null;

    this.apiKey = typeof rawApiKey === 'string' && rawApiKey.trim().length > 0 ? rawApiKey.trim() : null;

    // 8. Health Check Probe Path
    const rawHealthPath = options.healthPath || fileConfig.healthPath || '/health';
    this.healthPath = rawHealthPath.startsWith('/') ? rawHealthPath : `/${rawHealthPath}`;

    // Cache original raw configuration
    this.rawConfig = Object.freeze({
      provider: this.provider,
      endpoint: this.endpoint,
      checkpoint: this.checkpoint,
      timeoutMs: this.timeoutMs,
      healthTimeoutMs: this.healthTimeoutMs,
      thresholdTau: this.thresholdTau,
      apiKey: this.apiKey,
      healthPath: this.healthPath
    });
  }

  /**
   * Serializes the configuration to a plain JavaScript object.
   * @param {boolean} [redactSecret=true]
   * @returns {object}
   */
  toJSON(redactSecret = true) {
    return {
      provider: this.provider,
      endpoint: this.endpoint,
      checkpoint: this.checkpoint,
      timeoutMs: this.timeoutMs,
      healthTimeoutMs: this.healthTimeoutMs,
      thresholdTau: this.thresholdTau,
      apiKey: redactSecret && this.apiKey ? '***REDACTED***' : this.apiKey,
      healthPath: this.healthPath
    };
  }

  /**
   * Executes a pre-flight HTTP/HTTPS health probe against the configured endpoint.
   *
   * @param {object} [options]
   * @param {number} [options.timeoutMs] - Custom health check timeout
   * @param {string} [options.healthPath] - Custom health probe subpath
   * @param {boolean} [options.throwOnError=true] - Throw typed error on unreachable / failure
   * @returns {Promise<{healthy: boolean, status: number, latencyMs: number, endpoint: string, error?: string}>}
   * @throws {ModelEndpointUnreachableError}
   */
  async checkHealth(options = {}) {
    const timeoutMs = options.timeoutMs || this.healthTimeoutMs;
    const healthPath = options.healthPath || this.healthPath;
    const throwOnError = options.throwOnError !== false;

    // Formulate target health probe URL
    const targetUrl = new URL(this.endpoint);
    const basePath = targetUrl.pathname.replace(/\/+$/, '');
    const probePath = healthPath.startsWith('/') ? healthPath : `/${healthPath}`;
    targetUrl.pathname = `${basePath}${probePath}`.replace(/\/+/g, '/');

    const client = targetUrl.protocol === 'https:' ? https : http;
    const startTime = performance.now();

    return new Promise((resolve, reject) => {
      let settled = false;

      const finishError = (message, code, status, err = null) => {
        if (settled) return;
        settled = true;
        const latencyMs = Number((performance.now() - startTime).toFixed(3));
        const error = new ModelEndpointUnreachableError(message, {
          code,
          endpoint: targetUrl.toString(),
          status,
          latencyMs,
          cause: err
        });

        if (throwOnError) {
          reject(error);
        } else {
          resolve({
            healthy: false,
            status: status || 0,
            latencyMs,
            endpoint: targetUrl.toString(),
            error: message
          });
        }
      };

      const finishSuccess = (status) => {
        if (settled) return;
        settled = true;
        const latencyMs = Number((performance.now() - startTime).toFixed(3));
        resolve({
          healthy: true,
          status,
          latencyMs,
          endpoint: targetUrl.toString()
        });
      };

      const headers = {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'SodaOS-ModelConfig/1.0.0'
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const req = client.request(targetUrl, {
        method: 'GET',
        headers,
        timeout: timeoutMs
      }, (res) => {
        res.resume(); // Drain data stream to prevent socket leak

        if (res.statusCode >= 200 && res.statusCode < 300) {
          finishSuccess(res.statusCode);
        } else {
          finishError(
            `Model endpoint returned non-healthy HTTP status: ${res.statusCode} (${res.statusMessage || 'Error'})`,
            'HTTP_ERROR',
            res.statusCode
          );
        }
      });

      req.on('timeout', () => {
        req.destroy();
        finishError(`Health probe timed out after ${timeoutMs}ms`, 'TIMEOUT', null);
      });

      req.on('error', (err) => {
        const code = err.code === 'ECONNREFUSED'
          ? 'CONNECTION_REFUSED'
          : err.code === 'ENOTFOUND'
            ? 'ENDPOINT_UNREACHABLE'
            : 'NETWORK_ERROR';

        finishError(`Health probe failed to connect: ${err.message}`, code, null, err);
      });

      req.end();
    });
  }

  /**
   * Factory loading configuration from a JSON file.
   * @param {string} filePath
   * @param {object} [overrides]
   * @returns {ModelConfig}
   */
  static fromFile(filePath, overrides = {}) {
    return new ModelConfig({ ...overrides, filePath });
  }

  /**
   * Validates a candidate raw configuration object without throwing.
   * @param {object} config
   * @returns {{valid: boolean, errors: string[]}}
   */
  static validate(config) {
    const errors = [];
    if (!config || typeof config !== 'object') {
      return { valid: false, errors: ['Configuration must be a non-null object'] };
    }

    if (config.provider !== undefined) {
      if (typeof config.provider !== 'string' || !SUPPORTED_PROVIDERS.includes(config.provider.toLowerCase())) {
        errors.push(`Invalid provider "${config.provider}". Supported: ${SUPPORTED_PROVIDERS.join(', ')}`);
      }
    }

    if (config.endpoint !== undefined) {
      try {
        parseAndValidateUrl(config.endpoint);
      } catch (err) {
        errors.push(`Invalid endpoint: ${err.message}`);
      }
    }

    if (config.checkpoint !== undefined) {
      if (typeof config.checkpoint !== 'string' || config.checkpoint.trim().length === 0) {
        errors.push('Checkpoint must be a non-empty string');
      }
    }

    if (config.timeoutMs !== undefined) {
      const t = Number(config.timeoutMs);
      if (!Number.isFinite(t) || t <= 0 || t > 60000) {
        errors.push(`timeoutMs must be between 1 and 60000, got: ${config.timeoutMs}`);
      }
    }

    if (config.healthTimeoutMs !== undefined) {
      const ht = Number(config.healthTimeoutMs);
      if (!Number.isFinite(ht) || ht <= 0 || ht > 10000) {
        errors.push(`healthTimeoutMs must be between 1 and 10000, got: ${config.healthTimeoutMs}`);
      }
    }

    if (config.thresholdTau !== undefined) {
      const tau = Number(config.thresholdTau);
      if (!Number.isFinite(tau) || tau < 0.0 || tau > 1.0) {
        errors.push(`thresholdTau must be between 0.0 and 1.0, got: ${config.thresholdTau}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
