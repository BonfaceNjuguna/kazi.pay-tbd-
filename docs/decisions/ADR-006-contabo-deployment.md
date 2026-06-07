# ADR-006 — Contabo VPS Deployment with DirectAdmin Reverse Proxy

**Date:** 2026-06-07
**Status:** Accepted
**Deciders:** Bonface (Founder/Lead)
**Supersedes:** ADR-005 §"Production Hosting (Phase 4 TBD)" — the open question of *where* the Docker stack runs is closed by this ADR. ADR-005 still defines the *how* (Docker Compose, multi-stage builds, NGINX, env-var injection); this ADR pins the host and the deploy mechanism.

---

## Context

ADR-005 settled the deployment shape (Docker Compose, NGINX reverse proxy, env-var injected secrets) and listed three candidate hosts: managed VPS, Fly.io, single-VPS deploy. The Phase 4 "Production Hosting (TBD)" placeholder needs an answer now because:

- Phase 1 is functionally complete (auth merged on `main`). The next loop — *change code → see the change running on a real URL* — is what unblocks every subsequent phase. Staying laptop-only stretches the verification debt.
- The marketing site (`perxli.com`) is already running on a Contabo VPS that has DirectAdmin installed and Docker available. Provisioning a second host (Fly.io, Coolify, etc.) just to run the tool would double the bill and split the operations surface for no functional gain at this scale.
- A second host also splits secrets, DNS, monitoring, and backups across two providers — friction that compounds with every phase.

We want one host, one operations surface, one bill. The tool ships to `tool.perxli.com` (prod) and `stage.tool.perxli.com` (stage); the marketing site stays on `perxli.com`; everything lives on the same Contabo box.

---

## Decision

**Run the tool's Docker Compose stack on the existing Contabo VPS. DirectAdmin's NGINX terminates HTTPS for both subdomains and reverse-proxies to localhost-bound container ports. CI/CD: GitHub Actions builds + publishes images to GitHub Container Registry (GHCR), then SSHes into the VPS as a dedicated `deploy` user to pull + restart.**

### Host

- **VPS:** Contabo (existing). 12 GB RAM · 6 vCPU · 100 GB NVMe. Comfortable for the Phase 1–3 footprint (backend ~150 MB RSS, frontend NGINX ~30 MB, Postgres ~250 MB working set on the seed dataset). Headroom for Redis + workers in Phase 4 without resizing.
- **OS:** whatever DirectAdmin runs on it (Debian/Ubuntu LTS) — irrelevant to the app, everything app-side lives inside Docker.
- **Provisioning:** the VPS already exists. Setup steps in [`docs/deployment/contabo-setup.md`](../deployment/contabo-setup.md).

### Reverse proxy: DirectAdmin's NGINX, not a second proxy

