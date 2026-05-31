# Phase 1 — Foundation & Auth

**Status:** 🟡 In Progress
**Target Completion:** Q3 2026
**Dependencies:** None (this is the foundation).
**Status legend:** `⬜` not started · `🟡` in progress · `🟢` shipped · `~~strike~~` descoped (see vision-register).

---

## Objective

Establish a production-grade project scaffold and the creative-side empty shell. By end of Phase 1, a creative can clone the repo, run `docker compose up`, register an account, upload a logo, capture a type-to-sign signature, and land on a dark-mode dashboard that matches `kazipay_prototype.html` in its zero-project state.

No projects, no documents, no payments yet — those come in Phase 2 and 3.

---

## Deliverables

A new creative can, end-to-end:
1. **Sign up** — fill in the register form, receive an authenticated session.
2. **Configure brand** — upload a logo and capture a type-to-sign signature.
3. **See a dashboard** — dark-mode empty/zero state with a "Start your first project" CTA (the CTA itself is a placeholder; the wizard ships in Phase 2).

The deployable artifact is a Docker Compose stack that anyone with Docker Desktop can spin up locally in under 5 minutes from a clean clone.

---

## Non-Deliverables (Explicit Non-Goals)

These are tempting to scope-creep into Phase 1 but must wait:

- ❌ Project creation, document generation, signing — **Phase 2**
- ❌ M-Pesa or any real payment flow (Pro upgrade buttons can exist but route to a "Coming soon" page) — **Phase 3**
- ❌ WhatsApp / email sending — **Phase 3**
- ❌ AI document generation (no AI provider needed in Phase 1, not even stubbed) — **Phase 2**
- ❌ eTIMS, admin dashboard, background jobs — **Phase 4**

---

## Scope

### 1.1 — Monorepo Setup

- [ ] Initialize monorepo (`pnpm workspaces` or `turborepo`)
- [ ] `backend/` — Node.js + Express + TypeScript
- [ ] `frontend/` — Vite + React 18 + TypeScript
- [ ] Shared `tsconfig.base.json`
- [ ] ESLint + Prettier with shared config
- [ ] Husky pre-commit hooks (lint + typecheck)
- [ ] `.editorconfig` for cross-editor consistency

**Acceptance:** `pnpm lint` and `pnpm typecheck` pass on a clean clone.

---

### 1.2 — Docker Environment

- [ ] `Dockerfile` for backend (multi-stage: builder + runner)
- [ ] `Dockerfile` for frontend (multi-stage: builder + NGINX serve)
- [ ] `docker-compose.yml` with services:
  - `db` — PostgreSQL 15
  - `backend` — Express API
  - `frontend` — NGINX serving built React app
  - `nginx` — Reverse proxy routing `/api` → backend, `/` → frontend
- [ ] `.env.example` with all required variables documented
- [ ] `docker-compose.dev.yml` override for hot-reload dev mode
- [ ] Database volume persistence

**Acceptance:** `docker compose up` starts all services; `GET /api/health` returns `200`.

---

### 1.3 — Database Schema v1

- [ ] Prisma ORM configured with PostgreSQL provider
- [ ] Initial schema:
  - `users` — creative account holders (email, password_hash, full_name, profession, city, country, currency, created_at)
  - `user_sessions` — refresh token storage
  - `brand_settings` — one-to-one with users (logo_url, signature_image_url, signature_typed_name, business_name, business_address, kra_pin_optional)
  - `subscriptions` — plan state per user (`FREE` | `SINGLE_PROJECT` | `PRO`), `current_period_end`, `single_project_id?` (FK applied in Phase 2)
- [ ] Migration generated and committed
- [ ] Prisma seed script with demo profile (Rowlex Karimi, graphic designer, Nairobi)

**Acceptance:** `prisma migrate deploy` runs clean; seed populates the demo creative.

---

### 1.4 — Authentication System

- [ ] `POST /api/v1/auth/register` — create user + default `FREE` subscription
- [ ] `POST /api/v1/auth/login` — returns access token + sets refresh cookie
- [ ] `POST /api/v1/auth/refresh` — rotates access token via httpOnly cookie
- [ ] `POST /api/v1/auth/logout` — invalidates session
- [ ] `GET /api/v1/auth/me` — returns current user profile + subscription tier
- [ ] Passwords hashed with `bcrypt` (cost factor 12)
- [ ] Access token TTL: 15 minutes; Refresh token TTL: 7 days
- [ ] Auth middleware for protected routes

**Acceptance:** Full auth flow works end-to-end; expired tokens are rejected.

---

### 1.5 — Subscription State Model

