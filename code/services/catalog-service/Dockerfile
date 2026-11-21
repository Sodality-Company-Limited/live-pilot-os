# Multi-stage production build for LivePilot Catalog Service
# Conforms to G-CATA-007 and docs/03-architecture/deployment/runtime-topology-sot.md

# Stage 1: Build, invariant validation & runtime entrypoint preparation
FROM node:24-alpine AS builder

WORKDIR /app

COPY src/ ./src/
COPY migrations/ ./migrations/
COPY test/ ./test/

# Verify Catalog persistence and SQL migration invariants during image build
RUN node test/catalogProductFacts.mjs

# Create deterministic runtime HTTP health/readiness and catalog module bootstrapper
RUN mkdir -p /app/dist && cat <<'EOF' > /app/dist/runtime.mjs
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import {
  CATALOG_PRODUCT_READ_REQUEST_SUBJECT,
  CATALOG_PRODUCT_READ_REPLY_SUBJECT,
} from '../src/transport/natsCatalogReadHandler.ts';
import {
  CATALOG_PRODUCT_MUTATE_REQUEST_SUBJECT,
  CATALOG_PRODUCT_DLQ_REPLAY_REQUEST_SUBJECT,
} from '../src/transport/natsCatalogMutationHandler.ts';
import { CATALOG_PRODUCT_UPDATED_SUBJECT } from '../src/mutation/catalogMutationStore.ts';

const PORT = parseInt(process.env.PORT || '3006', 10);
const HOST = process.env.HOST || '0.0.0.0';
const EXECUTION_MODE = process.env.CATALOG_EXECUTION_MODE || 'SIMULATED';
const PLATFORM_ADAPTER_MODE = process.env.PLATFORM_ADAPTER_MODE || 'simulated';
const MIGRATION_UP_PATH = new URL('../migrations/001_catalog_product_facts.up.sql', import.meta.url);

const REGISTERED_SUBJECTS = [
  CATALOG_PRODUCT_READ_REQUEST_SUBJECT,
  CATALOG_PRODUCT_READ_REPLY_SUBJECT,
  CATALOG_PRODUCT_MUTATE_REQUEST_SUBJECT,
  CATALOG_PRODUCT_DLQ_REPLAY_REQUEST_SUBJECT,
  CATALOG_PRODUCT_UPDATED_SUBJECT,
];

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
      service: 'catalog-service',
      mode: EXECUTION_MODE,
      platform_adapter_mode: PLATFORM_ADAPTER_MODE,
      simulated_boundary_visible: EXECUTION_MODE === 'SIMULATED' || PLATFORM_ADAPTER_MODE === 'simulated',
      migration_present: migrationPresent,
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

  if (req.method === 'GET' && (url.pathname === '/healthz' || url.pathname === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'healthy',
        service: 'catalog-service',
        mode: EXECUTION_MODE,
        platform_adapter_mode: PLATFORM_ADAPTER_MODE,
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
      event: 'catalog_service_started',
      service: 'catalog-service',
      host: HOST,
      port: PORT,
      mode: EXECUTION_MODE,
      platform_adapter_mode: PLATFORM_ADAPTER_MODE,
      subjects: REGISTERED_SUBJECTS,
      timestamp: new Date().toISOString(),
    }),
  );
});

const handleShutdown = (signal) => {
  console.log(
    JSON.stringify({
      level: 'info',
      event: 'catalog_service_stopping',
      service: 'catalog-service',
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
FROM node:24-alpine AS runner

WORKDIR /app

# Install dumb-init for deterministic PID 1 signal forwarding (SIGTERM/SIGINT)
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=3006
ENV HOST=0.0.0.0
ENV CATALOG_EXECUTION_MODE=SIMULATED
ENV PLATFORM_ADAPTER_MODE=simulated

# Copy only runtime source, migrations, and compiled entrypoint (omit tests)
COPY --from=builder /app/src ./src
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/dist/runtime.mjs ./dist/runtime.mjs

# Enforce non-root execution identity using built-in unprivileged 'node' user (uid=1000, gid=1000)
RUN chown -R node:node /app
USER node

# Internal container port only; never published to host or public internet
EXPOSE 3006

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3006/healthz || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/runtime.mjs"]
