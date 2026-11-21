#!/usr/bin/env bash
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo 'Run as root.' >&2; exit 1; }
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git ufw fail2ban unattended-upgrades chrony
systemctl enable --now chrony fail2ban

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
codename="$(. /etc/os-release && echo "$VERSION_CODENAME")"
printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu %s stable\n' "$(dpkg --print-architecture)" "$codename" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker

cat >/etc/sysctl.d/99-livepilot.conf <<'EOF'
vm.overcommit_memory=1
vm.swappiness=10
vm.max_map_count=262144
fs.file-max=2097152
net.core.somaxconn=65535
EOF
sysctl --system

ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw --force enable
echo 'Ubuntu 24.04 + Docker + baseline firewall configured.'
