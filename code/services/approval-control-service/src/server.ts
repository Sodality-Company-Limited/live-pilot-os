import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabasePoolManager } from './persistence/database.ts';
import { ApprovalControlService } from './index.ts';

export const DEFAULT_PORT = 8086;
const PORT = parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'production';
const APP_ENV = process.env.APP_ENV || 'prod';
const MIGRATION_FILE_PATH = new URL('../migrations/001_approval_control_persistence.up.sql', import.meta.url);

export function parseTcpTarget(rawUrl: string | undefined, defaultPort: number) {
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

export function checkTcpConnectivity(
  target: { host: string; port: number } | null,
  timeoutMs = 1500
): Promise<{ ok: boolean; reason?: string }> {
  if (!target || !target.host || !Number.isFinite(target.port)) {
    return Promise.resolve({ ok: false, reason: 'missing_or_invalid_target' });
  }
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: target.host, port: target.port });
    let settled = false;
    const finish = (result: { ok: boolean; reason?: string }) => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(result);
      }
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish({ ok: true }));
    socket.once('timeout', () => finish({ ok: false, reason: 'connect_timeout' }));
    socket.once('error', (err: any) => finish({ ok: false, reason: err.code || 'connect_error' }));
  });
}

export interface ReadinessOptions {
  checkDependencies?: boolean;
  databaseUrl?: string;
  natsUrl?: string;
  isSimulated?: boolean;
  service?: ApprovalControlService;
}

export async function evaluateReadiness(options: ReadinessOptions = {}) {
  const isSimulated =
    options.isSimulated !== undefined
      ? options.isSimulated
      : process.env.APPROVAL_EXECUTION_MODE === 'SIMULATED' ||
        process.env.SIMULATED === 'true' ||
        process.env.DEMO_MODE === 'true';

  const dbUrl = options.databaseUrl !== undefined ? options.databaseUrl : process.env.DATABASE_URL;
  const natsUrl = options.natsUrl !== undefined ? options.natsUrl : process.env.NATS_URL;
  const migrationPresent = fs.existsSync(MIGRATION_FILE_PATH);

  // If running in simulated mode without DB/NATS, mark ready with explicit declaration
  if (isSimulated && !dbUrl && !natsUrl) {
    return {
      ready: true,
      payload: {
        status: 'ready',
        service: 'approval-control-service',
        mode: 'SIMULATED',
        environment: APP_ENV,
        node_env: NODE_ENV,
        migration_present: migrationPresent,
        simulated_boundary_visible: true,
        dependencies: {
          database: { ok: true, mode: 'in_memory_simulation' },
          nats: { ok: true, mode: 'in_memory_simulation' },
        },
        timestamp: new Date().toISOString(),
      },
    };
  }

  const pgTarget = parseTcpTarget(dbUrl, 5432);
  const natsTarget = parseTcpTarget(natsUrl, 4222);

  let pgCheck: { ok: boolean; reason?: string; mode?: string } = { ok: true, mode: 'skipped_or_simulated' };
  let natsCheck: { ok: boolean; reason?: string; mode?: string } = { ok: true, mode: 'skipped_or_simulated' };

  if (options.checkDependencies !== false) {
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

  const ready = migrationPresent && pgCheck.ok && natsCheck.ok;
  return {
    ready,
    payload: {
      status: ready ? 'ready' : 'degraded',
      service: 'approval-control-service',
      environment: APP_ENV,
      node_env: NODE_ENV,
      mode: isSimulated ? 'SIMULATED' : 'PRODUCTION',
      migration_present: migrationPresent,
      dependencies: {
        database: pgCheck,
        nats: natsCheck,
      },
      timestamp: new Date().toISOString(),
    },
  };
}

export function createServer(options: ReadinessOptions = {}) {
  const service = options.service || new ApprovalControlService({ skipMigrations: true });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
    const pathname = url.pathname;

    // Liveness probe (/healthz or /health or /livez)
    if (req.method === 'GET' && (pathname === '/healthz' || pathname === '/health' || pathname === '/livez')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          service: 'approval-control-service',
          version: '0.1.0',
          uptime_seconds: Math.floor(process.uptime()),
          timestamp: new Date().toISOString(),
        })
      );
      return;
    }

    // Readiness probe (/readyz or /ready)
    if (req.method === 'GET' && (pathname === '/readyz' || pathname === '/ready')) {
      try {
        const { ready, payload } = await evaluateReadiness(options);
        const statusCode = ready ? 200 : 503;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
      } catch (err: any) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            status: 'degraded',
            service: 'approval-control-service',
            error: err instanceof Error ? err.message : String(err),
            timestamp: new Date().toISOString(),
          })
        );
      }
      return;
    }

    // Default 404 for unknown endpoints
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ code: 'LP05001', message: 'Route not found' }));
  });

  return { server, service };
}

// Auto-start if executed directly as entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  const { server, service } = createServer();
  server.listen(PORT, HOST, () => {
    console.log(
      JSON.stringify({
        level: 'info',
        event: 'approval_control_server_started',
        service: 'approval-control-service',
        port: PORT,
        host: HOST,
        node_env: NODE_ENV,
        app_env: APP_ENV,
        timestamp: new Date().toISOString(),
      })
    );
  });

  const shutdown = (signal: string) => {
    console.log(
      JSON.stringify({
        level: 'info',
        event: 'approval_control_server_stopping',
        service: 'approval-control-service',
        signal,
        timestamp: new Date().toISOString(),
      })
    );
    server.close(async () => {
      try {
        await service.stop();
      } catch {
        // fail-safe ignore
      }
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
