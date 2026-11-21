import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '../../../../');
const sessionServiceDir = resolve(rootDir, 'code/services/session-service');

test('G-LIVE-005: Session Service Deployment & DigitalOcean Droplet Invariants', async (t) => {
  await t.test('1. Dockerfile Multi-Stage, Non-Root, and Static Security Invariants', () => {
    const dockerfilePath = resolve(sessionServiceDir, 'Dockerfile');
    assert.ok(existsSync(dockerfilePath), 'Dockerfile must exist');

    const content = readFileSync(dockerfilePath, 'utf8');

    // Multi-stage verification
    assert.match(content, /FROM\s+node:22-alpine\s+AS\s+builder/i, 'Must have builder stage with node:22-alpine');
    assert.match(content, /FROM\s+node:22-alpine\s+AS\s+runner/i, 'Must have runner stage with node:22-alpine');

    // Non-root user invariant
    assert.match(content, /USER\s+node/i, 'Must specify unprivileged non-root USER node');

    // PID 1 signal handler (dumb-init)
    assert.match(content, /dumb-init/i, 'Must include dumb-init for PID 1 signal forwarding');

    // Proper CMD / Entrypoint
    assert.match(content, /CMD\s+\[.*"dist\/main\.js".*\]/i, 'CMD must run compiled dist/main.js');

    // Healthcheck probe in Dockerfile
    assert.match(content, /HEALTHCHECK/i, 'Must declare HEALTHCHECK instruction');
    assert.match(content, /http:\/\/127\.0\.0\.1:3004\/health/i, 'Healthcheck probe must target port 3004 /health');

    // Zero secret leaks in Dockerfile
    assert.doesNotMatch(content, /password\s*=\s*['"][^'"]+['"]/i, 'Must not embed hardcoded passwords');
    assert.doesNotMatch(content, /token\s*=\s*['"][^'"]+['"]/i, 'Must not embed hardcoded tokens');
  });

  await t.test('2. Docker Compose Topology and Resource Constraints', () => {
    const composePath = resolve(sessionServiceDir, 'deploy/docker-compose.session-service.yml');
    assert.ok(existsSync(composePath), 'docker-compose.session-service.yml must exist');

    const content = readFileSync(composePath, 'utf8');

    // Container and service identity
    assert.match(content, /container_name:\s*livepilot-session-service/, 'Must name container livepilot-session-service');
    assert.match(content, /image:\s*livepilot\/session-service:latest/, 'Must tag image correctly');

    // Resource limits
    assert.match(content, /mem_limit:\s*512m/, 'Must enforce mem_limit');
    assert.match(content, /cpus:\s*1\.0/, 'Must enforce CPU limit');

    // Restart policy
    assert.match(content, /restart:\s*unless-stopped/, 'Must specify restart policy unless-stopped');

    // Network isolation (private host binding)
    assert.match(content, /"127\.0\.0\.1:3004:3004"/, 'Must bind port 3004 strictly to 127.0.0.1');

    // Network attachment
    assert.match(content, /livepilot-infra/, 'Must join external livepilot-infra network');

    // Dependencies
    assert.match(content, /postgres:\s*\n\s*condition:\s*service_healthy/, 'Must depend on healthy postgres');
    assert.match(content, /nats:\s*\n\s*condition:\s*service_healthy/, 'Must depend on healthy nats');
  });

  await t.test('3. Environment Variable Completeness & Examples', () => {
    const envExamplePath = resolve(sessionServiceDir, 'deploy/session-service.env.example');
    assert.ok(existsSync(envExamplePath), 'session-service.env.example must exist');

    const content = readFileSync(envExamplePath, 'utf8');

    // Required variables
    assert.match(content, /NODE_ENV=production/, 'Must declare NODE_ENV');
    assert.match(content, /PORT=3004/, 'Must set PORT to 3004');
    assert.match(content, /DATABASE_URL=/, 'Must declare DATABASE_URL');
    assert.match(content, /NATS_URL=/, 'Must declare NATS_URL');
    assert.match(content, /NATS_TOKEN=/, 'Must declare NATS_TOKEN');
  });

  await t.test('4. Release Runbook and Rollback Strategy SOT Adherence', () => {
    const runbookPath = resolve(rootDir, 'docs/03-architecture/deployment/session-service-release-runbook.md');
    assert.ok(existsSync(runbookPath), 'session-service-release-runbook.md must exist');

    const content = readFileSync(runbookPath, 'utf8');

    // Verify critical operational sections
    assert.match(content, /## 1\. Service Identity/, 'Must describe service identity');
    assert.match(content, /## 2\. Pre-Deployment Verification/, 'Must include pre-deployment setup');
    assert.match(content, /## 3\. Database Migration Procedure/, 'Must describe migration procedure');
    assert.match(content, /## 4\. Container Build & Deployment/, 'Must detail container build and run');
    assert.match(content, /## 5\. Post-Deployment Verification & Health Checks/, 'Must include health verification');
    assert.match(content, /## 6\. Rollback & Incident Recovery Procedure/, 'Must describe rollback procedure');

    // SOT citations
    assert.match(content, /digitalocean-droplets-sot\.md/, 'Must cite digitalocean-droplets-sot.md');
    assert.match(content, /migration-rollback-sot\.md/, 'Must cite migration-rollback-sot.md');

    // Port and endpoint verification
    assert.match(content, /3004/, 'Must cite port 3004');
    assert.match(content, /\/health/, 'Must cite /health probe');
  });

  await t.test('5. Service Health Controller Implementation & NestJS Routing', () => {
    const healthControllerPath = resolve(sessionServiceDir, 'src/health.controller.ts');
    assert.ok(existsSync(healthControllerPath), 'src/health.controller.ts must exist');

    const content = readFileSync(healthControllerPath, 'utf8');
    assert.match(content, /@Controller\(\)/, 'Must be a NestJS Controller');
    assert.match(content, /getHealth\(\)/, 'Must implement health endpoint');
    assert.match(content, /getHealthz\(\)/, 'Must implement healthz endpoint');
    assert.match(content, /'healthy'/, 'Must return healthy status');
  });
});
