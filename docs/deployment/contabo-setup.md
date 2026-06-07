# Contabo VPS Setup Runbook

> **Audience:** the human running the one-time VPS bootstrap to bring `tool.perxli.com` and `stage.tool.perxli.com` online.
> **Architectural decision:** [ADR-006 — Contabo VPS Deployment](../decisions/ADR-006-contabo-deployment.md). Read that first; it explains *why* every step below exists.
> **One-time-but-fiddly.** Block out ~90 minutes the first time. Subsequent deploys are fully automated via GitHub Actions.

---

## What you'll have at the end

- A `deploy` Linux user on the VPS with passwordless `docker compose` for `/opt/perxli/{prod,stage}/`.
- Directory layout `/opt/perxli/{prod,stage}/` with `docker-compose.yml`, `.env` (chmod 600), and a `data/` bind-mount per environment.
- DirectAdmin reverse-proxy snippets serving `tool.perxli.com` → `127.0.0.1:3001` and `stage.tool.perxli.com` → `127.0.0.1:3002`.
- Valid Let's Encrypt certificates on both subdomains (auto-renewing via DirectAdmin).
- Nightly `pg_dump` cron with 14-day retention.
- GitHub Actions secrets configured so push-to-`develop` and push-to-`main` auto-deploy.

---

## Prerequisites

Before starting, confirm:

- [ ] Contabo VPS is reachable, you can SSH in as `root` (or as a sudoer).
- [ ] DirectAdmin admin login works at `https://<vps-host>:2222/`.
- [ ] Docker Engine ≥ 24.0 is installed and `docker compose version` returns ≥ v2. Check with `docker --version && docker compose version`.
- [ ] DNS A records for `tool.perxli.com` and `stage.tool.perxli.com` point at the VPS IP. Confirm with `dig +short tool.perxli.com` from your laptop — it should return the VPS IP.
- [ ] You can edit DirectAdmin's **Custom HTTPD Config** UI. (Admin Level → Custom HTTPD Configurations.)

If any of those are not yet true, fix them before continuing. The steps below assume you can pass each prerequisite check.

---

## Step 1 — Create the `deploy` user

The `deploy` user is what GitHub Actions SSHes in as. No interactive password, no shell history outside the deploy commands, narrow `sudo` scope.

SSH in as `root` (or `sudo -i` from your sudoer account) and run:

```bash
# Create the user with a home directory and bash shell.
adduser --disabled-password --gecos "" deploy

# Add to the docker group so it can run `docker` without sudo. If your
# distro puts docker behind sudo (Debian default), this is what avoids
# `sudo: a password is required` in the deploy workflow.
usermod -aG docker deploy

# Lock the password — SSH key is the only way in.
passwd -l deploy
```

Sanity-check: `id deploy` should show membership in the `docker` group.

---

## Step 2 — Generate the SSH key pair (on your laptop, not the VPS)

The private key lives in GitHub Actions secrets. The public key gets installed on the VPS.

On your laptop:

```bash
# Ed25519 is faster, smaller, and safer than RSA. No passphrase — Actions
# runners can't enter one, and the threat model assumes the GitHub secret
# is the strong boundary.
ssh-keygen -t ed25519 -C "github-actions-deploy@perxli" -f ~/.ssh/perxli-deploy -N ""

# This produces two files:
#   ~/.ssh/perxli-deploy        (private — goes to GitHub secrets, NEVER commit)
#   ~/.ssh/perxli-deploy.pub    (public  — goes to the VPS authorized_keys)
```

Install the **public** key on the VPS:

