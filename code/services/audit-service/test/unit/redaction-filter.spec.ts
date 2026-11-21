import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AuditRedactionFilter,
  redactSensitiveData,
  isSensitiveKey,
  containsSensitivePattern,
} from '../../src/domain/redaction-filter.ts';

describe('G-AUDI-004: Audit Redaction Filter Unit Tests', () => {
  it('redacts sensitive keys in flat objects', () => {
    const input = {
      username: 'admin',
      password: 'super-secret-password-123',
      api_key: 'lp_live_abcdef123456',
      token: 'jwt.token.value',
      secret: 'shhh-secret',
      authorization: 'Bearer token123',
      cogs: 4500,
      cost: 5000,
      margin_rate: 0.15,
      credit_card: '4111222233334444',
      public_field: 'safe_value',
    };

    const redacted = redactSensitiveData(input);

    assert.equal(redacted.username, 'admin');
    assert.equal(redacted.password, '[REDACTED]');
    assert.equal(redacted.api_key, '[REDACTED]');
    assert.equal(redacted.token, '[REDACTED]');
    assert.equal(redacted.secret, '[REDACTED]');
    assert.equal(redacted.authorization, '[REDACTED]');
    assert.equal(redacted.cogs, '[REDACTED]');
    assert.equal(redacted.cost, '[REDACTED]');
    assert.equal(redacted.margin_rate, '[REDACTED]');
    assert.equal(redacted.credit_card, '[REDACTED]');
    assert.equal(redacted.public_field, 'safe_value');
  });

  it('redacts recursively in deeply nested objects and arrays', () => {
    const input = {
      metadata: {
        vendor: 'Shopify',
        credentials: {
          client_secret: 'sec-999',
          access_token: 'tok-abc',
        },
      },
      line_items: [
        {
          sku: 'SKU-001',
          name: 'T-Shirt',
          unit_cost: 120,
          retail_price: 250,
        },
        {
          sku: 'SKU-002',
          cogs_amount: 80,
          margin: 0.35,
        },
      ],
      tags: ['apparel', 'live-stream'],
    };

    const result = redactSensitiveData(input);

    assert.equal(result.metadata.vendor, 'Shopify');
    assert.equal(result.metadata.credentials.client_secret, '[REDACTED]');
    assert.equal(result.metadata.credentials.access_token, '[REDACTED]');
    assert.equal(result.line_items[0].sku, 'SKU-001');
    assert.equal(result.line_items[0].unit_cost, '[REDACTED]');
    assert.equal(result.line_items[0].retail_price, 250);
    assert.equal(result.line_items[1].cogs_amount, '[REDACTED]');
    assert.equal(result.line_items[1].margin, '[REDACTED]');
    assert.deepEqual(result.tags, ['apparel', 'live-stream']);
  });

  it('redacts Bearer tokens and credit card numbers inside arbitrary string values', () => {
    const input = {
      note: 'User authenticated with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ae7nit93',
      payment_log: 'Charged customer card 4111-2222-3333-4444 successfully',
      safe_note: 'Standard live stream transaction completed normally',
    };

    const res = redactSensitiveData(input);

    assert.equal(res.note, 'User authenticated with [REDACTED]');
    assert.equal(res.payment_log, 'Charged customer card [REDACTED] successfully');
    assert.equal(res.safe_note, 'Standard live stream transaction completed normally');
  });

  it('handles cyclic object references gracefully without infinite recursion', () => {
    const cyclicObj: Record<string, unknown> = {
      name: 'Cyclic Node',
      secret_key: 'supersecret',
    };
    cyclicObj.self = cyclicObj;

    const res = redactSensitiveData(cyclicObj);
    assert.equal(res.name, 'Cyclic Node');
    assert.equal(res.secret_key, '[REDACTED]');
    assert.equal(res.self, '[CIRCULAR]');
  });

  it('does not mutate the original object (pure functional invariant)', () => {
    const original = {
      credentials: {
        password: 'do-not-mutate-me',
      },
      title: 'Original Title',
    };

    const copy = JSON.parse(JSON.stringify(original));
    const res = redactSensitiveData(original);

    assert.deepEqual(original, copy);
    assert.equal(res.credentials.password, '[REDACTED]');
  });

  it('handles primitive values, null, undefined, dates, and empty collections cleanly', () => {
    assert.equal(redactSensitiveData('plain string'), 'plain string');
    assert.equal(redactSensitiveData(12345), 12345);
    assert.equal(redactSensitiveData(null), null);
    assert.equal(redactSensitiveData(undefined), undefined);
    assert.equal(redactSensitiveData(true), true);
    assert.deepEqual(redactSensitiveData([]), []);
    assert.deepEqual(redactSensitiveData({}), {});

    const d = new Date();
    assert.equal(redactSensitiveData(d), d.toISOString());
  });

  it('helper tests: isSensitiveKey and containsSensitivePattern', () => {
    assert.equal(isSensitiveKey('password'), true);
    assert.equal(isSensitiveKey('user_password'), true);
    assert.equal(isSensitiveKey('api_key'), true);
    assert.equal(isSensitiveKey('APIKEY'), true);
    assert.equal(isSensitiveKey('accessToken'), true);
    assert.equal(isSensitiveKey('cogs'), true);
    assert.equal(isSensitiveKey('margin_rate'), true);
    assert.equal(isSensitiveKey('item_name'), false);

    assert.equal(containsSensitivePattern('Bearer 12345678'), true);
    assert.equal(containsSensitivePattern('4111222233334444'), true);
    assert.equal(containsSensitivePattern('plain harmless text'), false);
  });

  it('provides the frozen AuditRedactionFilter singleton', () => {
    assert.ok(AuditRedactionFilter);
    assert.equal(typeof AuditRedactionFilter.redact, 'function');
    assert.equal(typeof AuditRedactionFilter.isSensitiveKey, 'function');
  });
});
