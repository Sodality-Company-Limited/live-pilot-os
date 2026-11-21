#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
grep -q 'PermitRootLogin no' "$root_dir/infra/provision-ubuntu24.sh"
grep -q 'PasswordAuthentication no' "$root_dir/infra/provision-ubuntu24.sh"
grep -q 'ufw allow 443/tcp' "$root_dir/infra/provision-ubuntu24.sh"
grep -q 'SecRuleEngine On' "$root_dir/infra/nginx/modsecurity.conf"
grep -q 'owasp-crs' "$root_dir/infra/nginx/modsecurity.conf"
grep -q 'read_only: true' "$root_dir/infra/edge-compose.yml"
grep -q 'cap_drop: \[ALL\]' "$root_dir/infra/edge-compose.yml"
grep -q 'portal-ui:3000' "$root_dir/infra/nginx/nginx.conf"
grep -q '127.0.0.1:5432:5432' "$root_dir/infra/docker-compose.yml"
grep -q '127.0.0.1:4222:4222' "$root_dir/infra/docker-compose.yml"
grep -q '127.0.0.1:6379:6379' "$root_dir/infra/docker-compose.yml"
echo 'LivePilot infrastructure hardening checks passed.'
