# Local Development Setup

**Prerequisites:** Docker Desktop, Node.js 20+, pnpm 9+

---

## 1. Clone and install

```bash
git clone https://github.com/your-org/kazi-pay.git
cd kazi-pay
pnpm install
```

---

## 2. Environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in the required values. See `docs/deployment/environment-variables.md` for descriptions. The defaults in `.env.example` work for local Docker without changes except for secret keys.

`AI_PROVIDER=stub` is the default — you do **not** need real AI provider API keys to run the dev stack. The stub returns deterministic fixture content for all 12 document types. The same is true for M-Pesa and WhatsApp once those phases ship; their stubs work end-to-end against the dev DB.

---

## 3. Start the full stack

```bash
# Start all services (DB, backend, frontend, NGINX) with hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

This starts:

| Service | URL |
|---------|-----|
| Frontend (React, creative side) | http://localhost:5173 |
| Frontend (client share view) | http://localhost:5173/s/{token} |
| Backend API | http://localhost:3000 |
| Via NGINX (unified) | http://localhost:80 |
| PostgreSQL | localhost:5432 (exposed for DB tools) |

---

## 4. Run database migrations and seed

In a new terminal (while Docker is running):

```bash
# Run migrations
docker compose exec backend npx prisma migrate dev

# Seed test data (demo creative + example project)
docker compose exec backend npx prisma db seed
```

Default seed credentials (demo profile):
- **Email:** `rowlex@demo.kazi.pay`
- **Password:** `Demo1234!`
- **Profile:** Rowlex Karimi, graphic designer, Nairobi, Kenya (currency KES)

---

## 5. Verify setup

```bash
# API health check
curl http://localhost:3000/api/health
# Expected: { "status": "ok", "timestamp": "..." }
```

Then open http://localhost:5173 and log in with the seed credentials. You should land on a dashboard with one example project on the demo profile.

---

## 6. Test the client-facing share flow

To exercise the client-side surface locally:

1. Log in as the demo creative.
2. Open the example project, generate documents, and click "Send to client".
3. Copy the generated share URL.
4. Paste it into an incognito window (so you're not logged in as the creative).
5. Read all documents and type-to-sign.
6. Switch back to the creative tab and refresh — the project phase should have advanced.

---

## 7. M-Pesa local testing (Phase 3+)

M-Pesa Daraja callbacks need to reach your backend over the public internet. Set up a tunnel:

```bash
# Cloudflare Tunnel example
cloudflared tunnel --url http://localhost:3000
# Or ngrok
ngrok http 3000
```

Set `MPESA_CALLBACK_URL` in `.env` to `https://<your-tunnel-url>/api/v1/mpesa/callback` and register that URL in the Daraja sandbox app. Until you do, set `MPESA_ENV=sandbox` and rely on the M-Pesa stub for development.

---

## Running Tests

```bash
# All tests
pnpm test

# Backend only
cd backend && pnpm test

# Frontend only
cd frontend && pnpm test

# Watch mode
pnpm test --watch
```

External integrations (M-Pesa, WhatsApp, AI) are stubbed in tests via their interfaces — no live API calls from CI.

---

## Common Commands

```bash
# Stop all services
docker compose down

# Stop and remove volumes (wipes DB — clean slate)
docker compose down -v

# View backend logs
docker compose logs -f backend

# Open Prisma Studio (DB browser)
docker compose exec backend npx prisma studio
# Opens at http://localhost:5555

# Generate Prisma client after schema changes
docker compose exec backend npx prisma generate

# Create a new migration
docker compose exec backend npx prisma migrate dev --name your-migration-name

# Rebuild images after dependency changes
docker compose build --no-cache backend
```

---

## Working with the standalone HTML prototypes

The three `kazipay_*.html` files at the project root are reference prototypes. Open them directly in a browser:

```
file:///D:/kazi.pay(tbd)/kazipay_landing.html
```

They're standalone (all CSS/JS inline, no build step) and the React app should match them in design and flow. They are not wired into the real backend.

---

## Troubleshooting

**Port already in use**
Change the host port in `docker-compose.dev.yml` (e.g., `"3001:3000"`).

**Prisma client out of date**
Run `docker compose exec backend npx prisma generate` after any `schema.prisma` change.

**DB connection refused**
The backend depends on the DB healthcheck. Wait a few seconds after `docker compose up` before running migrations — or check `docker compose ps` to confirm `db` is healthy.

**`pnpm install` failing in Docker**
Ensure `pnpm-lock.yaml` is committed. The Docker build uses `--frozen-lockfile` and will fail if the lockfile is missing or out of sync.

**M-Pesa callback never arrives in dev**
Check the tunnel is running and `MPESA_CALLBACK_URL` matches the live tunnel URL. Safaricom requires HTTPS — `http://` callbacks are rejected silently.

**AI document generation returns the same content repeatedly**
You're on the stub (`AI_PROVIDER=stub`). That's intentional in dev — set a real provider in `.env` to get live generation.
