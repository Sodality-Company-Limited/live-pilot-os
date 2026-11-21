/**
 * Core BFF Configuration and Security Validator
 * Validates environment variables, enforces fail-closed secret policies,
 * and strictly prevents production mode from using test/mock credentials or insecure adapters.
 */

export interface CoreBffConfig {
  nodeEnv: 'development' | 'test' | 'staging' | 'production';
  port: number;
  host: string;
  natsUrl: string;
  redisUrl: string;
  cookieSecret: string;
  allowTestMode: boolean;
  serviceName: string;
}

export class ConfigValidationError extends Error {
  public readonly code: string;
  constructor(message: string, code = 'LP03011') {
    super(message);
    this.name = 'ConfigValidationError';
    this.code = code;
  }
}

export function validateCoreBffConfig(env: Record<string, string | undefined> = process.env): CoreBffConfig {
  const nodeEnvRaw = (env.NODE_ENV || 'development').toLowerCase();
  if (!['development', 'test', 'staging', 'production'].includes(nodeEnvRaw)) {
    throw new ConfigValidationError(`Invalid NODE_ENV: "${nodeEnvRaw}". Must be development, test, staging, or production.`);
  }
  const nodeEnv = nodeEnvRaw as CoreBffConfig['nodeEnv'];

  const port = parseInt(env.PORT || '4000', 10);
  if (isNaN(port) || port <= 0 || port > 65535) {
    throw new ConfigValidationError(`Invalid PORT: "${env.PORT}". Must be a valid TCP port (1-65535).`);
  }

  const host = env.HOST || '0.0.0.0';
  const natsUrl = env.NATS_URL || 'nats://127.0.0.1:4222';
  const redisUrl = env.REDIS_URL || 'redis://127.0.0.1:6379';

  const cookieSecret = env.COOKIE_SECRET || '';
  const allowTestMode = env.ALLOW_TEST_MODE === 'true';

  // Security Invariants for Staging and Production:
  if (nodeEnv === 'production' || nodeEnv === 'staging') {
    if (!cookieSecret || cookieSecret.length < 32) {
      throw new ConfigValidationError('COOKIE_SECRET must be at least 32 characters in staging/production.');
    }

    if (cookieSecret === 'secret' || cookieSecret.includes('dev') || cookieSecret.includes('test')) {
      throw new ConfigValidationError('Insecure COOKIE_SECRET detected for production/staging.');
    }

    if (allowTestMode) {
      throw new ConfigValidationError('ALLOW_TEST_MODE is strictly forbidden in staging/production.');
    }

    if (!env.NATS_URL) {
      throw new ConfigValidationError('NATS_URL must be explicitly configured in staging/production.');
    }

    if (!env.REDIS_URL) {
      throw new ConfigValidationError('REDIS_URL must be explicitly configured in staging/production.');
    }
  }

  return {
    nodeEnv,
    port,
    host,
    natsUrl,
    redisUrl,
    cookieSecret: cookieSecret || 'dev-insecure-cookie-secret-for-local-testing-only-32chars',
    allowTestMode: nodeEnv === 'production' ? false : allowTestMode,
    serviceName: 'core-bff',
  };
}
