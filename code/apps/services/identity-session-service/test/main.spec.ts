/**
 * Unit & Integration Tests for F05 Identity Session Runtime
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IdentitySessionRuntime } from '../src/main.js';

describe('G-CORE-093: Bootstrap F05 identity session runtime', () => {
  it('exposes health endpoint', async () => {
    const runtime = new IdentitySessionRuntime(0);
    const server = runtime.getServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };

    const res = await fetch(`http://localhost:${address.port}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.service, 'identity-session-service');

    await runtime.stop();
  });

  it('performs login and resolves authenticated session', async () => {
    const runtime = new IdentitySessionRuntime(0);
    const server = runtime.getServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };

    // Login
    const loginRes = await fetch(`http://localhost:${address.port}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'host@livepilot.io',
        role: 'HOST',
        tenantId: 'tenant_1',
        isTestRequest: false,
      }),
    });

    assert.equal(loginRes.status, 200);
    const sessionData = await loginRes.json();
    assert.ok(sessionData.token);

    // Resolve Session
    const resolveRes = await fetch(`http://localhost:${address.port}/api/v1/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: sessionData.token }),
    });

    assert.equal(resolveRes.status, 200);
    const resolvedData = await resolveRes.json();
    assert.equal(resolvedData.role, 'HOST');
    assert.equal(resolvedData.tenantId, 'tenant_1');

    await runtime.stop();
  });
});
