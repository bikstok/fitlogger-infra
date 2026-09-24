#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Fitlogger GitOps Platform - K3s WSL2 Node Initialization Script
# Conforms to constraints defined in AGENTS.md
# ==============================================================================

echo "=== [1/5] Verifying WSL2 and systemd status ==="
if [ "$(ps -p 1 -o comm=)" != "systemd" ]; then
  echo "ERROR: systemd is not active as PID 1."
  echo "Ensure /etc/wsl.conf contains:"
  echo "[boot]"
  echo "systemd=true"
  echo "Then run 'wsl --shutdown' from Windows PowerShell and restart."
  exit 1
fi
echo "✓ systemd is running as PID 1"

echo "=== [2/5] Mitigating WSL2 Clock Skew ==="
if command -v hwclock >/dev/null 2>&1; then
  sudo hwclock -s || true
  echo "✓ Synchronized hardware clock"
fi

echo "=== [3/5] Setting up K3s Containerd Mirror Config ==="
sudo mkdir -p /etc/rancher/k3s
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR}/registries.yaml" ]; then
  sudo cp "${SCRIPT_DIR}/registries.yaml" /etc/rancher/k3s/registries.yaml
  sudo chmod 644 /etc/rancher/k3s/registries.yaml
  echo "✓ Copied registries.yaml to /etc/rancher/k3s/registries.yaml"
else
  echo "WARNING: ${SCRIPT_DIR}/registries.yaml not found, skipping."
fi

echo "=== [4/5] Installing K3s (Traefik enabled) ==="
# AGENTS.md: K3s running with native Traefik Ingress Controller enabled
# K3s includes Traefik by default unless --disable traefik is passed.
curl -sfL https://get.k3s.io | sh -s - \
  --write-kubeconfig-mode 644

echo "=== [5/5] Configuring Local Kubeconfig ==="
mkdir -p "$HOME/.kube"
sudo cp /etc/rancher/k3s/k3s.yaml "$HOME/.kube/config"
sudo chown "$(id -u):$(id -g)" "$HOME/.kube/config"
chmod 600 "$HOME/.kube/config"
export KUBECONFIG="$HOME/.kube/config"

echo "✓ K3s node initialization complete!"
echo "Node status:"
kubectl get nodes