```bash
# From the VPS, as root:
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
# Paste the contents of perxli-deploy.pub into this file:
nano /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

Test from your laptop — this should drop you into a `deploy@vps$` shell without prompting:

```bash
ssh -i ~/.ssh/perxli-deploy deploy@<vps-host>
docker ps   # should work without sudo, may show no containers yet
exit
```

If the password prompt appears or `docker ps` says "permission denied", do not proceed. Re-check the `authorized_keys` permissions and group membership.

---

## Step 3 — Capture the SSH host fingerprint

GitHub Actions pins this so a future MitM that intercepts the connection can't impersonate the VPS.

On your laptop:

```bash
ssh-keyscan -t ed25519,rsa <vps-host>
```

The output (one or two lines starting with the hostname) is what goes into the `VPS_SSH_KNOWN_HOSTS` GitHub secret in Step 8.

---

## Step 4 — Create the directory layout

SSH in as `deploy` and create the per-environment directories. Both environments will be parallel — same shape, disjoint data.

```bash
sudo mkdir -p /opt/perxli/{prod,stage}/data
sudo chown -R deploy:deploy /opt/perxli
chmod 750 /opt/perxli /opt/perxli/prod /opt/perxli/stage
```

We'll populate the `docker-compose.yml` files in §1.11 implementation work. For now we just need the empty layout so DirectAdmin's snippets and the deploy workflow have somewhere to write into.

---

## Step 5 — DirectAdmin reverse-proxy snippets

This is the step DirectAdmin owns. We're adding two `proxy_pass` directives — one for each subdomain — via DirectAdmin's **Custom HTTPD Config** UI so they survive DA upgrades.

### 5.1 Add the subdomains

DirectAdmin Admin Level → User Level → **Subdomain Management** → add:
- `tool` (under `perxli.com`)
- `stage.tool` (under `perxli.com`)

DirectAdmin creates `/home/<user>/domains/perxli.com/public_html/tool/` and similar for stage. We won't actually serve any files from those directories — the reverse proxy bypasses them — but DirectAdmin needs them to anchor the subdomain configuration.

### 5.2 Issue Let's Encrypt certificates

DirectAdmin → SSL Certificates → for each subdomain, "Free & automatic certificate from Let's Encrypt" → check both subdomains, request. Wait for the green check; both should appear in DirectAdmin's renewal cron automatically.

Verify:

```bash
echo | openssl s_client -servername tool.perxli.com -connect tool.perxli.com:443 2>/dev/null | openssl x509 -noout -dates
echo | openssl s_client -servername stage.tool.perxli.com -connect stage.tool.perxli.com:443 2>/dev/null | openssl x509 -noout -dates
```

Both should report `notAfter` ~90 days out.

### 5.3 Custom HTTPD Config snippet (per subdomain)

In DirectAdmin → Admin Level → **Custom HTTPD Configurations** → find `tool.perxli.com` → click → paste into the **CUSTOM3.PRE** box (NGINX 1.x setups; if you're on Apache, paste into `CUSTOM3.HTTPS` instead):

```nginx
# Perxli tool — production. Routes:
#   /            → frontend container on 127.0.0.1:3001 (NGINX serving Vite build)
#   /api         → backend container on 127.0.0.1:4001 (Express)
# Cookies, websockets, real client IP, long uploads — all wired below.

location /api/ {
    proxy_pass http://127.0.0.1:4001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    # Express's trust-proxy: 1 (set in backend/src/app.ts) trusts these.
    proxy_connect_timeout 10s;
    proxy_send_timeout    60s;
    proxy_read_timeout    60s;
    client_max_body_size  10m;
}

location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

Save. Repeat for `stage.tool.perxli.com` with ports `4002` (API) and `3002` (frontend).

Rebuild the DirectAdmin config: from a `root` shell on the VPS:

```bash
cd /usr/local/directadmin/custombuild
./build rewrite_confs
```

DirectAdmin reloads NGINX. The subdomains now proxy through, but nothing's listening on those ports yet — visit and you'll see a 502 until §1.11 brings up the containers. That's expected at this point.

### 5.4 Why CUSTOM3.PRE

DirectAdmin's NGINX template has explicit insertion points. `CUSTOM3.PRE` sits inside the server block but before the default `location /` block, so our directives override the default static-file handler. Other slots (`CUSTOM1.PRE`, etc.) are valid but would not override the default `location /`. DirectAdmin docs: [Custom HTTPD Configurations](https://docs.directadmin.com/directadmin/customizing-with-templates/customhttpd.html).

---

## Step 6 — Postgres backup cron

We're not shipping Phase 1.11 with rolling DB backups baked in; this is operations infrastructure. Install once, never think about it again.

As `root`:

```bash
mkdir -p /var/backups/perxli/{prod,stage}
chown -R deploy:deploy /var/backups/perxli
```

Create `/usr/local/bin/perxli-backup.sh`:

