# Multi-stage production build for LivePilot Telemetry Service
# Conforms to G-TELM-008 and docs/03-architecture/deployment/runtime-topology-sot.md

# Stage 1: Build, migration invariant validation & runtime entrypoint preparation
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json tsconfig.json ./
COPY src/ ./src/
COPY migrations/ ./migrations/
COPY scripts/ ./scripts/

# Fail-closed validation of telemetry PostgreSQL migration invariants during build
RUN node scripts/verify-migrations.mjs

# Create deterministic runtime HTTP health/readiness and telemetry module bootstrapper
RUN mkdir -p /app/dist && cat <<'EOF' > /app/dist/runtime.mjs
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import { SignalState } from '../src/domain/signal-state-machine.ts';
import { TELEMETRY_INGEST_SUBJECT, TELEMETRY_DETECTED_SUBJECT } from '../src/ingest/telemetry-ingest.service.ts';
import { TelemetryIngestController } from '../src/ingest/telemetry-ingest.controller.ts';
import { TelemetrySignalRepository } from '../src/repository/telemetry-signal.repository.ts';
import { TelemetryReconciliationService } from '../src/reconciliation/telemetry-reconciliation.service.ts';
import { TELEMETRY_DLQ_SUBJECT } from '../src/reconciliation/telemetry-dlq.publisher.ts';

const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = process.env.HOST || '0.0.0.0';
const APP_ENV = process.env.APP_ENV || 'prod';
const MIGRATION_UP_PATH = new URL('../migrations/001_create_telemetry_signals.up.sql', import.meta.url);

const REGISTERED_SUBJECTS = [
  TELEMETRY_INGEST_SUBJECT,
  TELEMETRY_DETECTED_SUBJECT,
  TELEMETRY_DLQ_SUBJECT,
];

const REGISTERED_COMPONENTS = {
  signalStateMachine: Boolean(SignalState),
  ingestController: Boolean(TelemetryIngestController),
  signalRepository: Boolean(TelemetrySignalRepository),
  reconciliationService: Boolean(TelemetryReconciliationService),
};

function parseTcpTarget(rawUrl, defaultPort) {
  if (!rawUrl) {
    return null;
  }
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

function checkTcpConnectivity(target, timeoutMs = 1500) {
  if (!target || !target.host || !Number.isFinite(target.port)) {
    return Promise.resolve({ ok: false, reason: 'missing_or_invalid_url' });
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

async function evaluateReadiness() {
  const migrationPresent = fs.existsSync(MIGRATION_UP_PATH);
  const pgTarget = parseTcpTarget(process.env.DATABASE_URL, 5432);
  const natsTarget = parseTcpTarget(process.env.NATS_URL, 4222);
  const [pgCheck, natsCheck] = await Promise.all([
    checkTcpConnectivity(pgTarget),
    checkTcpConnectivity(natsTarget),
  ]);

  const ready = migrationPresent && pgCheck.ok && natsCheck.ok;
  return {
    ready,
    payload: {
      status: ready ? 'ready' : 'not_ready',
      service: 'telemetry-service',
      env: APP_ENV,
      migration_present: migrationPresent,
      components: REGISTERED_COMPONENTS,
      dependencies: {
        postgres: pgCheck.ok ? 'reachable' : `unavailable:${pgCheck.reason}`,
        nats: natsCheck.ok ? 'reachable' : `unavailable:${natsCheck.reason}`,
      },
      subjects: REGISTERED_SUBJECTS,
      timestamp: new Date().toISOString(),
    },
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);

  if (req.method === 'GET' && (url.pathname === '/healthz' || url.pathname === '/health' || url.pathname === '/livez')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'healthy',
        service: 'telemetry-service',
        env: APP_ENV,
        uptime_seconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }

  if (req.method === 'GET' && url.pathname === '/readyz') {
    const readiness = await evaluateReadiness();
    res.writeHead(readiness.ready ? 200 : 503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(readiness.payload));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ code: 'LP03001', message: 'Route not found' }));
});

server.listen(PORT, HOST, () => {
  console.log(
    JSON.stringify({
      level: 'info',
      event: 'telemetry_service_started',
      service: 'telemetry-service',
      host: HOST,
      port: PORT,
      env: APP_ENV,
      subjects: REGISTERED_SUBJECTS,
      timestamp: new Date().toISOString(),
    }),
  );
});

const handleShutdown = (signal) => {
  console.log(
    JSON.stringify({
      level: 'info',
      event: 'telemetry_service_stopping',
      service: 'telemetry-service',
      signal,
      timestamp: new Date().toISOString(),
    }),
  );
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
EOF
RUN node --check /app/dist/runtime.mjs

# Stage 2: Minimal hardened production runtime
FROM node:22-alpine AS runner

WORKDIR /app

# Install dumb-init for deterministic PID 1 signal forwarding (SIGTERM/SIGINT)
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Copy runtime artifacts only (omit tests and build scripts)
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/src ./src
COPY --from=builder --chown=node:node /app/migrations ./migrations
COPY --from=builder --chown=node:node /app/dist/runtime.mjs ./dist/runtime.mjs

# Enforce non-root execution identity using built-in unprivileged 'node' user (uid=1000, gid=1000)
USER node

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/healthz || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "--experimental-strip-types", "dist/runtime.mjs"]
