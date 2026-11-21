#!/usr/bin/env bash
# JEV Copilot Service Deployment Verification & Smoke Test Script (G-JEVC-009)
# Supports --static-only for CI/offline verification when Docker daemon is absent.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/infra/docker-compose.yml"
DOCKERFILE="${ROOT_DIR}/code/services/jev-copilot-service/Dockerfile"
STATIC_ONLY=false

if [[ "${1:-}" == "--static-only" ]]; then
  STATIC_ONLY=true
fi

echo "[jev-copilot-smoke] Verifying static packaging & private network invariants..."

test -f "$DOCKERFILE"
test -f "$COMPOSE_FILE"
test -f "${ROOT_DIR}/code/services/jev-copilot-service/package.json"
test -f "${ROOT_DIR}/code/services/jev-copilot-service/src/index.mjs"
test -f "${ROOT_DIR}/code/services/jev-copilot-service/migrations/001_create_jev_persistence.sql"

grep -q 'USER node' "$DOCKERFILE"
grep -q '/healthz' "$DOCKERFILE"
grep -q 'dumb-init' "$DOCKERFILE"

python3 - "$COMPOSE_FILE" <<'PY'
import sys, yaml
with open(sys.argv[1], 'r', encoding='utf-8') as f:
    doc = yaml.safe_load(f)
services = doc.get('services', {})
assert 'jev-copilot-service' in services, 'jev-copilot-service missing from docker-compose.yml'
svc = services['jev-copilot-service']
for mapping in svc.get('ports', []):
    assert str(mapping).startswith('127.0.0.1:'), f'jev-copilot-service ports must bind 127.0.0.1 only: {mapping}'
assert 'postgres' in svc.get('depends_on', {}), 'jev-copilot-service must depend on postgres'
assert 'nats' in svc.get('depends_on', {}), 'jev-copilot-service must depend on nats'
assert 'livepilot' in svc.get('networks', []), 'jev-copilot-service must attach to livepilot internal network'
assert '/healthz' in str(svc.get('healthcheck', {}).get('test', '')), 'jev-copilot-service healthcheck must probe /healthz'
for infra_svc in ('postgres', 'redis', 'nats'):
    for mapping in services[infra_svc].get('ports', []):
        assert str(mapping).startswith('127.0.0.1:'), f'{infra_svc} port must bind 127.0.0.1 only: {mapping}'
print('[jev-copilot-smoke] Compose topology and private-network checks passed.')
PY

if [[ "$STATIC_ONLY" == "true" ]]; then
  echo "[jev-copilot-smoke] Static-only mode requested; running isolated JEV copilot unit/contract suite..."
  node --test "${ROOT_DIR}/code/services/jev-copilot-service/test/"*.test.mjs
  echo "[jev-copilot-smoke] PASS (static + isolated suite)"
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  echo "[jev-copilot-smoke] ERROR: Docker daemon is not running. Re-run with --static-only or start Docker." >&2
  exit 1
fi

echo "[jev-copilot-smoke] Verifying live container user, /healthz, /readyz, and loopback bindings..."
UID_VAL="$(docker exec livepilot-jev-copilot-service id -un)"
if [[ "$UID_VAL" != "node" ]]; then
  echo "[jev-copilot-smoke] ERROR: Expected non-root user 'node', got '${UID_VAL}'" >&2
  exit 1
fi

PORT_BINDINGS="$(docker port livepilot-jev-copilot-service || true)"
echo "[jev-copilot-smoke] Port bindings: ${PORT_BINDINGS}"
if echo "$PORT_BINDINGS" | grep -q "0.0.0.0"; then
  echo "[jev-copilot-smoke] ERROR: Public 0.0.0.0 port exposure detected!" >&2
  exit 1
fi

HEALTH_JSON="$(docker exec livepilot-jev-copilot-service wget -qO- http://127.0.0.1:8085/healthz)"
READY_JSON="$(docker exec livepilot-jev-copilot-service wget -qO- http://127.0.0.1:8085/readyz)"
echo "[jev-copilot-smoke] /healthz => ${HEALTH_JSON}"
echo "[jev-copilot-smoke] /readyz  => ${READY_JSON}"

echo "$HEALTH_JSON" | grep -q '"status":"ok"'
echo "$READY_JSON" | grep -q '"service":"jev-copilot-service"'
echo "[jev-copilot-smoke] PASS (live container smoke verified)"
