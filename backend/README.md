# backend/

Node.js + Express + TypeScript + Prisma. Phase 1.4 auth lives here.

See [`../AGENTS.md`](../AGENTS.md) for coding rules and [`../docs/`](../docs/) for product context.

## Quick start

From the repo root:

```bash
# 0. Install deps (once)
pnpm install

# 1. Start Postgres in Docker (one-time per session)
docker compose up -d db

# 2. Apply the Prisma migration to the DB
pnpm --filter @kazipay/backend prisma:migrate

# 3. Seed the two demo users (Rowlex Karimi + Amina Otieno)
pnpm --filter @kazipay/backend prisma:seed

# 4. Run the backend dev server (hot-reload)
pnpm --filter @kazipay/backend dev
```

Backend listens on `http://localhost:3000`. Health check:
```bash
curl http://localhost:3000/api/v1/health
```

## Stack

- **Runtime**: Node 20+, Express 5, TypeScript 6
- **DB**: PostgreSQL 16 (via Docker), Prisma 6 ORM
- **Auth**: RS256 JWT (15min access), opaque refresh tokens (7d, rotated, hashed in DB), bcrypt cost 12 passwords — per ADR-002
- **Validation**: zod schemas on every request body
- **Logger**: pino (PII-redacted)
- **Test**: Vitest

## Demo credentials (seeded)

| Email | Password | State | Use for |
|-------|----------|-------|---------|
| `rowlex@demo.kazi.pay` | `Demo1234!` | verified + onboarded | Dashboard testing |
| `test@demo.kazi.pay` | `Test1234!` | verified, NOT onboarded | Wizard testing without re-registering |

## Scripts

| Command | What it does |
|---------|--------------|
| `pnpm dev` | tsx watch — hot-reload dev server |
| `pnpm build` | tsc to `dist/` |
| `pnpm start` | run the built `dist/` |
| `pnpm test` | Vitest single run |
| `pnpm lint` | ESLint flat config |
| `pnpm typecheck` | tsc --noEmit |
| `pnpm prisma:migrate` | apply migrations to dev DB |
| `pnpm prisma:deploy` | apply migrations in production mode |
| `pnpm prisma:studio` | open the Prisma Studio DB browser |
| `pnpm prisma:seed` | re-run seed (idempotent) |
| `pnpm db:reset` | nuke + recreate DB schema (DESTRUCTIVE) |

## JWT keys

On first boot, the backend generates a 2048-bit RS256 keypair into
`backend/.keys/` (gitignored) if neither `JWT_PRIVATE_KEY` nor
`JWT_PUBLIC_KEY` env vars are set. The keys persist across restarts so
sessions survive a `tsx watch` reload. Delete the directory to rotate
locally; provide real keys via env vars in production.

## Where things live

```
backend/
├── prisma/
│   ├── schema.prisma     # source of truth for DB
│   ├── migrations/       # generated migrations (committed)
│   └── seed.ts           # demo users
└── src/
    ├── index.ts          # entrypoint (listen + graceful shutdown)
    ├── app.ts            # Express app factory
    ├── config/env.ts     # zod-validated env
    ├── lib/              # prisma client, logger, jwt, passwords
    ├── middleware/       # error handler, auth, validate
    ├── repositories/     # Prisma queries per entity
    ├── services/         # business logic (auth, users, email)
    ├── controllers/      # HTTP plumbing — thin
    ├── routes/           # router composition
    ├── schemas/          # zod request schemas
    └── utils/            # AppError, api-response envelope helpers
```
