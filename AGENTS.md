# AGENTS.md — Fitlogger GitOps Platform

This document defines the operational directives, architectural constraints, directory structures, and system configurations for AI agents operating within the `fitlogger-infra` repository using the Google Antigravity CLI.

---

## 1. Project Overview & Environment Constraints

* **System Context:** Single-node homelab Kubernetes platform hosting the `fitlogger.dk` application suite.
* **Host OS:** Windows 10 with WSL2 (Ubuntu 24.04). `systemd` is active (`/etc/wsl.conf` with `[boot] systemd=true`).
* **Kubernetes Distribution:** K3s running with native **Traefik Ingress Controller enabled**.
* **Domain:** `fitlogger.dk` (Registrar: one.com, Authoritative Nameservers: Cloudflare).
* **GitOps Engine:** ArgoCD (App-of-Apps pattern via `root-application`) targeting this Git repository exclusively.
* **CI / CD Execution:** GitHub Actions Runner Controller (ARC) running internally in-cluster (`arc-systems` / `arc-runners`).
* **Container Builds:** Daemonless rootless builds using **Buildah** (`quay.io/buildah/stable` with `--storage-driver vfs`). No Docker daemon or `/var/run/docker.sock` dependency.
* **Image Registry:** In-cluster CNCF Distribution/Registry on `registry.container-registry.svc.cluster.local:5000` with persistent local storage and node containerd mirror for `registry.fitlogger.dk`.
* **Versioning Standard:** Human-readable SemVer + Build Number: `v<package.json-version>-<run_number>` (e.g. `v1.1.0-9`).
* **Certificate Authority:** `cert-manager` utilizing ACME Cloudflare DNS-01 challenge for wildcard certificates (`*.fitlogger.dk`).
* **Observability:** `kube-prometheus-stack` (Prometheus, Alertmanager, Grafana) with K3s overrides, plus Grafana Loki and Promtail/Alloy.

---

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

1. **Catch-All Tunnel:** The `cloudflared` deployment forwards all `*.fitlogger.dk` traffic directly to Traefik:
   `http://traefik.kube-system.svc.cluster.local:80`

2. **Workload Exposure:** Any HTTP service is exposed purely by creating a standard Kubernetes `Ingress` resource with the annotation:
   `kubernetes.io/ingress.class: traefik`

3. **Internal Loopback:** Internal traffic (ARC pushing to registry, K3s pulling images) stays inside cluster-internal networking (`*.svc.cluster.local`) or through the node containerd mirror, bypassing external internet calls.

---

## 3. Directory Layout Standard

All files generated or modified by agents must conform to the following tree layout:

```
fitlogger-infra/
├── AGENTS.md                         # Operational directives and platform standards (this file)
├── .github/
│   └── workflows/
│       └── build-fitlogger.yaml      # Automated CI/CD pipeline (Buildah + GitOps tag updater)
├── src/
│   └── fitlogger-app/                # Pure application source code (decoupled from manifests)
│       ├── Dockerfile                # Multi-stage production container build (non-root node)
│       ├── package.json              # App dependencies & SemVer source of truth
│       ├── server.js                 # Express web server & API
│       └── public/                   # Static web assets & frontend UI
├── bootstrap/
│   ├── k3s-install.sh                # Node initialization script
│   ├── registries.yaml               # K3s containerd mirror config (/etc/rancher/k3s/registries.yaml)
│   └── argocd/
│       ├── install.yaml              # ArgoCD upstream installation manifest
│       └── root-application.yaml     # App-of-Apps bootstrap manifest
└── apps/
    ├── argocd/
    │   ├── ingress.yaml              # Traefik ingress for argocd.fitlogger.dk
    │   ├── cmd-params-cm.yaml        # Server insecure mode (SSL terminated at edge)
    │   └── argocd-cm.yaml            # ArgoCD server public URL config
    ├── arc/
    │   ├── controller.yaml           # Actions Runner Controller Helm release (arc-systems)
    │   └── runner-scale-set.yaml     # Ephemeral runner scale set manifest (arc-runners)
    ├── container-registry/
    │   ├── namespace.yaml
    │   ├── pvc.yaml                  # Local-path persistent volume claim (10Gi)
    │   ├── deployment.yaml           # Docker Registry v2 / Distribution
    │   ├── service.yaml              # ClusterIP service exposed on port 5000
    │   ├── ui-deployment.yaml        # Docker Registry Web UI (joxit/docker-registry-ui)
    │   ├── ui-service.yaml           # ClusterIP service for Web UI (port 80)
    │   ├── middleware-auth.yaml      # Traefik BasicAuth middleware
    │   └── ingress.yaml              # Ingress for registry.fitlogger.dk (routes to Web UI)
    ├── workloads/
    │   └── fitlogger-app/            # Pure declarative Kubernetes manifests
    │       ├── namespace.yaml        # fitlogger namespace
    │       ├── deployment.yaml       # App deployment (automated GitOps target)
    │       ├── service.yaml          # ClusterIP service
    │       └── ingress.yaml          # Traefik ingress for fitlogger.dk
    ├── cloudflare-tunnel/            # (Staged) cloudflared daemon pointing to Traefik
    ├── cert-manager/                 # (Staged) Cloudflare DNS-01 API ClusterIssuer
    └── monitoring/                   # (Staged) Prometheus, Grafana, Loki
```

