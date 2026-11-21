#!/usr/bin/env bash
# Catalog Service Deployment Verification & Smoke Test Script (G-CATA-007)
# Supports --static-only for CI/offline verification when Docker daemon is absent.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${ROOT_DIR}/infra/docker-compose.yml"
DOCKERFILE="${ROOT_DIR}/code/services/catalog-service/Dockerfile"
STATIC_ONLY=false

if [[ "${1:-}" == "--static-only" ]]; then
  STATIC_ONLY=true
fi

echo "[catalog-smoke] Verifying static packaging & private network invariants..."

test -f "$DOCKERFILE"
test -f "$COMPOSE_FILE"
test -f "${ROOT_DIR}/infra/production/catalog-service.env.example"
test -f "${ROOT_DIR}/code/services/catalog-service/migrations/001_catalog_product_facts.up.sql"
test -f "${ROOT_DIR}/code/services/catalog-service/migrations/001_catalog_product_facts.down.sql"

grep -q 'USER node' "$DOCKERFILE"
grep -q '/healthz' "$DOCKERFILE"
grep -q '/readyz' "$DOCKERFILE"
grep -q 'dumb-init' "$DOCKERFILE"

python3 - "$COMPOSE_FILE" <<'PY'
import sys, yaml
with open(sys.argv[1], 'r', encoding='utf-8') as f:
    doc = yaml.safe_load(f)
services = doc.get('services', {})
assert 'catalog-service' in services, 'catalog-service missing from docker-compose.yml'
cat = services['catalog-service']
assert 'ports' not in cat or not cat['ports'], 'catalog-service must have zero public ports'
assert 'postgres' in cat.get('depends_on', {}), 'catalog-service must depend on postgres'
assert 'nats' in cat.get('depends_on', {}), 'catalog-service must depend on nats'
assert 'livepilot' in cat.get('networks', []), 'catalog-service must attach to livepilot internal network'
assert '/readyz' in str(cat.get('healthcheck', {}).get('test', '')), 'catalog-service healthcheck must probe /readyz'
for infra_svc in ('postgres', 'redis', 'nats'):
    for mapping in services[infra_svc].get('ports', []):
        assert str(mapping).startswith('127.0.0.1:'), f'{infra_svc} port must bind 127.0.0.1 only: {mapping}'
print('[catalog-smoke] Compose topology and private-network checks passed.')
PY

if [[ "$STATIC_ONLY" == "true" ]]; then
  echo "[catalog-smoke] Static-only mode requested; running isolated catalog unit/contract suite..."
  node "${ROOT_DIR}/code/services/catalog-service/test/runAllCatalogTests.mjs"
  echo "[catalog-smoke] PASS (static + isolated suite)"
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  echo "[catalog-smoke] ERROR: Docker daemon is not running. Re-run with --static-only or start Docker." >&2
  exit 1
fi

echo "[catalog-smoke] Verifying live container user, /healthz, /readyz, and zero host ports..."
UID_VAL="$(docker exec livepilot-catalog-service id -un)"
if [[ "$UID_VAL" != "node" ]]; then
  echo "[catalog-smoke] ERROR: Expected non-root user 'node', got '${UID_VAL}'" >&2
  exit 1
fi

PORT_BINDINGS="$(docker port livepilot-catalog-service || true)"
if [[ -n "$PORT_BINDINGS" ]]; then
  echo "[catalog-smoke] ERROR: Expected zero published host ports, got: ${PORT_BINDINGS}" >&2
  exit 1
fi

HEALTH_JSON="$(docker exec livepilot-catalog-service wget -qO- http://127.0.0.1:3006/healthz)"
READY_JSON="$(docker exec livepilot-catalog-service wget -qO- http://127.0.0.1:3006/readyz)"
echo "[catalog-smoke] /healthz => ${HEALTH_JSON}"
echo "[catalog-smoke] /readyz  => ${READY_JSON}"

echo "$READY_JSON" | grep -q '"status":"ready"'
echo "$READY_JSON" | grep -q '"postgres":"reachable"'
echo "$READY_JSON" | grep -q '"nats":"reachable"'
echo "[catalog-smoke] PASS (live container smoke verified)"
