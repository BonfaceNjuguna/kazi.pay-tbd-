# ADR-005 — Deployment Strategy

**Date:** 2026-05-30
**Status:** Accepted
**Deciders:** Rowlex (Founder/Lead)

---

## Context

We need a deployment strategy that works for a small team, is repeatable across environments (local → staging → production), and avoids cloud vendor lock-in. The system consists of a React frontend (creative + client surfaces), Node.js backend, PostgreSQL database, and a Redis-backed job queue (Phase 4) for AI generation, M-Pesa reconciliation, WhatsApp delivery, and AI reminders.

---

## Decision

**Docker + Docker Compose for all environments. NGINX as reverse proxy.**

### Why Docker

- Identical runtime across local dev, CI, staging, and production.
- No "works on my machine" issues.
- Straightforward to move to Kubernetes or any container-hosting platform later.
- Team already targets containerized cloud platforms (Fly.io, ECS, GKE).

---

## Environment Architecture

```
                        ┌─────────────────────────────────┐
Internet ──► NGINX :80/443  │  / → frontend (React build)      │
                        │  /api → backend (Express)        │
                        └─────────────┬───────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    │                                   │
              backend :3000                       frontend :80
              (Node/Express)              (NGINX serving static build)
                    │
                    ├──► postgres :5432
                    │    (PostgreSQL 15)
                    │
                    ├──► redis :6379  (Phase 4 — BullMQ)
                    │
                    ├──► M-Pesa Daraja (external)
                    ├──► WhatsApp Cloud API (external)
                    └──► AI provider (external)
```

---

## Service Definitions

### `docker-compose.yml` (production-like)

```yaml
services:
  db:
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      target: runner
    restart: unless-stopped
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
      JWT_PRIVATE_KEY: ${JWT_PRIVATE_KEY}
      JWT_PUBLIC_KEY: ${JWT_PUBLIC_KEY}
      REFRESH_TOKEN_SECRET: ${REFRESH_TOKEN_SECRET}
      MPESA_CONSUMER_KEY: ${MPESA_CONSUMER_KEY}
      MPESA_CONSUMER_SECRET: ${MPESA_CONSUMER_SECRET}
      WHATSAPP_TOKEN: ${WHATSAPP_TOKEN}
      AI_PROVIDER_API_KEY: ${AI_PROVIDER_API_KEY}
    depends_on:
      db:
        condition: service_healthy
    command: ["node", "dist/index.js"]

  frontend:
    build:
      context: ./frontend
      target: runner
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      - backend
      - frontend

volumes:
  postgres_data:
```

### `docker-compose.dev.yml` (local development override)

```yaml
services:
  db:
    ports:
      - "5432:5432"   # expose DB for local tools (TablePlus, etc.)

  backend:
    build:
      target: builder
    volumes:
      - ./backend/src:/app/src   # hot reload via ts-node-dev
    command: ["pnpm", "dev"]
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development

  frontend:
    build:
      target: builder
    volumes:
      - ./frontend/src:/app/src
    command: ["pnpm", "dev", "--host"]
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:3000
```

Run dev: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`

---

## Dockerfile Patterns

### Backend (multi-stage)

```dockerfile
# Stage 1: builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build          # tsc → dist/

# Stage 2: runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Frontend (multi-stage)

```dockerfile
# Stage 1: builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build          # vite build → dist/

# Stage 2: runner
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

---

## NGINX Configuration

```nginx
upstream backend {
    server backend:3000;
}

server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
    }

    # API
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Environment Variables

See `docs/deployment/environment-variables.md` for the full reference.

All secrets are injected via environment variables — never baked into images. In production, secrets come from the cloud provider's secrets manager, not from a committed `.env`.

---

## Database Migrations on Deploy

Migrations run as a pre-start step, not inside the main container entrypoint:

```yaml
# in docker-compose.yml
backend:
  command: >
    sh -c "npx prisma migrate deploy && node dist/index.js"
```

This ensures migrations complete before the server accepts traffic.

---

## M-Pesa Callback Reachability

M-Pesa Daraja callbacks must reach `https://<your-domain>/api/v1/mpesa/callback` from Safaricom's IP allowlist. In dev, use a tunnel (ngrok / Cloudflare Tunnel) and register the tunnel URL with the sandbox app. NGINX rate limits and the Safaricom IP allowlist are both enforced before the callback handler runs.

---

## Production Hosting (Phase 4 TBD)

The Docker Compose setup is cloud-agnostic. Candidate platforms:
- **Fly.io** — simple deploys, free tier for early stage, regions in Africa coming online
- **AWS ECS + RDS** — managed containers + managed Postgres, more ops
- **DigitalOcean App Platform** — middle ground, mature in the region

Decision will be formalized in ADR-006 before Phase 4.

---

## Consequences

- All developers must have Docker Desktop installed.
- `.env` file required locally (copy from `.env.example`).
- No code runs outside Docker in production — prevents environment drift.
- CI pipeline builds Docker images to validate `Dockerfile` correctness on every PR.
- The M-Pesa tunnel setup is a documented onboarding step (see `docs/deployment/local-setup.md`).