```bash
#!/bin/bash
# Nightly Postgres dump for both environments. Runs as the deploy user
# (it can talk to docker without sudo). 14-day rolling retention.

set -euo pipefail

DATE=$(date +%Y-%m-%d_%H%M)

for ENV in prod stage; do
    OUT="/var/backups/perxli/${ENV}/${DATE}.sql.gz"
    docker exec "perxli-${ENV}-db" pg_dump -U "${DB_USER:-perxli}" "${DB_NAME:-perxli}" \
        | gzip > "$OUT"
    # Retention: keep last 14 days only.
    find "/var/backups/perxli/${ENV}/" -name '*.sql.gz' -mtime +14 -delete
done
```

```bash
chmod +x /usr/local/bin/perxli-backup.sh
```

Install the cron as `deploy`:

```bash
sudo -u deploy crontab -e
# Add:
0 3 * * * /usr/local/bin/perxli-backup.sh >> /var/log/perxli-backup.log 2>&1
```

3 AM local time. Confirm after the first night that `/var/backups/perxli/prod/` has a file and `/var/log/perxli-backup.log` is empty (no errors). Test restore once before you depend on it:

```bash
# DRY RUN restore check (does not actually overwrite):
gunzip -c /var/backups/perxli/prod/<latest>.sql.gz | head -50
```

---

## Step 7 — Populate `.env` files on the VPS

The production secrets never live in GitHub Actions — they live in `/opt/perxli/{prod,stage}/.env` on the VPS only. Touch each file, then `nano` in the real values from your password manager.

```bash
# As deploy on the VPS:
cd /opt/perxli/prod
touch .env
chmod 600 .env
nano .env
```

