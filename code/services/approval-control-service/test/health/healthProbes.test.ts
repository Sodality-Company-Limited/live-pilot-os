import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import {
  createServer,
  evaluateReadiness,
  parseTcpTarget,
  checkTcpConnectivity,
} from '../../src/server.ts';

function request(options: http.RequestOptions, body: any = null): Promise<{
  statusCode?: number;
  headers: http.IncomingHttpHeaders;
  body: any;
}> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed,
        });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

describe('G-APPR-007: Approval Control Service Health & Readiness Probes Suite', () => {
  let appServer: http.Server;
  let testPort: number;

  before(async () => {
    const { server } = createServer({ isSimulated: true });
    appServer = server;
    await new Promise<void>((resolve) => {
      appServer.listen(0, '127.0.0.1', () => {
        testPort = (appServer.address() as net.AddressInfo).port;
        resolve();
      });
    });
  });

  after(async () => {
    if (appServer) {
      await new Promise<void>((resolve) => appServer.close(() => resolve()));
    }
  });

  describe('Liveness Probe (/healthz & /health & /livez)', () => {
    it('should return 200 OK on GET /healthz with correct service payload', async () => {
      const res = await request({
        hostname: '127.0.0.1',
        port: testPort,
        path: '/healthz',
        method: 'GET',
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.status, 'ok');
      assert.equal(res.body.service, 'approval-control-service');
      assert.equal(typeof res.body.uptime_seconds, 'number');
    });

    it('should support /health alias returning 200 OK', async () => {
      const res = await request({
        hostname: '127.0.0.1',
        port: testPort,
        path: '/health',
        method: 'GET',
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.status, 'ok');
    });

    it('should support /livez alias returning 200 OK', async () => {
      const res = await request({
        hostname: '127.0.0.1',
        port: testPort,
        path: '/livez',
        method: 'GET',
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.status, 'ok');
    });
  });

  describe('Readiness Probe (/readyz & /ready)', () => {
    it('should return 200 OK when simulated mode dependencies are satisfied', async () => {
      const res = await request({
        hostname: '127.0.0.1',
        port: testPort,
        path: '/readyz',
        method: 'GET',
      });

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.status, 'ready');
      assert.equal(res.body.service, 'approval-control-service');
      assert.equal(res.body.mode, 'SIMULATED');
      assert.equal(res.body.migration_present, true);
    });

    it('should evaluate TCP connectivity correctly against real mock TCP server', async () => {
      const tcpServer = net.createServer((socket) => socket.end());
      let tcpPort: number;
      await new Promise<void>((resolve) => {
        tcpServer.listen(0, '127.0.0.1', () => {
          tcpPort = (tcpServer.address() as net.AddressInfo).port;
          resolve();
        });
      });

      try {
        const check = await checkTcpConnectivity({ host: '127.0.0.1', port: tcpPort }, 1000);
        assert.equal(check.ok, true);

        const result = await evaluateReadiness({
          checkDependencies: true,
          isSimulated: false,
          databaseUrl: `postgres://user:pass@127.0.0.1:${tcpPort}/db`,
          natsUrl: `nats://127.0.0.1:${tcpPort}`,
        });

        assert.equal(result.ready, true);
        assert.equal(result.payload.status, 'ready');
        assert.equal(result.payload.dependencies.database.ok, true);
        assert.equal(result.payload.dependencies.nats.ok, true);
      } finally {
        await new Promise<void>((resolve) => tcpServer.close(() => resolve()));
      }
    });

    it('should return 503 degraded when a required dependency TCP connection fails', async () => {
      const deadPort = 65432;

      const result = await evaluateReadiness({
        checkDependencies: true,
        isSimulated: false,
        databaseUrl: `postgres://user:pass@127.0.0.1:${deadPort}/db`,
        natsUrl: `nats://127.0.0.1:${deadPort}`,
      });

      assert.equal(result.ready, false);
      assert.equal(result.payload.status, 'degraded');
      assert.equal(result.payload.dependencies.database.ok, false);
    });

    it('should return 404 for unknown routes', async () => {
      const res = await request({
        hostname: '127.0.0.1',
        port: testPort,
        path: '/unknown-route',
        method: 'GET',
      });

      assert.equal(res.statusCode, 404);
      assert.equal(res.body.code, 'LP05001');
    });
  });

  describe('TCP Target Parsing Utilities', () => {
    it('should parse valid URLs and fallback appropriately', () => {
      const parsed = parseTcpTarget('postgres://user:pass@db.example.internal:5433/mydb', 5432);
      assert.equal(parsed?.host, 'db.example.internal');
      assert.equal(parsed?.port, 5433);

      const parsedDefault = parseTcpTarget('nats://nats.internal', 4222);
      assert.equal(parsedDefault?.host, 'nats.internal');
      assert.equal(parsedDefault?.port, 4222);

      const invalid = parseTcpTarget('not-a-valid-url', 80);
      assert.equal(invalid, null);

      const empty = parseTcpTarget('', 80);
      assert.equal(empty, null);
    });
  });
});
