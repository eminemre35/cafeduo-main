#!/usr/bin/env bash
# Faz 1: Docker + Dokploy on a fresh Ubuntu VDS (run as root on NEW server).
set -euo pipefail

echo "[1/3] Installing Docker..."
curl -fsSL https://get.docker.com | sh

echo "[2/3] UFW (optional) — opening 22,80,443,3000"
if command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp || true
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
  ufw allow 3000/tcp || true
fi

echo "[3/3] Installing Dokploy..."
curl -sSL https://dokploy.com/install.sh | sh

echo "Done. Open http://$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}'):3000 and create admin account."
