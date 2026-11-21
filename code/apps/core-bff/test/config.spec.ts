/**
 * Unit & Integration Tests for Core BFF Configuration & Security
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateCoreBffConfig, ConfigValidationError } from '../src/config.js';

describe('G-CORE-087: Validate Core BFF configuration and secrets', () => {
  it('loads default valid configuration in development mode', () => {
    const config = validateCoreBffConfig({
      NODE_ENV: 'development',
      PORT: '4000',
    });

    assert.equal(config.nodeEnv, 'development');
    assert.equal(config.port, 4000);
    assert.equal(config.serviceName, 'core-bff');
    assert.ok(config.cookieSecret.length >= 32);
  });

  it('throws ConfigValidationError on invalid NODE_ENV or PORT', () => {
    assert.throws(() => validateCoreBffConfig({ NODE_ENV: 'invalid_env' }), ConfigValidationError);
    assert.throws(() => validateCoreBffConfig({ PORT: 'not_a_number' }), ConfigValidationError);
    assert.throws(() => validateCoreBffConfig({ PORT: '70000' }), ConfigValidationError);
  });

  it('strictly prevents production mode with short or default cookie secrets', () => {
    assert.throws(
      () =>
        validateCoreBffConfig({
          NODE_ENV: 'production',
          COOKIE_SECRET: 'too-short',
          NATS_URL: 'nats://nats.internal:4222',
          REDIS_URL: 'redis://redis.internal:6379',
        }),
      (err: Error) => err instanceof ConfigValidationError && err.message.includes('at least 32 characters')
    );
  });

  it('strictly blocks ALLOW_TEST_MODE in production', () => {
    assert.throws(
      () =>
        validateCoreBffConfig({
          NODE_ENV: 'production',
          COOKIE_SECRET: 'super-secure-production-secret-token-32-chars-long!',
          ALLOW_TEST_MODE: 'true',
          NATS_URL: 'nats://nats.internal:4222',
          REDIS_URL: 'redis://redis.internal:6379',
        }),
      (err: Error) => err instanceof ConfigValidationError && err.message.includes('ALLOW_TEST_MODE is strictly forbidden')
    );
  });

  it('accepts valid production configuration meeting all security invariants', () => {
    const config = validateCoreBffConfig({
      NODE_ENV: 'production',
      PORT: '8080',
      COOKIE_SECRET: 'super-secure-production-secret-token-32-chars-long!',
      NATS_URL: 'nats://nats.internal:4222',
      REDIS_URL: 'redis://redis.internal:6379',
    });

    assert.equal(config.nodeEnv, 'production');
    assert.equal(config.port, 8080);
    assert.equal(config.allowTestMode, false);
    assert.equal(config.natsUrl, 'nats://nats.internal:4222');
  });
});
