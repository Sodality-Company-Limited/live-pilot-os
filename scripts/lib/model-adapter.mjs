/**
 * scripts/lib/model-adapter.mjs
 *
 * Trained-Model Runtime Adapter Contract for Soda OS
 * Goal: G-ML-013 (Trained-Model Runtime Adapter Contract)
 *
 * Provides the decoupled hexagonal driving port implementation (ModelAdapter)
 * and fail-closed typed error taxonomy (ModelInferenceError) bridging
 * Soda OS agent execution loops to local or remote model serving gateways.
 */

import http from 'node:http';
import { performance } from 'node:perf_hooks';

/**
 * Typed error class representing all failure modes during model gateway interaction.
 */
export class ModelInferenceError extends Error {
  /**
   * @param {string} message
   * @param {object} [options]
   * @param {string} [options.code] - GATEWAY_TIMEOUT | NETWORK_PARTITION | HTTP_ERROR | MALFORMED_RESPONSE | INVALID_CONFIDENCE | INVALID_PROMPT
   * @param {number|null} [options.status] - HTTP status code if applicable
   * @param {string|null} [options.endpoint] - Target gateway endpoint URL
   * @param {any} [options.details] - Diagnostic payload or original error details
   * @param {Error|null} [options.cause] - Original thrown error
   */
  constructor(message, { code = 'UNKNOWN_ERROR', status = null, endpoint = null, details = null, cause = null } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ModelInferenceError';
    this.code = code;
    this.status = status;
    this.endpoint = endpoint;
    this.details = details;
  }
}

/**
 * Production runtime adapter executing inference against the dual-head model.
 */
export class ModelAdapter {
  /**
   * @param {object} [config]
   * @param {string} [config.endpointUrl] - Target HTTP URL of the model serving gateway
   * @param {number} [config.timeoutMs] - Request timeout SLA in milliseconds (default: 5000)
   * @param {string} [config.agentId] - Identifier of calling agent
   * @param {string|null} [config.apiKey] - Optional bearer authorization token
   */
  constructor(config = {}) {
    this.endpointUrl = config.endpointUrl || process.env.SODA_MODEL_ENDPOINT || 'http://127.0.0.1:8000/v1/decision';
    this.timeoutMs = typeof config.timeoutMs === 'number' && config.timeoutMs > 0 ? config.timeoutMs : 5000;
    this.agentId = config.agentId || 'soda-agent';
    this.apiKey = config.apiKey || process.env.SODA_MODEL_API_KEY || null;
  }