- [ ] Roles defined: `USER` (creative), `SUPER_ADMIN` (KaziPay staff)
- [ ] Subscription tier exposed to frontend via `/auth/me`
- [ ] Feature-gate helper (`requireFeature('payment_reminders')`) reads subscription tier and throws `FEATURE_GATED` for Free
- [ ] No payment integration yet — tier can be promoted manually by SUPER_ADMIN for testing
- [ ] Frontend `useFeature(feature)` hook reads tier and toggles UI affordances

**Acceptance:** Switching a user's tier via admin API immediately changes which features they can call.

---

### 1.6 — Backend Foundations

- [ ] Centralized error handler middleware
- [ ] Request logging (Pino) with PII redaction
- [ ] Zod request validation middleware
- [ ] Health check endpoint `GET /api/health`
- [ ] Environment config validation on startup (zod)
- [ ] Graceful shutdown handling
- [ ] File upload handling (logo + signature image), stored to local volume in dev, S3-compatible in production

---

### 1.7 — Frontend Scaffold

- [ ] Vite + React 18 + TypeScript + TailwindCSS
- [ ] Manrope font loaded (all weights, self-hosted)
- [ ] Tailwind theme tokens: `#141414` background, `#D4F53C` lime, `#8B5CF6` purple
- [ ] Dark-mode creative theme as default; light-mode tokens reserved for client-facing surface (Phase 2)
- [ ] React Router v6 with route definitions in `src/routes.tsx`
- [ ] `@tanstack/react-query` configured with default stale time
- [ ] Zustand auth store (user, token, subscription tier, login/logout actions)
- [ ] Axios instance with auth header injection + refresh interceptor
- [ ] Base UI components: `Button`, `Input`, `Card`, `Modal`, `Spinner`, `Badge`
- [ ] Layout components: `AppLayout` (top nav, no sidebar), `AuthLayout`
- [ ] Inline SVG icon set (no CDN, no icon font)

---

### 1.8 — Auth UI

- [ ] Login page (`/login`)
- [ ] Register page (`/register`) — collects name, email, password, profession (dropdown: graphic designer, photographer, videographer, illustrator, copywriter, other), city
- [ ] Password reset flow (`/forgot-password`, `/reset-password`)
- [ ] Protected route wrapper (redirect to `/login` if unauthenticated)
- [ ] Post-login redirect to dashboard
- [ ] Copy uses the KaziPay tone (direct, warm, Nairobi-first; "Karibu" greeting on register success is welcome)

---

### 1.9 — Dashboard Zero-State + Brand Settings

- [ ] Dashboard route renders the empty/zero-project state with a clear "Start your first project" CTA (project wizard itself ships in Phase 2 — for now the button can route to a placeholder)
- [ ] Top nav with Dashboard / Projects / Settings entries
- [ ] Brand Settings page:
  - Logo upload (PNG/SVG, max 2MB, preview)
  - Type-to-sign signature capture (types name in any signature font, renders as PNG, stored on user)
  - Business name, optional KRA PIN, business address fields
  - "Save" persists via `PUT /api/v1/brand-settings`
- [ ] Settings page links to brand settings and "Manage subscription" (Phase 3 disables this)

---

### 1.10 — CI Pipeline

- [ ] GitHub Actions workflow on PR:
  - Lint check
  - TypeScript typecheck
  - Unit tests
  - Docker build check
- [ ] Status checks required before merge to `main`

---

## Definition of Done

Each of these must be **verifiable end-to-end**, not just code-complete:

- [ ] `git clone` → `cp .env.example .env` → `docker compose up` → working stack in under 5 minutes on a clean machine.
- [ ] `GET /api/health` returns `200` with a timestamp.
- [ ] A new account can be registered via the UI, logged out, and logged back in.
- [ ] Refresh-token rotation verified: an old refresh token is rejected after a successful refresh.
- [ ] An expired access token triggers a silent refresh via the Axios interceptor without user-visible disruption.
- [ ] Brand settings persist: upload a logo + capture signature → refresh page → both present.
- [ ] Subscription tier appears in `/auth/me` response and the frontend `useFeature` hook reflects it.
- [ ] Dashboard renders the dark theme (`#141414` bg, `#D4F53C` + `#8B5CF6` accents, Manrope font) and shows the zero-project state.
- [ ] CI is green on `main`: lint, typecheck, unit tests, Docker build all pass.
- [ ] Peer review sign-off on the auth implementation (ADR-002 conformance, bcrypt cost, cookie flags, rate limits).
- [ ] `docs/dev-roadmap.md` and this milestone document are updated per the Documentation Rules in `AGENTS.md`.
