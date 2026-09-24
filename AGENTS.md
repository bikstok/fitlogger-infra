# AGENTS.md — Fitlogger GitOps Platform

This document defines the operational directives, architectural constraints, directory structures, and system configurations for AI agents operating within the `fitlogger-infra` repository using the Google Antigravity CLI.

## 1. Project Overview & Environment Constraints

* **System Context:** Single-node homelab Kubernetes platform hosting the `fitlogger` application suite.

* **Host OS:** Windows 10 with WSL2 (Ubuntu 22.04/24.04+). `systemd` must be active (`/etc/wsl.conf` with `[boot] systemd=true`).

* **Kubernetes Distribution:** K3s running with native **Traefik Ingress Controller enabled**.

* **Domain:** `fitlogger.<tld>` (Registrar: one.com, Authoritative Nameservers: Cloudflare).

* **GitOps Engine:** ArgoCD (App-of-Apps pattern) targeting this Git repository exclusively.

* **CI / CD Execution:** GitHub Actions Runner Controller (ARC) running internally in-cluster on WSL2.

* **Container Builds:** Daemonless rootless builds using **Kaniko** or **Buildah** (no Docker daemon or `/var/run/docker.sock` dependency).

* **Image Registry:** In-cluster CNCF Distribution/Registry with local containerd mirror configured.

* **Certificate Authority:** `cert-manager` utilizing ACME Cloudflare DNS-01 challenge for wildcard certificates (`*.fitlogger.<tld>`).

* **Observability:** `kube-prometheus-stack` (Prometheus, Alertmanager, Grafana) with K3s overrides, plus Grafana Loki and Promtail/Alloy.

## 2. Ingress & Traffic Flow Topology

Agents must never propose public router port forwarding (e.g., opening WAN ports 80/443). All public inbound traffic is encapsulated through Cloudflare Tunnel.

```
[ Public Client ] 
       │ HTTPS (Edge SSL)
[ Cloudflare Edge Network ]
       │ Encrypted QUIC/HTTP2 Tunnel
[ cloudflared Pod ] (Namespace: cloudflare)
       │ HTTP (Reverse Proxy Forward)
[ Traefik Ingress Controller ] (Namespace: kube-system)
       │ ClusterIP Routing
[ Kubernetes Service ] ──> [ Pods ]

```

### Ingress Rules & Routing Contracts

1. **Catch-All Tunnel:** The `cloudflared` deployment forwards all `*.fitlogger.<tld>` traffic directly to Traefik:
   `http://traefik.kube-system.svc.cluster.local:80`

2. **Workload Exposure:** Any HTTP service is exposed purely by creating a standard Kubernetes `Ingress` resource with the annotation:
   `kubernetes.io/ingress.class: traefik`

3. **Internal Loopback:** Internal traffic (ARC pushing to registry, K3s pulling images) stays inside cluster-internal networking (`*.svc.cluster.local`) or through local Traefik routing, bypassing external internet calls.

## 3. Directory Layout Standard

All files generated or modified by agents must conform to the following tree layout:

```
fitlogger-infra/
├── AGENTS.md                         # This file
├── bootstrap/
│   ├── k3s-install.sh                # Node initialization script
│   ├── registries.yaml               # K3s containerd mirror config (/etc/rancher/k3s/registries.yaml)
│   └── argocd/
│       ├── install.yaml              # ArgoCD upstream installation manifest
│       └── root-application.yaml     # App-of-Apps bootstrap manifest
├── apps/
│   ├── cloudflare-tunnel/
│   │   ├── namespace.yaml
│   │   ├── secret.yaml               # Encrypted via SOPS or SealedSecrets
│   │   └── deployment.yaml           # cloudflared daemon pointing to Traefik
│   ├── cert-manager/
│   │   ├── application.yaml          # ArgoCD application definition
│   │   ├── release.yaml              # cert-manager deployment / Helm values
│   │   └── cluster-issuer.yaml       # Cloudflare DNS-01 API ClusterIssuer
│   ├── container-registry/
│   │   ├── pvc.yaml                  # Local-path bounded persistent volume
│   │   ├── deployment.yaml           # Docker Registry v2 / Distribution
│   │   ├── service.yaml              # ClusterIP service exposed on port 5000
│   │   └── ingress.yaml              # registry.fitlogger.<tld>
│   ├── arc/
│   │   ├── controller.yaml           # Actions Runner Controller Helm release
│   │   └── runner-scale-set.yaml     # Internal runner scale set manifest
│   ├── monitoring/
│   │   ├── namespace.yaml
│   │   ├── kube-prometheus-stack.yaml# ArgoCD application with K3s-tuned Helm values
│   │   ├── loki-stack.yaml           # Loki + Promtail daemonset
│   │   ├── grafana-ingress.yaml      # Ingress for grafana.fitlogger.<tld>
│   │   └── alertmanager-config.yaml  # Webhook notification channels
│   └── workloads/
│       └── fitlogger-app/            # Target application deployment, service, ingress

```

## 4. Key Configurations & Overrides

### 4.1 K3s Node Mirror (`/etc/rancher/k3s/registries.yaml`)

To pull local images from the internal registry without TLS errors:

```
mirrors:
  "registry.fitlogger.<tld>":
    endpoint:
      - "http://registry.container-registry.svc.cluster.local:5000"

```

### 4.2 K3s `kube-prometheus-stack` Helm Overrides

K3s packages control plane components internally. Standalone scrape targets must be disabled in Helm values to avoid permanent firing alerts:

```
kubeEtcd:
  enabled: false
kubeScheduler:
  enabled: false
kubeControllerManager:
  enabled: false
kubeProxy:
  enabled: false
prometheus:
  prometheusSpec:
    retention: 7d
    storageSpec:
      volumeClaimTemplate:
        spec:
          resources:
            requests:
              storage: 10Gi

```

### 4.3 cert-manager DNS-01 ClusterIssuer

Uses Cloudflare API token Secret (`cloudflare-api-token-secret`):

```
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: cloudflare-dns-issuer
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@fitlogger.<tld>
    privateKeySecretRef:
      name: letsencrypt-account-key
    solvers:
      - dns01:
          cloudflare:
            apiTokenSecretRef:
              name: cloudflare-api-token-secret
              key: api-token

```

## 5. Agent Guardrails & Operating Directives

1. **GitOps Execution Rule:** Do not propose one-off `kubectl apply` commands for steady-state workloads. All infrastructure components must be represented as declaratively version-controlled manifests managed by ArgoCD.

2. **Secrets Hygiene:** Never commit unencrypted tokens, Cloudflare API keys, or GitHub Personal Access Tokens. Always output manifests compatible with Sealed Secrets (`SealedSecret`) or SOPS-encrypted files.

3. **WSL2 Resource Protection:**

   * Always enforce resource `limits` and `requests` on memory and CPU for internal registry, Promtail, Prometheus, and ARC runner pods.

   * Account for WSL virtual disk expansion (`.vhdx`) by capping persistent volumes on the `local-path` provisioner.

4. **CI/CD Build Restrictions:** ARC runners inside WSL2 cannot run root Docker-in-Docker reliably. All container build pipeline manifests generated by agents must utilize Kaniko or Buildah executor containers.

5. **Clock Skew Mitigation:** Be aware that WSL2 hibernation/sleep pauses the kernel clock. When debugging sync failures, verify node clock sync (`sudo hwclock -s`).