/**
 * End-to-End Smoke Verification for Core BFF F01-F05 Flows
 * Validates auth login (F05), session creation, host copilot suggestions (F02),
 * promotion proposal (F03), and projection querying (F01).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCoreBffServer } from '../../code/apps/core-bff/src/main.js';
import { IdentitySessionRuntime } from '../../code/apps/services/identity-session-service/src/main.js';
import { CopilotServiceRuntime } from '../../code/apps/services/copilot-service/src/main.js';
import { PromotionOrchestratorRuntime } from '../../code/apps/services/promotion-orchestrator/src/main.js';
import { F01ProjectionRuntime } from '../../code/apps/services/f01-projection-service/src/main.js';

describe('G-CORE-099: End-to-End Core BFF F01-F05 Smoke Suite', () => {
  it('executes the full F01-F05 lifecycle across BFF and service runtimes', async () => {
    // 1. Boot BFF and services
    const bffServer = createCoreBffServer();
    await new Promise<void>((r) => bffServer.listen(0, r));
    const bffPort = (bffServer.address() as { port: number }).port;

    const idenRuntime = new IdentitySessionRuntime(0);
    const idenServer = idenRuntime.getServer();
    await new Promise<void>((r) => idenServer.listen(0, r));
    const idenPort = (idenServer.address() as { port: number }).port;

    const copilotRuntime = new CopilotServiceRuntime({ port: 0 });
    const copilotServer = copilotRuntime.getServer();
    await new Promise<void>((r) => copilotServer.listen(0, r));
    const copilotPort = (copilotServer.address() as { port: number }).port;

    const promoRuntime = new PromotionOrchestratorRuntime(0);
    const promoServer = promoRuntime.getServer();
    await new Promise<void>((r) => promoServer.listen(0, r));
    const promoPort = (promoServer.address() as { port: number }).port;

    const projRuntime = new F01ProjectionRuntime(0);
    const projServer = projRuntime.getServer();
    await new Promise<void>((r) => projServer.listen(0, r));
    const projPort = (projServer.address() as { port: number }).port;

    try {
      // Step 1 (F05): Authenticate Host
      const loginRes = await fetch(`http://localhost:${idenPort}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'host@livepilot.test',
          role: 'HOST',
          tenantId: 'tenant_live',
        }),
      });
      assert.equal(loginRes.status, 200);
      const auth = await loginRes.json();
      assert.ok(auth.token);

      // Step 2: Initialize Live Session via Core BFF
      const sessionRes = await fetch(`http://localhost:${bffPort}/api/v1/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: 'host_42',
          channel: 'tiktok',
        }),
      });
      assert.equal(sessionRes.status, 201);
      const session = await sessionRes.json();
      assert.equal(session.channel, 'tiktok');

      // Step 3 (F02): Generate Copilot Guidance
      const copilotRes = await fetch(`http://localhost:${copilotPort}/api/v1/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signal: {
            sessionId: session.sessionId,
            tenantId: 'tenant_live',
            intent: 'product_spotlight',
            confidenceBps: 8800,
            extractedKeywords: ['pro', 'mic'],
          },
          facts: [
            {
              productId: 'prod_mic_1',
              title: 'Pro Wireless Mic',
              stockAvailable: 15,
              priceMinor: '199000',
              currency: 'THB',
              scale: 2,
            },
          ],
        }),
      });
      assert.equal(copilotRes.status, 200);
      const suggestions = await copilotRes.json();
      assert.ok(suggestions.suggestions.length > 0);

      // Step 4 (F03): Propose Promotion
      const promoRes = await fetch(`http://localhost:${promoPort}/api/v1/promotions/propose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposalId: `prop_${Date.now()}`,
          sessionId: session.sessionId,
          voucherCode: 'PROMO15',
          discountType: 'PERCENTAGE',
          discountValueMinor: '1500',
          currency: 'THB',
        }),
      });
      assert.equal(promoRes.status, 201);
      const promo = await promoRes.json();
      assert.equal(promo.status, 'PROPOSED');

      // Step 5 (F01): Project Live Telemetry
      const projRes = await fetch(`http://localhost:${projPort}/api/v1/projections/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: 'evt_101',
          sequence: 1,
          sessionId: session.sessionId,
          eventType: 'VIEWER_JOIN',
          payload: {},
          timestamp: new Date().toISOString(),
        }),
      });
      assert.equal(projRes.status, 200);

      const queryRes = await fetch(`http://localhost:${projPort}/api/v1/projections/session/${session.sessionId}`);
      assert.equal(queryRes.status, 200);
      const projection = await queryRes.json();
      assert.equal(projection.activeViewers, 1);
    } finally {
      bffServer.close();
      await idenRuntime.stop();
      await copilotRuntime.stop();
      await promoRuntime.stop();
      await projRuntime.stop();
    }
  });
});
