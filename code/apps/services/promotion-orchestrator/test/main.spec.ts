/**
 * Unit & Integration Tests for F03 Promotion Orchestrator Runtime
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PromotionOrchestratorRuntime } from '../src/main.js';

describe('G-CORE-091: Bootstrap F03 promotion integration runtime', () => {
  it('exposes health probe', async () => {
    const runtime = new PromotionOrchestratorRuntime(0);
    const server = runtime.getServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };

    const res = await fetch(`http://localhost:${address.port}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.service, 'promotion-orchestrator');

    await runtime.stop();
  });

  it('proposes and retrieves promotion record', async () => {
    const runtime = new PromotionOrchestratorRuntime(0);
    const server = runtime.getServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };

    const payload = {
      proposalId: 'prop_999',
      sessionId: 'sess_123',
      voucherCode: 'FLASH50',
      discountType: 'PERCENTAGE',
      discountValueMinor: '5000',
      currency: 'THB',
    };

    const postRes = await fetch(`http://localhost:${address.port}/api/v1/promotions/propose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.equal(postRes.status, 201);
    const postData = await postRes.json();
    assert.equal(postData.proposalId, 'prop_999');
    assert.equal(postData.status, 'PROPOSED');

    const getRes = await fetch(`http://localhost:${address.port}/api/v1/promotions/prop_999`);
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.equal(getData.voucherCode, 'FLASH50');

    await runtime.stop();
  });
});