DirectAdmin already owns ports 80/443 on this host. Standing up Caddy or Traefik in front of Docker means either (a) DirectAdmin gives up the ports (breaks the marketing site's SSL), (b) we run the second proxy on a non-standard port and chain DirectAdmin → second-proxy → containers (two reverse proxies, two SSL pipelines), or (c) we use `host` network mode and pretend the conflict doesn't exist.

Instead: containers bind to `127.0.0.1` only (never reachable from the public internet), and DirectAdmin's NGINX gets two `proxy_pass` snippets — one per subdomain — installed via its **Custom HTTPD Config** UI. Let's Encrypt renewal stays inside DirectAdmin; we never touch certbot. The snippet template lives in [`docs/deployment/contabo-setup.md`](../deployment/contabo-setup.md).

| Subdomain | DirectAdmin proxy target |
|---|---|
| `tool.perxli.com` (prod) | `http://127.0.0.1:3001` (frontend NGINX), `/api/*` → `http://127.0.0.1:4001` (backend) |
| `stage.tool.perxli.com` (stage) | `http://127.0.0.1:3002` (frontend), `/api/*` → `http://127.0.0.1:4002` (backend) |

Each environment is a separate `docker-compose.yml` with disjoint port bindings and disjoint named volumes. They co-exist on one VPS without speaking to each other.

### Image registry: GHCR

Images are built and pushed by GitHub Actions to `ghcr.io/bonfacenjuguna/perxli-backend` and `ghcr.io/bonfacenjuguna/perxli-frontend`. Free for public images, free for private with the GitHub plan we already pay for. No third-party registry account needed. Tags: `latest-{stage|prod}` floats; the commit SHA tag is the immutable handle (`sha-abc1234`) used by deploys for traceability and rollback.

### Deploy mechanism: SSH from CI

After image publish, the same workflow SSHes into the VPS as the `deploy` user, runs `docker compose pull && docker compose up -d --remove-orphans` against the environment-specific compose file, and runs `prisma migrate deploy` against the live Postgres container. Self-contained, no agent on the server, easy to reason about, easy to debug.

- **Why not pull-mode tools (Watchtower, Diun + manual pull)?** They poll registries on a timer — sloppy turnaround, no clear audit trail, no migrations step. SSH-push from CI is precise and synchronous: the workflow either succeeds (and we know `tool.perxli.com` is updated) or it fails (and the previous image keeps serving).
- **Why not Coolify?** Excellent product, but a heavier abstraction than we need: it wants to own the proxy, the SSL, the registry, the deploys, the dashboards. With DirectAdmin already owning the proxy + SSL, Coolify would compete with DirectAdmin rather than complement it. Revisit when we outgrow single-VPS deploys.

### Branch → environment mapping

| Branch | Auto-deploys to | Gate |
|---|---|---|
| `develop` | `stage.tool.perxli.com` | Push (CI green) |
| `main` | `tool.perxli.com` | PR review + CI green + branch protection |

Feature branches → PR into `develop`. Merge auto-deploys to stage. After smoke-testing on stage, PR `develop` → `main`. Merge auto-deploys to prod.

### Database: Postgres container per environment

One Postgres 16 container per environment, named volume on the host (`perxli_prod_pgdata` and `perxli_stage_pgdata`). No managed database (yet) — same rationale as not using a managed proxy: one extra moving part the team must monitor, for a problem we don't have at this size.

**Backups:** nightly `pg_dump` cron on the VPS dumps both environments to `/var/backups/perxli/{prod,stage}/YYYY-MM-DD.sql.gz`. 14-day rolling retention via `find -delete`. Offload to Contabo Object Storage (or B2) is a follow-up before we have real customer data — tracked in `docs/vision-register.md`.

### Mail: existing DirectAdmin SMTP

Verification + password-reset emails travel via the same `hello@perxli.com` mailbox we wired up for the coming-soon form. Same `mail.perxli.com:587` STARTTLS, same credentials. Backend uses Nodemailer with the same auth pattern.

When transactional volume gets uncomfortable (~1000+ outbound emails/month) we revisit — Resend or Postmark would slot in behind the same Nodemailer interface.

---

## Environment Layout on the VPS

```
/opt/perxli/
├── prod/
│   ├── docker-compose.yml           ← prod stack (immutable, pulled from repo)
│   ├── .env                          ← prod secrets (chmod 600, owned by deploy user)
│   ├── nginx-snippet.conf            ← DirectAdmin custom config reference (symlinked from DA dir)
│   └── data/                         ← bind-mount source for uploads (if STORAGE_DRIVER=local)
├── stage/
│   ├── docker-compose.yml
│   ├── .env
│   ├── nginx-snippet.conf
│   └── data/
└── backups/                          ← pg_dump destination
    ├── prod/
    └── stage/
```

Each compose file mounts its own named volume for Postgres and its own bind-mount for upload storage. The `deploy` user owns `/opt/perxli/` recursively, with `.env` files set to `chmod 600` (only the `deploy` user can read them).

---

## CI/CD Flow

```
   ┌──────────────────────┐
   │ Push to develop/main │
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │ ci.yml               │  Lint · typecheck · test · build (existing — required)
   └──────────┬───────────┘
              │ green
              ▼
   ┌──────────────────────┐
   │ deploy.yml           │  Build backend image · Build frontend image
   │  (this ADR)          │  Push both to GHCR with `sha-XXX` + `latest-{stage|prod}` tags
   │                      │  SSH to deploy@vps:
   │                      │    cd /opt/perxli/{stage|prod}
   │                      │    docker compose pull
   │                      │    docker compose run --rm backend npx prisma migrate deploy
   │                      │    docker compose up -d --remove-orphans
   │                      │    docker image prune -f
   └──────────────────────┘
```

**Required GitHub Actions secrets** (Settings → Secrets and variables → Actions):

| Secret | Purpose |
|---|---|
| `VPS_HOST` | e.g. `vps-12345.contaboserver.net` or the IP |
| `VPS_SSH_KEY` | Private SSH key for `deploy@VPS_HOST` (Ed25519 recommended) |
| `VPS_SSH_KNOWN_HOSTS` | Output of `ssh-keyscan vps-host` — pinned to avoid first-connection MitM |

Image push uses the workflow's built-in `GITHUB_TOKEN` (no extra secret needed). Per-environment app secrets (DB password, JWT keys, SMTP password) live in `/opt/perxli/{env}/.env` on the VPS only — never in GitHub Actions, never in the image.

---

## Rollback

Every image is tagged with the commit SHA in addition to the floating `latest-{env}` tag. To roll back:

```bash
ssh deploy@vps
cd /opt/perxli/prod
docker compose down
# Edit .env or docker-compose.yml to pin image tag to sha-PREVIOUS-COMMIT
docker compose up -d
```

In practice we'll codify this as `scripts/rollback.sh` once the first rollback happens — premature scripting otherwise.

---

## What's deliberately out of scope here

- **Multi-region.** One VPS, one region (Contabo's). Single-region downtime is acceptable for the target market (Kenyan creatives, single timezone).
- **Zero-downtime deploys.** `docker compose up -d` has a sub-second gap between old and new containers. For an early-stage tool with a small synchronous user base, that's invisible. Revisit when we have real concurrent users.
- **Blue-green via duplicate stacks.** Same reasoning — overkill at this size.
- **Kubernetes.** Mentioned in ADR-005 as a future option; not on the table at single-VPS scale.
- **Self-hosted metrics (Grafana/Loki/Prometheus).** Useful, but observability is a Phase 4 milestone after we have real users to observe. For now: Pino structured logs to stdout, `docker logs` for retrieval.

---

## Consequences

### Positive
- One VPS, one bill (~$15/month for the existing Contabo plan), one ops surface.
- DirectAdmin handles SSL renewal forever — we don't operate certbot.
- Marketing site (`perxli.com`) and tool (`tool.perxli.com`) coexist without conflict.
- Containers are localhost-bound, so the only attack surface that reaches the public is DirectAdmin's NGINX — same security posture as the marketing site.
- Identical compose files between local dev and production (env-vars do the differentiation), so "works on my laptop" really does mean "works in prod".
- Rollback is one SHA change + `docker compose up -d`.

### Negative
- Single point of failure: VPS down = both marketing site AND tool down. Mitigated by Contabo's image-snapshot backups (taken before any DirectAdmin update) and the nightly `pg_dump`.
- Manual `deploy` user + DirectAdmin custom config setup are one-time-but-fiddly. Documented step-by-step in the setup runbook so future-us doesn't have to re-derive.
- If we ever need to scale horizontally, this single-VPS model needs replacing. Acceptable: we'll know months in advance from CPU/memory trend lines, and rebuilding to a Fly.io / Coolify / k8s setup from a tested Docker Compose baseline is straightforward — that's the whole point of choosing Docker in ADR-005.
- DirectAdmin updates can occasionally touch its NGINX config — the custom config snippets persist across updates (DirectAdmin documents this contract), but they need a sanity check after every DA major upgrade.

---

## Related

- [ADR-005 — Deployment Strategy](./ADR-005-deployment.md) — sets the Docker Compose + NGINX shape this ADR specializes
- [Contabo Setup Runbook](../deployment/contabo-setup.md) — step-by-step operational guide
- [Environment Variables Reference](../deployment/environment-variables.md) — full var list, stage vs prod
- [CI & Security](../deployment/ci-and-security.md) — existing workflows that this ADR's `deploy.yml` joins
- [Phase 1.11 milestone](../milestones/phase-1-foundation.md#111--containerization--production-deploy) — implementation tracker