Variables to set: see [environment-variables.md → §"Production & Staging"](./environment-variables.md#production--staging). At minimum: `NODE_ENV`, `DATABASE_URL`, `DB_*`, `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `REFRESH_TOKEN_SECRET`, `SMTP_*`, `FRONTEND_URL`, `PUBLIC_BASE_URL`, `IMAGE_TAG`.

Repeat for `/opt/perxli/stage/.env`.

**Generate JWT keys separately per environment**:

```bash
mkdir -p ~/perxli-keys/prod ~/perxli-keys/stage
cd ~/perxli-keys/prod
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
openssl rsa -in private.pem -pubout -out public.pem
# Base64-encode for the .env (single line, no wrapping):
echo "JWT_PRIVATE_KEY=$(base64 -w 0 private.pem)"
echo "JWT_PUBLIC_KEY=$(base64 -w 0 public.pem)"
cd ../stage  # repeat for stage
```

After populating both `.env` files: `ls -la /opt/perxli/{prod,stage}/.env` should show `-rw------- 1 deploy deploy …`.

---

## Step 8 — GitHub Actions secrets

In GitHub: **Settings → Secrets and variables → Actions → New repository secret** for each of:

| Secret | Value |
|---|---|
| `VPS_HOST` | The VPS hostname or IP (e.g. `vmi3322714.contaboserver.net`) |
| `VPS_SSH_KEY` | The full contents of `~/.ssh/perxli-deploy` (private key) — paste including the `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END` lines |
| `VPS_SSH_KNOWN_HOSTS` | The `ssh-keyscan` output from Step 3 |

That's the entire CI-side secret list. App secrets live in `/opt/perxli/*/.env` on the VPS only.

---

## Step 9 — First deploy (manual, to seed `/opt/perxli/*/docker-compose.yml`)

Before the GitHub Actions workflow can deploy, the `docker-compose.yml` for each environment needs to exist on the VPS. After §1.11 lands the compose template in the repo at `deploy/docker-compose.prod.yml`, copy it up:

```bash
# From your laptop:
scp -i ~/.ssh/perxli-deploy deploy/docker-compose.prod.yml deploy@<vps>:/opt/perxli/prod/docker-compose.yml
scp -i ~/.ssh/perxli-deploy deploy/docker-compose.stage.yml deploy@<vps>:/opt/perxli/stage/docker-compose.yml
```

Then SSH in and do the first deploy manually so any setup errors surface before the workflow tries:

```bash
ssh deploy@<vps>
cd /opt/perxli/prod
docker compose pull
docker compose run --rm backend npx prisma migrate deploy
docker compose up -d
docker compose ps   # all "Up", no "Restarting"
```

Repeat for `stage`. Hit `https://tool.perxli.com/api/health` from your browser — should return `200`. Hit `https://tool.perxli.com/` — should serve the SPA.

After that, every subsequent deploy is just `git push origin develop` (or `main`) and the workflow does the rest.

---

## Step 10 — Verify branch protection

In GitHub → **Settings → Branches**, confirm:

- `main` has the protections documented in [`main-branch-protection.md`](./main-branch-protection.md).
- `develop` has: require CI green (Lint, Typecheck, Test, Build, Docker Build) before merge. No review requirement on develop — one approver flow is fine for stage. Same "include administrators" toggle as `main`.

After both protections are configured: open a no-op PR against `develop`, watch it run CI → merge → deploy.yml runs → `stage.tool.perxli.com` shows the new SHA in its `/api/health` response.

---

## Day-to-day operations

| Task | Command |
|---|---|
| See what's running | `ssh deploy@vps "docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'"` |
| Tail backend logs (prod) | `ssh deploy@vps "docker logs -f --tail=200 perxli-prod-backend"` |
| Tail backend logs (stage) | `ssh deploy@vps "docker logs -f --tail=200 perxli-stage-backend"` |
| Check disk usage | `ssh deploy@vps "df -h /opt /var/lib/docker /var/backups"` |
| Manual rollback (prod) | See [ADR-006 §Rollback](../decisions/ADR-006-contabo-deployment.md#rollback) |
| Restore DB from backup | `gunzip -c /var/backups/perxli/prod/<date>.sql.gz \| docker exec -i perxli-prod-db psql -U perxli perxli` |
| Manual deploy (escape hatch) | `ssh deploy@vps "cd /opt/perxli/prod && docker compose pull && docker compose up -d"` |

---

## Troubleshooting

### `502 Bad Gateway` on `tool.perxli.com`

DirectAdmin's NGINX is reaching for the container ports and getting refused. Check, in order:

1. `docker ps` on the VPS — is the frontend container actually running and bound to the right port? `docker port perxli-prod-frontend` should list `80/tcp -> 127.0.0.1:3001`.
2. `curl -v http://127.0.0.1:3001/` from the VPS shell — does the container respond directly?
3. DirectAdmin error log: `tail -200 /var/log/nginx/error.log`.
4. If the container is up but unreachable, the most common cause is a missing `--restart` policy after a VPS reboot. Compose's `restart: unless-stopped` handles this — confirm it's set in the compose file.

### GitHub Actions deploy fails at `ssh` step

1. **`Host key verification failed`** — `VPS_SSH_KNOWN_HOSTS` is wrong or the VPS host key rotated. Re-run `ssh-keyscan` from your laptop, update the secret.
2. **`Permission denied (publickey)`** — `VPS_SSH_KEY` doesn't match what's in `/home/deploy/.ssh/authorized_keys`. Re-copy the public key.
3. **`docker: command not found`** — `deploy` user isn't in the `docker` group. `usermod -aG docker deploy` and have the user log out and back in.

### `docker compose pull` fails with `denied`

The image is private in GHCR and the `deploy` user hasn't logged into GHCR yet. The CI workflow does this automatically using `GITHUB_TOKEN`. For manual operations:

```bash
# Create a GitHub PAT with `read:packages` scope. As deploy user:
echo "$GHCR_PAT" | docker login ghcr.io -u BonfaceNjuguna --password-stdin
```

Login persists in `/home/deploy/.docker/config.json` — only need to do it once.

### Let's Encrypt cert won't issue

DirectAdmin's LE flow needs port 80 open and DNS pointing at the VPS. If issuance fails:

1. `dig +short tool.perxli.com` — does it return the VPS IP?
2. `curl -I http://tool.perxli.com/.well-known/acme-challenge/test` — does it reach NGINX without redirecting to HTTPS? (Should 404, not 301.)
3. DirectAdmin's LE log: `/var/log/letsencrypt-domains.log`.

Most issues are propagation (DNS not yet visible from Let's Encrypt's servers) — wait 15 minutes and retry.
