# Local Development Setup

**Prerequisites:** Docker Desktop · Node.js 20+ · pnpm 9 (installable via `corepack`)

This guide reflects the current state of the repo (Phase 1.4 complete). It will grow as Phases 1.5+ ship.

---

## 1. Clone and install

```bash
git clone https://github.com/BonfaceNjuguna/perxli.com-tbd-.git "perxli.com"
cd "perxli.com"
pnpm install
```

---

## 2. Environment files

Two `.env` files, neither committed:

```bash
# Root — used by docker-compose for Postgres credentials.
cp .env.example .env

# Backend — DATABASE_URL, JWT settings, CORS, rate limits.
cp backend/.env.example backend/.env

# Frontend — optional, only needed if you want to override defaults
# (e.g. point at a different backend, or toggle MSW on).
cp frontend/.env.example frontend/.env
```

Defaults work out of the box for local dev. Don't change `DB_PASSWORD` here unless you change it in `backend/.env` too — the two must match.

---

## 3. Start Postgres

```bash
docker compose up -d db
```

Verify it's healthy:
```bash
docker compose ps
# Should show perxli-db with status "healthy"
```

The container exposes Postgres on **`localhost:5433`** (not 5432 — dodges conflicts with locally-installed Postgres services that many dev machines already have). Connect with TablePlus / DBeaver / `psql`:
- Host: `localhost`
- Port: `5433`
- DB: `perxli`
- User: `perxli`
- Password: `changeme_local`

---

## 4. Initialise the database

First time only (and any time `prisma/schema.prisma` changes):

```bash
# Apply migrations
pnpm --filter @perxli/backend prisma:migrate

# Seed the two demo users
pnpm --filter @perxli/backend prisma:seed
```

Demo credentials (also documented in `backend/README.md`):

| Email | Password | State | Use for |
|-------|----------|-------|---------|
| `rowlex@demo.perxli.com` | `Demo1234!` | verified + onboarded | dashboard testing |
| `test@demo.perxli.com` | `Test1234!` | verified, NOT onboarded | wizard testing without re-registering |

---

## 5. Run the dev servers

Two terminals — backend in one, frontend in the other.

### Backend (Terminal A)
```bash
pnpm --filter @perxli/backend dev
```
Listens on `http://localhost:3000`. Health check:
```bash
curl http://localhost:3000/api/v1/health
```
On first boot the backend auto-generates a JWT RS256 keypair into `backend/.keys/` (gitignored). Re-uses it on subsequent boots so sessions survive a restart.

### Frontend (Terminal B)
```bash
pnpm --filter @perxli/frontend dev
# or just: pnpm dev (from the repo root)
```
Vite serves at `http://localhost:5173`. Its dev proxy tunnels `/api/*` to the backend on port 3000 — no CORS / env setup needed for the happy path.

---

## 6. Test the auth + onboarding flow

Open `http://localhost:5173` in a browser:

1. **Existing onboarded user** — sign in as `rowlex@demo.perxli.com` / `Demo1234!` → straight to `/dashboard`
2. **Onboarding wizard** — sign in as `test@demo.perxli.com` / `Test1234!` → bounces to `/onboarding` (4-step wizard)
3. **Fresh register + email verify** — `/register` with any new email → bounces to `/verify-email`. The backend logs the verification link to its terminal output:
   ```
   [EmailService:stub] Verification email for X@Y. Visit: http://localhost:5173/verify-email?token=...
   ```
   Copy that URL, paste in the browser → email verified → sign in.
4. **Forgot password** — same pattern; backend logs the reset link to its terminal.

---

## Useful commands

```bash
# Open Prisma Studio (DB browser) at http://localhost:5555
pnpm --filter @perxli/backend prisma:studio

# Run all tests
pnpm test

# Type-check + lint (matches CI)
pnpm typecheck
pnpm lint

# Stop the DB container (data persists in the named volume)
docker compose down

# Nuke the DB (DESTRUCTIVE — wipes all data)
docker compose down -v
```

---

## Frontend MSW mode (no backend needed)

For frontend-only iteration, you can run the React app against the MSW mock backend:

```bash
echo "VITE_USE_MSW=true" >> frontend/.env
pnpm --filter @perxli/frontend dev
```

MSW intercepts every `/api/*` call. Behaviour matches the real backend's contract. Useful when:
- The real backend is wedged or you don't want to start Postgres
- You're testing a UI tweak that doesn't need real persistence
- You're on a flight without Docker

Set it back to `VITE_USE_MSW=` (empty) or delete the line to return to real-backend mode.

---

## Troubleshooting

**`pnpm install` fails with `EBADENGINE`**
You're on Node < 20. Upgrade or use `nvm use 20`.

**Backend boot fails with `Can't reach database server at localhost:5433`**
The DB container isn't running. `docker compose up -d db`, wait for healthy, retry.

**Prisma errors about missing client**
Run `pnpm --filter @perxli/backend prisma:generate`.

**Frontend gets `BACKEND_DOWN` 502 on every API call**
Backend isn't running. Start it (Terminal A above) or flip `VITE_USE_MSW=true` to use the mock.

**"Lockfile out of sync" in CI**
You added a dep without committing the new `pnpm-lock.yaml`. Run `pnpm install` locally and commit the lockfile.

**JWT signature errors after restarting backend**
Backend's `.keys/` directory was deleted/regenerated. Sign out + sign back in to mint a fresh session against the new keys.
