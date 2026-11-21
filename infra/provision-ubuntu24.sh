#!/usr/bin/env bash
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo 'Run as root.' >&2; exit 1; }
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl git ufw fail2ban unattended-upgrades chrony auditd apparmor apparmor-utils
systemctl enable --now chrony fail2ban auditd apparmor

admin_user="${LIVEPILOT_ADMIN_USER:-livepilot-admin}"
ssh_cidr="${LIVEPILOT_SSH_CIDR:-}"
[[ -n "$ssh_cidr" ]] || { echo 'Set LIVEPILOT_SSH_CIDR to the approved operator CIDR before provisioning.' >&2; exit 1; }
if ! id "$admin_user" >/dev/null 2>&1; then
  adduser --disabled-password --gecos '' "$admin_user"
  usermod -aG sudo "$admin_user"
fi
install -d -m 0700 -o "$admin_user" -g "$admin_user" "/home/$admin_user/.ssh"
if [[ -n "${LIVEPILOT_ADMIN_AUTHORIZED_KEYS:-}" ]]; then
  printf '%s\n' "$LIVEPILOT_ADMIN_AUTHORIZED_KEYS" > "/home/$admin_user/.ssh/authorized_keys"
  chown "$admin_user:$admin_user" "/home/$admin_user/.ssh/authorized_keys"
  chmod 0600 "/home/$admin_user/.ssh/authorized_keys"
else
  echo 'LIVEPILOT_ADMIN_AUTHORIZED_KEYS is required to install the admin key.' >&2
  exit 1
fi

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
codename="$(. /etc/os-release && echo "$VERSION_CODENAME")"
printf 'deb [arch=%s signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu %s stable\n' "$(dpkg --print-architecture)" "$codename" > /etc/apt/sources.list.d/docker.list
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
usermod -aG docker "$admin_user"

install -m 0644 /dev/null /etc/ssh/sshd_config.d/99-livepilot-hardening.conf
cat >/etc/ssh/sshd_config.d/99-livepilot-hardening.conf <<EOF
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
AllowUsers $admin_user
MaxAuthTries 3
X11Forwarding no
AllowTcpForwarding no
EOF
sshd -t
systemctl reload ssh

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
ufw allow from "$ssh_cidr" to any port 22 proto tcp
ufw allow 443/tcp
ufw --force enable

cat >/etc/apt/apt.conf.d/52livepilot-security <<'EOF'
Unattended-Upgrade::Allowed-Origins {
  "${distro_id}:${distro_codename}-security";
  "${distro_id}:${distro_codename}-updates";
};
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "03:30";
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
systemctl enable --now unattended-upgrades
echo 'Ubuntu 24.04 + Docker + restricted SSH + firewall + automatic security patching configured.'
