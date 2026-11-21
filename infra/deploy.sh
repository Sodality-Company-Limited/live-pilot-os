#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="${LIVEPILOT_SSH_HOST:?Set LIVEPILOT_SSH_HOST to the Droplet IP}"
USER="${LIVEPILOT_SSH_USER:-root}"
REMOTE_DIR="${LIVEPILOT_REMOTE_DIR:-/opt/live-pilot-os}"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30)

usage() { echo "Usage: $0 [deploy|status|down]"; }
action="${1:-deploy}"
case "$action" in deploy|status|down) ;; *) usage >&2; exit 1 ;; esac

ssh "${SSH_OPTS[@]}" "$USER@$HOST" "mkdir -p '$REMOTE_DIR/infra'"
scp "${SSH_OPTS[@]}" "$ROOT_DIR/infra/docker-compose.yml" "$ROOT_DIR/infra/.env.example" "$USER@$HOST:$REMOTE_DIR/infra/"

if [[ -f "$ROOT_DIR/infra/.env" ]]; then
  scp "${SSH_OPTS[@]}" "$ROOT_DIR/infra/.env" "$USER@$HOST:$REMOTE_DIR/infra/.env"
elif [[ "$action" == deploy ]]; then
  ssh "${SSH_OPTS[@]}" "$USER@$HOST" "umask 077; if [[ ! -f '$REMOTE_DIR/infra/.env' ]]; then { printf 'POSTGRES_USER=livepilot\\nPOSTGRES_PASSWORD='; openssl rand -hex 32; printf '\\nPOSTGRES_DB=livepilot\\nREDIS_PASSWORD='; openssl rand -hex 32; printf '\\nNATS_TOKEN='; openssl rand -hex 32; printf '\\nCLICKHOUSE_DB=livepilot_analytics\\nCLICKHOUSE_USER=livepilot\\nCLICKHOUSE_PASSWORD='; openssl rand -hex 32; printf '\\n'; } > '$REMOTE_DIR/infra/.env'; fi"
else
  echo "Remote infra/.env does not exist. Run deploy once to bootstrap it." >&2
  exit 1
fi

case "$action" in
  deploy) ssh "${SSH_OPTS[@]}" "$USER@$HOST" "chmod 600 '$REMOTE_DIR/infra/.env'; docker compose --env-file '$REMOTE_DIR/infra/.env' -f '$REMOTE_DIR/infra/docker-compose.yml' up -d; docker compose --env-file '$REMOTE_DIR/infra/.env' -f '$REMOTE_DIR/infra/docker-compose.yml' ps" ;;
  status) ssh "${SSH_OPTS[@]}" "$USER@$HOST" "docker compose --env-file '$REMOTE_DIR/infra/.env' -f '$REMOTE_DIR/infra/docker-compose.yml' ps" ;;
  down) ssh "${SSH_OPTS[@]}" "$USER@$HOST" "docker compose --env-file '$REMOTE_DIR/infra/.env' -f '$REMOTE_DIR/infra/docker-compose.yml' down" ;;
esac
