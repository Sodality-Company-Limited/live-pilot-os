/**
 * ════════════════════════════════════════════════════════════════════════════════
 * 🛡️ LivePilot Margin Policy Service - Production HTTP Runtime & Health Probes
 * ════════════════════════════════════════════════════════════════════════════════
 * Conforms to:
 * - G-MARG-007 (DigitalOcean Deployment & Readiness Verification)
 * - /healthz: Liveness probe (200 OK)
 * - /readyz: Readiness probe (verifies database and NATS connectivity)
 * - Zero-dependency Node.js HTTP server
 * ════════════════════════════════════════════════════════════════════════════════
 */

import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MarginPolicyService } from './margin-policy-service.mjs';

const PORT = parseInt(process.env.PORT || '8084', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'production';
const APP_ENV = process.env.APP_ENV || 'prod';
const SIMULATED_MODE = process.env.MARGIN_EXECUTION_MODE === 'SIMULATED' || process.env.SIMULATED === 'true';

export function parseTcpTarget(rawUrl, defaultPort) {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    return {
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : defaultPort,
    };
  } catch {
    return null;
  }
}

export function checkTcpConnectivity(target, timeoutMs = 1500) {
  if (!target || !target.host || !Number.isFinite(target.port)) {
    return Promise.resolve({ ok: false, reason: 'missing_or_invalid_target' });
  }
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: target.host, port: target.port });
    let settled = false;
    const finish = (result) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(result);
      }
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish({ ok: true }));
    socket.once('timeout', () => finish({ ok: false, reason: 'connect_timeout' }));
    socket.once('error', (err) => finish({ ok: false, reason: err.code || 'connect_error' }));
  });
}

export async function evaluateReadiness(options = {}) {
  const checkDependencies = options.checkDependencies !== false;
  const dbUrl = options.databaseUrl !== undefined ? options.databaseUrl : process.env.DATABASE_URL;
  const natsUrl = options.natsUrl !== undefined ? options.natsUrl : process.env.NATS_URL;
  const isSimulated = options.isSimulated !== undefined ? options.isSimulated : SIMULATED_MODE;

  // In simulated/in-memory mode without external dependencies declared, mark ready
  if (isSimulated && !dbUrl && !natsUrl) {
    return {
      ready: true,
      payload: {
        status: 'ready',
        service: 'margin-policy-service',
        mode: 'SIMULATED',
        simulated_boundary_visible: true,
        dependencies: {
          database: { ok: true, mode: 'in_memory_simulation' },
          nats: { ok: true, mode: 'in_memory_simulation' },
        },
      },
    };
  }

  const pgTarget = parseTcpTarget(dbUrl, 5432);
  const natsTarget = parseTcpTarget(natsUrl, 4222);

  let pgCheck = { ok: true, mode: 'skipped_or_simulated' };
  let natsCheck = { ok: true, mode: 'skipped_or_simulated' };

  if (checkDependencies) {
    if (dbUrl) {
      pgCheck = await checkTcpConnectivity(pgTarget);
    } else if (!isSimulated) {
      pgCheck = { ok: false, reason: 'missing_database_url' };
    }

    if (natsUrl) {
      natsCheck = await checkTcpConnectivity(natsTarget);
    } else if (!isSimulated) {
      natsCheck = { ok: false, reason: 'missing_nats_url' };
    }
  }

  const ready = pgCheck.ok && natsCheck.ok;
  return {
    ready,
    payload: {
      status: ready ? 'ready' : 'degraded',
      service: 'margin-policy-service',
      environment: APP_ENV,
      node_env: NODE_ENV,
      mode: isSimulated ? 'SIMULATED' : 'PRODUCTION',
      dependencies: {
        database: pgCheck,
        nats: natsCheck,
      },
    },
  };
}

export function createServer(options = {}) {
  const service = options.service || new MarginPolicyService();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    const pathname = url.pathname;

    // Liveness probe (/healthz or /health)
    if (req.method === 'GET' && (pathname === '/healthz' || pathname === '/health')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'margin-policy-service' }));
      return;
    }

    // Readiness probe (/readyz or /ready)
    if (req.method === 'GET' && (pathname === '/readyz' || pathname === '/ready')) {
      try {
        const { ready, payload } = await evaluateReadiness(options);
        const statusCode = ready ? 200 : 503;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
      } catch (err) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'degraded',
          service: 'margin-policy-service',
          error: err.message,
        }));
      }
      return;
    }

    // Default 404 for unknown endpoints
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
  });

  return { server, service };
}

// Auto-start if executed directly as entrypoint
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1]);
if (isMain) {
  const { server } = createServer();
  server.listen(PORT, HOST, () => {
    console.log(JSON.stringify({
      level: 'info',
      event: 'server_started',
      service: 'margin-policy-service',
      port: PORT,
      host: HOST,
      node_env: NODE_ENV,
      app_env: APP_ENV,
    }));
  });

  const shutdown = (signal) => {
    console.log(JSON.stringify({ level: 'info', event: 'shutdown_initiated', signal }));
    server.close(() => {
      console.log(JSON.stringify({ level: 'info', event: 'shutdown_complete' }));
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