  /**
   * Dispatch prompt to model gateway and receive validated, calibrated decision output.
   *
   * @param {string} prompt - Prompt text string
   * @param {object} [options] - Call-time overrides and parameters
   * @param {number} [options.timeoutMs] - Custom per-request timeout in milliseconds
   * @param {string} [options.endpointUrl] - Custom endpoint URL override
   * @param {number} [options.temperature] - Generation temperature
   * @param {number} [options.maxTokens] - Max completion tokens
   * @returns {Promise<{text: string, confidence: number, decisionToken: string, tokenCount: number, latencyMs: number, timestamp: string, raw: object}>}
   * @throws {ModelInferenceError}
   */
  async generateDecision(prompt, options = {}) {
    const startTime = performance.now();

    if (typeof prompt !== 'string' || prompt.length === 0) {
      throw new ModelInferenceError('Prompt must be a non-empty string', {
        code: 'INVALID_PROMPT',
        endpoint: options.endpointUrl || this.endpointUrl,
        details: { prompt }
      });
    }

    const endpoint = options.endpointUrl || this.endpointUrl;
    const timeoutMs = typeof options.timeoutMs === 'number' && options.timeoutMs > 0 ? options.timeoutMs : this.timeoutMs;

    const requestBody = {
      prompt,
      agent_id: this.agentId,
      temperature: options.temperature ?? 0.0,
      max_tokens: options.maxTokens ?? 512,
      ...options.extraParams
    };

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': `Soda-Model-Adapter/1.0.0 (${this.agentId})`
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    let response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(timeoutMs)
      });
    } catch (err) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError' || err.code === 20) {
        throw new ModelInferenceError(`Gateway request timed out after ${timeoutMs}ms SLA limit`, {
          code: 'GATEWAY_TIMEOUT',
          endpoint,
          details: { timeoutMs, error: err.message },
          cause: err
        });
      }

      throw new ModelInferenceError(`Network partition or connection failure: ${err.message}`, {
        code: 'NETWORK_PARTITION',
        endpoint,
        details: { error: err.message, code: err.cause?.code || err.code },
        cause: err
      });
    }

    if (!response.ok) {
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch {
        // ignore read failure
      }
      throw new ModelInferenceError(`Model gateway returned HTTP ${response.status}: ${errorBody || response.statusText}`, {
        code: 'HTTP_ERROR',
        status: response.status,
        endpoint,
        details: errorBody
      });
    }

    let rawText = '';
    try {
      rawText = await response.text();
    } catch (err) {
      throw new ModelInferenceError(`Failed to read response body: ${err.message}`, {
        code: 'NETWORK_PARTITION',
        status: response.status,
        endpoint,
        cause: err
      });
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      throw new ModelInferenceError(`Malformed response body: Expected valid JSON but received non-JSON payload`, {
        code: 'MALFORMED_RESPONSE',
        status: response.status,
        endpoint,
        details: rawText.length > 500 ? rawText.substring(0, 500) + '...' : rawText,
        cause: parseErr
      });
    }

    if (!data || typeof data !== 'object') {
      throw new ModelInferenceError('Malformed response: Parsed JSON is not an object', {
        code: 'MALFORMED_RESPONSE',
        status: response.status,
        endpoint,
        details: data
      });
    }

    // Extract completion text (supports standard text and common alias keys)
    const text = data.text ?? data.completion ?? data.response;
    if (typeof text !== 'string') {
      throw new ModelInferenceError('Malformed response: Missing or non-string text completion field', {
        code: 'MALFORMED_RESPONSE',
        status: response.status,
        endpoint,
        details: { keys: Object.keys(data), data }
      });
    }

    // Validate confidence score
    const rawConfidence = data.confidence;
    if (
      rawConfidence === undefined ||
      rawConfidence === null ||
      typeof rawConfidence !== 'number' ||
      !Number.isFinite(rawConfidence) ||
      rawConfidence < 0.0 ||
      rawConfidence > 1.0
    ) {
      throw new ModelInferenceError(
        `Invalid confidence score '${rawConfidence}'. Confidence must be a finite number strictly bounded in [0.0, 1.0]`,
        {
          code: 'INVALID_CONFIDENCE',
          status: response.status,
          endpoint,
          details: { confidence: rawConfidence }
        }
      );
    }

    const confidence = Number(rawConfidence);
    const decisionToken = String(data.decisionToken ?? data.decision_token ?? data.action ?? 'proceed');
    const tokenCount = Number(data.tokenCount ?? data.token_count ?? data.tokens ?? 0);
    const latencyMs = Number((performance.now() - startTime).toFixed(1));

    return {
      text,
      confidence,
      decisionToken,
      tokenCount,
      latencyMs,
      timestamp: new Date().toISOString(),
      raw: data
    };
  }
}

/**
 * Creates a real, lightweight HTTP server for testing and local integration.
 *
 * @param {(req: http.IncomingMessage, res: http.ServerResponse) => void} requestHandler
 * @param {number} [port=0]
 * @returns {Promise<{server: http.Server, port: number, url: string, close: () => Promise<void>}>}
 */
export function createLocalInferenceServer(requestHandler, port = 0) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(requestHandler);
    server.listen(port, '127.0.0.1', () => {
      const addr = server.address();
      const boundPort = typeof addr === 'object' && addr !== null ? addr.port : port;
      const url = `http://127.0.0.1:${boundPort}/v1/decision`;
      resolve({
        server,
        port: boundPort,
        url,
        close: () => new Promise((resClose) => server.close(resClose))
      });
    });
    server.on('error', reject);
  });
}
