/**
 * Unit & Integration Tests for F02 Copilot Service Runtime
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CopilotServiceRuntime } from '../src/main.js';

describe('G-CORE-090: Bootstrap F02 Copilot service runtime', () => {
  it('starts HTTP runtime and exposes health endpoint', async () => {
    const runtime = new CopilotServiceRuntime({ port: 0 });
    const server = runtime.getServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };

    const res = await fetch(`http://localhost:${address.port}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'healthy');
    assert.equal(data.service, 'copilot-service');

    await runtime.stop();
  });

  it('generates safe, grounded suggestions via API', async () => {
    const runtime = new CopilotServiceRuntime({ port: 0 });
    const server = runtime.getServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };

    const payload = {
      signal: {
        sessionId: 'sess_1',
        tenantId: 'tenant_live',
        intent: 'product_discount',
        confidenceBps: 9000,
        extractedKeywords: ['wireless', 'mic'],
      },
      facts: [
        {
          productId: 'prod_99',
          title: 'Wireless Mic Pro',
          stockAvailable: 25,
          priceMinor: '250000',
          currency: 'THB',
          scale: 2,
        },
      ],
      safety: {
        emergencyPause: false,
      },
    };

    const res = await fetch(`http://localhost:${address.port}/api/v1/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.suggestions));
    assert.ok(data.suggestions.length > 0);
    assert.equal(data.suggestions[0].groundedFactId, 'prod_99');

    await runtime.stop();
  });
});