---

## 4. Automated CI/CD & GitOps Workflow

The complete deployment pipeline is fully automated and self-contained:

```
[ Developer Git Push (src/fitlogger-app/**) ]
                    │
                    ▼
   [ GitHub Actions Dispatches Job ]
                    │
                    ▼
[ ARC Listener Spawns Ephemeral Pod (quay.io/buildah/stable) ]
                    │
                    ▼
[ Buildah builds image & pushes to in-cluster registry ]
  - Tags: v<semver>-<build> and latest
  - Target: registry.container-registry.svc.cluster.local:5000
                    │
                    ▼
[ Runner updates apps/workloads/fitlogger-app/deployment.yaml ]
  - Commits with [skip ci] & pushes to main
                    │
                    ▼
[ ArgoCD detects Git diff on main ]
  - Automatically syncs deployment
  - Triggers zero-downtime rolling update
                    │
                    ▼
[ Runner pod scales down to 0 replicas ]
```

### Versioning Contract
* Always maintain the semantic version in `src/fitlogger-app/package.json`.
* The CI workflow extracts this version and appends the sequential GitHub run number: `v${APP_VERSION}-${GITHUB_RUN_NUMBER}`.
* Never deploy raw 40-character SHAs or untracked `:latest` tags to production manifests.

---

## 5. Key Configurations & Overrides

### 5.1 K3s Node Mirror (`/etc/rancher/k3s/registries.yaml`)

Allows K3s containerd to pull from the local registry without TLS errors:

```yaml
mirrors:
  "registry.fitlogger.dk":
    endpoint:
      - "http://registry.container-registry.svc.cluster.local:5000"
      - "http://127.0.0.1:5000"
```

### 5.2 Actions Runner Controller (ARC) Scale Set

Configured with `containerMode: type: "kubernetes"` and bounded resources to protect WSL2 memory:

```yaml
containerMode:
  type: "kubernetes"
  kubernetesModeWorkVolumeClaim:
    accessModes: ["ReadWriteOnce"]
    storageClassName: "local-path"
    resources:
      requests:
        storage: 1Gi
template:
  spec:
    containers:
      - name: runner
        image: ghcr.io/actions/actions-runner:latest
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 1Gi
```

### 5.3 K3s `kube-prometheus-stack` Helm Overrides

K3s packages control plane components internally. Standalone scrape targets must be disabled in Helm values to avoid permanent firing alerts:

```yaml
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

### 5.4 cert-manager DNS-01 ClusterIssuer

Uses Cloudflare API token Secret (`cloudflare-api-token-secret`):

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: cloudflare-dns-issuer
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@fitlogger.dk
    privateKeySecretRef:
      name: letsencrypt-account-key
    solvers:
      - dns01:
          cloudflare:
            apiTokenSecretRef:
              name: cloudflare-api-token-secret
              key: api-token
```

---

## 6. Agent Guardrails & Anti-Patterns

1. **Source Code / Manifest Separation:**
   * Pure application source code lives exclusively in `src/<app>/`.
   * Pure declarative Kubernetes manifests live exclusively in `apps/workloads/<app>/`.
   * Never mix source files (`server.js`, `package.json`, `Dockerfile`) into `apps/`.

2. **Runner Simplicity Directive:**
   * **Do NOT over-engineer CI runners.** Never install `kubectl` inside runner steps to launch nested builder pods via `kubectl run`.
   * Standard container steps (`container: image: quay.io/buildah/stable`) must be used for builds. `actions/checkout@v4` works natively in Fedora/glibc containers.

3. **GitOps Single Source of Truth:**
   * Never propose one-off `kubectl apply` commands for steady-state workloads.
   * All infrastructure changes and version bumps must be represented as declaratively version-controlled manifests managed by ArgoCD.

4. **Secrets Hygiene:**
   * Never commit unencrypted tokens, Cloudflare API keys, or GitHub Personal Access Tokens.
   * Always output manifests compatible with Sealed Secrets (`SealedSecret`) or SOPS-encrypted files.

5. **WSL2 Resource Protection:**
   * Always enforce resource `limits` and `requests` on memory and CPU for all deployments, registry, Prometheus, and runner pods.
   * Keep persistent volume requests modest on the `local-path` provisioner to avoid unbounded `.vhdx` virtual disk expansion.

6. **Clock Skew Mitigation:**
   * WSL2 sleep/hibernation pauses the kernel clock. When debugging sync failures, verify node clock sync (`sudo hwclock -s`).