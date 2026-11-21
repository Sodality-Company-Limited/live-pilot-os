/**
 * Unit & Integration Tests for Core BFF HTTP Transport & Route Registry
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { RouteRegistry, createDefaultRouter } from '../src/routes.js';
import { parseJsonBody, sendJson, sendProblem } from '../src/http.js';

describe('G-CORE-083: Core BFF HTTP Transport & Route Registry', () => {
  it('correctly registers routes and dispatches matching requests', async () => {
    const router = new RouteRegistry();
    let handled = false;

    router.get('/api/test/:id', (req, res, params) => {
      handled = true;
      assert.equal(params.id, '42');
      sendJson(res, 200, { ok: true, id: params.id });
    });

    const server = http.createServer((req, res) => router.dispatch(req, res));
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };

    const res = await fetch(`http://localhost:${address.port}/api/test/42`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.deepEqual(data, { ok: true, id: '42' });
    assert.equal(handled, true);

    server.close();
  });

  it('returns RFC 7807 problem details with LP03001 on unknown route', async () => {
    const router = createDefaultRouter();
    const server = http.createServer((req, res) => router.dispatch(req, res));
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };

    const res = await fetch(`http://localhost:${address.port}/api/v1/unknown`);
    assert.equal(res.status, 404);
    assert.equal(res.headers.get('content-type'), 'application/problem+json');
    const problem = await res.json();
    assert.equal(problem.code, 'LP03001');
    assert.equal(problem.status, 404);

    server.close();
  });

  it('validates request payload and returns 400 problem details on invalid input', async () => {
    const router = createDefaultRouter();
    const server = http.createServer((req, res) => router.dispatch(req, res));
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };

    const res = await fetch(`http://localhost:${address.port}/api/v1/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId: 'host_123' }), // missing channel
    });

    assert.equal(res.status, 400);
    assert.equal(res.headers.get('content-type'), 'application/problem+json');
    const problem = await res.json();
    assert.equal(problem.code, 'LP03002');
    assert.ok(problem.errors.channel);

    server.close();
  });

  it('successfully creates session and resolves route with URL params', async () => {
    const router = createDefaultRouter();
    const server = http.createServer((req, res) => router.dispatch(req, res));
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as { port: number };

    const postRes = await fetch(`http://localhost:${address.port}/api/v1/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId: 'host_123', channel: 'tiktok' }),
    });

    assert.equal(postRes.status, 201);
    const postData = await postRes.json();
    assert.equal(postData.hostId, 'host_123');
    assert.equal(postData.channel, 'tiktok');

    const getRes = await fetch(`http://localhost:${address.port}/api/v1/sessions/sess_999`);
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.equal(getData.sessionId, 'sess_999');
    assert.equal(getData.status, 'ACTIVE');

    server.close();
  });
});
