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

**Status:** 🟡 In progress (baseline `db` service shipped; backend/frontend/nginx Dockerfiles deferred)

- [ ] `Dockerfile` for backend (multi-stage: builder + runner) — _deferred; backend runs locally via `pnpm dev` for Phase 1, containerised in Phase 4 prep_
- [ ] `Dockerfile` for frontend (multi-stage: builder + NGINX serve) — _deferred to Phase 4_
- [x] `docker-compose.yml` with `db` (PostgreSQL 16) service · `localhost:5432` exposed for dev tools · healthcheck · named volume for persistence (`kazipay_postgres_data`)
- [x] Root `.env.example` documenting `DB_NAME`/`DB_USER`/`DB_PASSWORD` (consumed by compose)
- [ ] `docker-compose.dev.yml` override — not needed yet; backend runs outside Docker in Phase 1
- [x] Database volume persistence — named volume survives `docker compose down`; only `down -v` wipes data

**Implementation notes:**
- Phase 1 use case is "dev-time Postgres without installing it on your laptop". A full containerised stack (backend + frontend + NGINX) is overkill while everything's still iterating — pushed to Phase 4 prep per ADR-005.
- `docker compose up -d db` starts just Postgres; backend + frontend run locally via `pnpm dev` for hot reload.

**Acceptance:** `docker compose up -d db` starts the DB; `pg_isready` healthcheck flips to healthy within ~5s.

---

### 1.3 — Database Schema v1

**Status:** 🟡 In progress (schema + seed shipped; initial migration generated on first `prisma:migrate` run)

- [x] Prisma ORM configured with PostgreSQL provider — `backend/prisma/schema.prisma`
- [x] Initial schema (consolidated since the original list — brand and subscription fields collapsed onto `users` for simplicity, no separate tables yet):
  - `users` — email, password_hash, full_name, **email_verified**, profession, city, **business_name, kra_pin?, business_address?**, country, currency, **plan (enum)**, **onboarding_complete**, timestamps
  - `user_sessions` — opaque refresh-token hash, expires_at, revoked_at, ip_address?, user_agent?, last_used_at (per ADR-002)
  - `email_verification_tokens` — one-time tokens for the verify-email flow
  - `password_reset_tokens` — one-time tokens for the forgot-password flow
- [x] Prisma seed script — `backend/prisma/seed.ts` seeds Rowlex Karimi (verified + onboarded) and Amina Otieno (`test@demo.kazi.pay`, verified + NOT onboarded). Idempotent (`upsert`).

**Implementation notes:**
- **Brand + subscription fields live on `users`, not separate tables.** The original milestone proposed `brand_settings` and `subscriptions` tables. Collapsed into the users table for Phase 1 simplicity — there's a 1:1 relationship and no lifecycle of their own yet. If subscription history (billing periods, plan changes over time) ever becomes a concern, that's a clean migration in Phase 3 alongside payment integration.
- **Tokens are stored hashed, never plaintext.** Same sha256 pattern as `user_sessions`. The raw token rides on email or cookies; lookups hash the incoming value.
- **Migration files are committed.** Created on first `pnpm --filter @kazipay/backend prisma:migrate` run; tracked under `backend/prisma/migrations/`.

**Acceptance:** `pnpm --filter @kazipay/backend prisma:migrate` applies cleanly; `pnpm prisma:seed` populates the two demo users without duplicates on re-run.

---

### 1.4 — Authentication System

**Status:** 🟡 In progress (full auth stack landed; awaits manual end-to-end smoke test post-merge)

- [x] `POST /api/v1/auth/register` — creates user with `emailVerified: false`, `onboardingComplete: false`, plan `FREE`; emits verification token via `EmailService` (logs link to console in dev). Returns 202 with email + ack message (no session until verified).
- [x] `POST /api/v1/auth/verify-email` — consumes the token, flips `emailVerified` to true. 400 `INVALID_VERIFY_TOKEN` on bad/expired tokens.
- [x] `POST /api/v1/auth/resend-verification` — no-enumeration (always 200); re-issues a fresh token + sends email if the address is registered + unverified.
- [x] `POST /api/v1/auth/login` — verifies password (bcrypt), refuses unverified accounts with 403 `EMAIL_NOT_VERIFIED`. Returns user + access token in body; sets refresh-token httpOnly cookie.
- [x] `POST /api/v1/auth/refresh` — reads refresh-token cookie, rotates (revoke old → mint new), returns new access token. Detects stolen tokens: reuse of a revoked refresh token revokes **every** active session for that user.
- [x] `POST /api/v1/auth/logout` — revokes the current refresh session, clears the cookie.
- [x] `GET /api/v1/auth/me` — returns the current user from `/auth/me` (calls Prisma; doesn't trust the JWT alone — reflects latest DB state).
- [x] `POST /api/v1/auth/forgot-password` / `/reset-password` — same one-time-token pattern as email verification. Reset revokes all active sessions (forces re-login on all devices).
- [x] Passwords hashed with `bcrypt` (cost factor 12) — `backend/src/lib/passwords.ts`
- [x] Access token: RS256 JWT, default 15-min TTL (env-tunable). Refresh token: opaque 32-byte random, default 7-day TTL.
- [x] Auth middleware `requireUser` — `backend/src/middleware/require-user.ts` — verifies JWT and attaches `req.user`.
- [x] Rate limiting (`express-rate-limit`) on login/register/forgot/reset/resend — env-tunable window + max.

**Implementation notes:**
- **JWT keys auto-generate in dev.** On first boot, if no `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` env vars are set and no keys exist in `backend/.keys/`, the backend generates an RS256 keypair and writes it to disk (mode 0o600, gitignored). Keys persist across restarts so sessions don't break on every `tsx watch` reload. Production injects keys via secrets manager.
- **Refresh-token cookie path is scoped to `/api/v1/auth`.** The browser only sends the cookie on auth endpoints, not on every request. Reduces leak surface.
- **Stolen-token detection wired up.** If a refresh token is presented but has already been revoked (rotation logs ✓ → reuse implies the old token leaked somewhere), the service revokes every active session for that user. Their access tokens still work until they expire (≤15 min) but they can't refresh — force a re-login.
- **No-enumeration enforced server-side** on `forgot-password` and `resend-verification`: always 200 regardless of whether the email exists. Logs reveal which were real, response doesn't.

**Acceptance:** End-to-end flow against the real backend: register → backend logs verification link → click link → land on /verify-email → click sign-in → land on /onboarding → finish wizard → land on /dashboard. All seeded users (Rowlex + Amina) work as documented.

---

### 1.5 — Subscription State Model

**Status:** 🟡 In progress (plan field + selection in wizard shipped; feature-gate plumbing still ahead of features that need gating)

- [x] `plan` column on `users` table — `SubscriptionPlan` enum (`FREE` | `SINGLE_PROJECT` | `PRO`)
- [x] Plan selectable during onboarding wizard (Phase 1.8 step 4). All three options offered; backend sets the tier without taking payment.
- [x] Plan exposed via `/auth/me` (returned with the full user object); included as a claim in the JWT (`plan`) so feature gates can read it without a DB round-trip.
- [x] No payment yet — paid plans set the tier but real M-Pesa charge happens in Phase 3.
- [ ] SUPER_ADMIN role + admin endpoint to flip tier manually — deferred to Phase 4 admin dashboard. For now, plan is set during onboarding and via `db:reset && prisma:seed` cycles.
- [ ] Server-side `requireFeature('payment_reminders')` helper — deferred until there are actual feature gates (Phase 3 reminders, Phase 2 doc limits).
- [ ] Frontend `useFeature(feature)` hook — same deferral. Today the only enforcement point is what the user sees on the dashboard; that's all driven by the wizard's free-tier copy.

**Implementation notes:**
- **Phase 1 records the choice; later phases enforce it.** The plumbing — column, claim, exposure — is in place. Actual feature gates land alongside the features that need gating (Free-tier project cap is a Phase 2 deliverable; AI reminders are Phase 3).
- **No SUPER_ADMIN today.** Hardcoded into Phase 4's admin dashboard milestone instead — we don't have an admin UI to consume the role yet.

**Acceptance:** A user signing up and picking "Pro" in the wizard has `plan: PRO` in `/auth/me` afterward; the same value appears in the JWT.

---

### 1.6 — Backend Foundations

**Status:** 🟡 In progress (full scaffold + middleware landed; file upload deferred to Phase 1.9 alongside the Settings UI that uses it)

- [x] Centralized error handler middleware — `backend/src/middleware/error-handler.ts` (AppError → status+envelope; ZodError → 400 VALIDATION_ERROR; everything else → 500 with stack redacted in prod)
- [x] Logger (Pino) with PII redaction — `backend/src/lib/logger.ts` (redacts password, token, kraPin, msisdn, etc.). Pretty-printed in dev via pino-pretty, JSON in prod.
- [x] Zod request validation middleware — `backend/src/middleware/validate.ts` (parses + replaces `req.body`; errors fall through to the central error handler as VALIDATION_ERROR with field-level details)
- [x] Health check endpoint — `GET /api/v1/health`
- [x] Environment config validation on startup — `backend/src/config/env.ts` (zod schema; fails fast with field-level errors if anything required is missing)
- [x] Graceful shutdown handling — `backend/src/index.ts` handles SIGINT/SIGTERM, closes HTTP server, disconnects Prisma, hard-kills after 10s
- [x] Layered architecture per AGENTS.md — `routes → controllers → services → repositories → Prisma`. Dependency rule respected; controllers stay thin.
- [x] Vitest as the backend test runner (not Jest as originally planned). One test runner across the monorepo means one mental model. Updated this file accordingly.
- [ ] File upload handling — deferred to Phase 1.9 (logo upload is the first consumer; no other endpoint needs file uploads in Phase 1.4 auth scope)

**Implementation notes:**
- **CORS configured** for the Vite dev origin (`http://localhost:5173`) plus comma-separated `CORS_ORIGINS` env var for LAN/staging hosts. `credentials: true` so the httpOnly refresh cookie flows.
- **`trust proxy: 1`** so `req.ip` works correctly behind the Vite dev proxy (and the future NGINX in prod).
- **Rate limiting** with `express-rate-limit` applied to the abuse-prone `/auth/*` endpoints. Env-tunable (`RATE_LIMIT_WINDOW_MS`, `AUTH_RATE_LIMIT_MAX`).
- **Smoke tests only.** Vitest covers `lib/passwords` (hash + verify roundtrip, salt randomness) and `lib/jwt` (sign + verify roundtrip, tampering rejection, refresh-token shape). Integration tests against a test DB are a follow-up.

---

### 1.7 — Frontend Scaffold

**Status:** 🟡 In progress (scaffold landed; awaiting first install + dev-server smoke test)

- [x] Vite + React 19 + TypeScript 6 + TailwindCSS 4 — `frontend/{vite.config.ts, tsconfig.json, eslint.config.js, index.html, src/main.tsx, src/App.tsx, src/index.css}`
- [x] Manrope font loaded (all weights, self-hosted) — via `@fontsource/manrope` imported in `src/index.css`
- [x] Tailwind theme tokens — `frontend/src/index.css` `@theme` block (extracted from all three prototypes; see file header comment for source mapping). Both dark and light theme tokens included.
- [x] Dark-mode creative theme + light-mode client tokens — both shipped together since the light tokens are tiny additions and avoid a follow-up rebuild when Phase 2.7 lands.
- [x] React Router v6 with route definitions — `src/routes.tsx` (placeholder pages per surface)
- [x] `@tanstack/react-query` configured — `src/lib/query-client.ts` with KaziPay-specific defaults (30s stale, no focus refetch on client surface, no mutation retries)
- [x] Zustand auth store — `src/store/auth.store.ts` (skeleton; populated in Phase 1.8)
- [x] Axios instance with auth header injection + refresh interceptor — `src/lib/api.ts` (refresh stubbed until backend /auth/refresh lands in Phase 1.4)
- [x] Base UI components — `src/components/ui/{Button,Input,Card,Badge,Checkbox,Modal,Spinner}.tsx`
- [x] Layout components — `src/layouts/{CreativeLayout,ClientLayout,AuthLayout}.tsx`
- [x] Inline SVG icon set — `src/components/ui/icons.tsx` (18 icons; add more as screens need them)
- [x] **MSW (Mock Service Worker) wired** — `src/lib/msw.ts` + `src/mocks/{browser,handlers}.ts`. Dev-only; lazy-imported so it doesn't ship in production. Real handlers added alongside each screen.

**Implementation notes (kept for future agents):**

- Monorepo confirmed as the layout. Root: `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`, `.editorconfig`, `.gitignore`, `.nvmrc`, `.prettierrc`. Backend folder is a placeholder (`backend/package.json` with no-op scripts) — implemented in §§ 1.1–1.6.
- **Sidebar conflict resolved in favour of CLAUDE.md.** `kazipay_prototype.html` renders a 220px sidebar; CLAUDE.md says "no sidebar — top nav only". The React `CreativeLayout` uses a top nav. The prototype is reference for visuals only — that decision is documented inline in `src/layouts/CreativeLayout.tsx`.
- **CDN conflict resolved in favour of CLAUDE.md.** Prototypes pull Manrope from Google Fonts and `kazipay_prototype.html` pulls Tabler icons. Both replaced — Manrope is self-hosted via `@fontsource/manrope`; icons are inline SVG in `src/components/ui/icons.tsx`.
- **Two-theme strategy.** Tailwind 4 `@theme` block in `src/index.css` holds both dark (`--color-dark-*`) and light (`--color-light-*`) token namespaces. Theme is set per-route by the layout via `document.documentElement.dataset.theme`. The `:focus-visible` ring uses lime since it has acceptable contrast on both `#141414` and `#F6F6F4`.
- **Type strictness above the AGENTS.md baseline.** `tsconfig.base.json` enables `noUncheckedIndexedAccess`, `noImplicitOverride`, and `noFallthroughCasesInSwitch`. These caught no issues in scaffold code; if they slow down feature work the team can revisit.
- **MSW pattern.** Worker lazy-imported in `lib/msw.ts` so production bundle doesn't carry it. `msw init public/` must be run once after `pnpm install` to generate `public/mockServiceWorker.js` (gitignored — runtime artifact, not source). README documents this.
- **Money helper + smoke test landed.** `src/utils/money.ts` formats integer KES cents per ADR-003/-004; `money.test.ts` proves Vitest is wired.
- **Post-scaffold dep refresh (2026-05-31, `fix/update-packages`).** Took every major-version Dependabot PR in a single branch since no real screens exist yet (small blast radius). React 18→19, TypeScript 5→6, Vite 5→8, Vitest 2→4, Tailwind 3→4, ESLint 8→10, zustand 4→5, jsdom 24→29, plus paired @types and plugin bumps. Two config-format migrations were required: Tailwind 3 `tailwind.config.ts` → Tailwind 4 `@theme` block in `src/index.css` (plus `@tailwindcss/vite` plugin, dropped `postcss.config.js` + `autoprefixer` + `postcss`); ESLint 8 `.eslintrc.cjs` → ESLint 9+ `eslint.config.js` flat config (plus combined `typescript-eslint` package). Utility class names in components unchanged. Also dropped a stray `frontend/package-lock.json` Dependabot had created (this is a pnpm project) and added it to `frontend/.gitignore`.
- **Out of scope for 1.7 (intentional, per the phase's Non-Deliverables block):** no real screens, no API integration, no Docker, no backend code.

---

### 1.8 — Auth UI

**Status:** 🟡 In progress (full flow + tests landed on `feature/phase-1.8-auth-ui`; awaits prerequisite PRs landing for CI to be green)

- [x] Login page (`/login`) — `src/pages/auth/LoginPage.tsx`, `src/components/features/auth/LoginForm.tsx`
- [x] Register page (`/register`) — `src/pages/auth/RegisterPage.tsx`, `src/components/features/auth/RegisterForm.tsx`. Collects only the **minimum**: full name, email, password. Country auto-set to Kenya, currency to KES. Profession + city are deferred to the dedicated onboarding step.
- [x] **Email verification flow** — `/verify-email` page + `VerifyEmailFlow` component handling three arrival states: (a) just-registered with email in router state → "check your inbox" + resend; (b) link from email with `?token=` → auto-verify on mount with success/error UI; (c) bare URL bar → generic prompt with resend. MSW logs verification tokens to the console in dev so testers can grab them. Login is blocked for unverified accounts (returns `EMAIL_NOT_VERIFIED`); LoginForm bounces those to `/verify-email`.
- [x] **Onboarding wizard (`/onboarding`)** — `src/pages/onboarding/OnboardingPage.tsx` is the state machine; renders a 4-step wizard with progress indicator and per-step components under `src/components/features/onboarding/`. Steps: **Profile** (profession + city) → **Business** (business name, prefilled from full name) → **Brand** (KRA PIN + business address, both optional with a Skip button) → **Plan** (Free / Single Project / Pro selection via `PlanCard` components). Final submit hits `POST /api/v1/users/me/onboarding` via `user.service.ts`. Flips `user.onboardingComplete` to true and redirects to `/dashboard`.
- [x] **OnboardingLayout** — `src/layouts/OnboardingLayout.tsx`. Full-page dark layout with a sticky top bar (KaziPay wordmark + "Finish later" sign-out button) and a centered max-w-3xl content area. Distinct from `AuthLayout`'s centered card so onboarding feels like a richer welcome experience.
- [x] **OnboardingProgress** — `src/components/features/onboarding/OnboardingProgress.tsx`. Horizontal 4-pill indicator with done/current/upcoming states; check icon fills the dot for completed steps; lime fill for current; muted for upcoming. Step labels show on md+ screens.
- [x] **PlanCard** — `src/components/features/onboarding/PlanCard.tsx`. Selectable card with name, price, period, feature checklist (lime check icons), and optional "Recommended" / "Selected" pill in the corner. Paid plans render a note about deferred payment (Phase 3 M-Pesa).
- [x] **OnboardingGate** — `src/components/features/onboarding/OnboardingGate.tsx`. Outlet wrapper that nests inside `<ProtectedRoute>` and redirects to `/onboarding` when `user.onboardingComplete !== true`. Wraps the creative subtree (dashboard/projects/settings). `/onboarding` itself sits ABOVE the gate so users can actually reach it without infinite-redirecting.
- [x] **Second seeded user** — `TEST_USER` in MSW (`test@demo.kazi.pay` / `Test1234!`, "Amina Otieno"). Pre-verified but NOT onboarded. Lets testers exercise the full onboarding wizard end-to-end without re-registering and re-going-through verify-email each session. Original `DEMO_USER` (Rowlex) stays as the verified+onboarded user for dashboard testing.
- [x] Password reset flow — `src/pages/auth/{ForgotPasswordPage,ResetPasswordPage}.tsx`, paired forms. Forgot-password returns generic success regardless of email validity (per ADR-002 — no enumeration). Reset reads `?token=` from URL.
- [x] Protected route wrapper — `src/components/features/auth/ProtectedRoute.tsx`. Uses react-router-v6 `<Outlet />` pattern; wraps the creative subtree in `routes.tsx`. Preserves intended destination on `location.state.from` for post-login redirect.
- [x] Post-register redirect — `useRegister` no longer creates a session; navigates to `/verify-email` with the email in router state so the user sees a personalised "check your inbox" screen.
- [x] Post-login redirect — `useLogin` honours `user.onboardingComplete` (→ `/dashboard` if true, `/onboarding` if false) via the shared `postAuthDestination(user)` helper. `EMAIL_NOT_VERIFIED` responses redirect to `/verify-email` instead of showing a generic "wrong credentials" error.
- [x] `useCompleteOnboarding` navigates to `/dashboard` on success (final submit of the wizard).
- [x] Copy uses the KaziPay tone — "Karibu — sign in", "Create your account · Free to start", "Karibu, [name] 👋 · Let's set up your account so KaziPay can do its thing. Should take about a minute." (wizard header), "Free is enough to take your first project all the way to paid" (plan step), "Choose a new password · Pro tip: a short phrase beats a random string of symbols every time", etc.
- [x] Sign-out affordance — added to `CreativeLayout` top nav so the auth gate is testable end-to-end without DevTools.
- [x] `Select` UI primitive added — `src/components/ui/Select.tsx`, native `<select>` styled to match `Input`. Chosen over a custom dropdown for accessibility + mobile system-picker UX (per CLAUDE.md mobile-first rule). Used by the onboarding form's profession picker.
- [x] Axios silent-refresh wired — `lib/api.ts` now calls `/auth/refresh` on 401 with an `x-skip-refresh` header to prevent the refresh call itself from looping. Same-origin baseURL (`/api/v1`) so MSW (a service worker) can intercept.
- [x] MSW handlers — `src/mocks/handlers/auth.handlers.ts` covers login, register, **verify-email**, **resend-verification**, logout, refresh, me, forgot-password, reset-password, and `POST /users/me/onboarding` (accepts the full wizard payload: profile + business + brand + plan). Two seeded users: DEMO_USER (`rowlex@demo.kazi.pay` / `Demo1234!`, verified + onboarded → dashboard) and TEST_USER (`test@demo.kazi.pay` / `Test1234!`, verified + NOT onboarded → wizard).
- [x] Tests (26 total across 6 files) — `auth.service.test.ts` (login/register/verifyEmail/forgot/reset/me/resendVerification), `user.service.test.ts` (completeOnboarding with full payload + with optional fields skipped + 401-without-token), `ProtectedRoute.test.tsx`, `OnboardingGate.test.tsx` (redirects when incomplete, renders when complete, no-op when not signed in), `LoginForm.test.tsx`, `money.test.ts`.

**Implementation notes:**

- **Forms use uncontrolled inputs + native HTML5 validation** (`required`, `type="email"`, `minLength={8}`). No new dep (react-hook-form, zod, etc.) added. If forms get materially more complex in Phase 2, switch to react-hook-form + zod via an ADR.
- **Why registration is bare-minimum.** Registration's job is "create an account". Anything else — what kind of creative you are, where you're based, eventually your logo and signature — belongs to "tell us who you are" (onboarding) or "set up your brand" (Settings, Phase 1.9). Mixing them turned registration into a survey and bounced users at the worst possible moment (the form). The split keeps signup ≤ 3 fields and gives onboarding the visual room to feel like a welcome, not a tax form.
- **Two route gates, two concerns.** `ProtectedRoute` = "are you authenticated?" → redirect to `/login`. `OnboardingGate` = "have you finished telling us who you are?" → redirect to `/onboarding`. They nest, never collide. `/onboarding` itself sits inside `ProtectedRoute` but ABOVE `OnboardingGate` — otherwise an incomplete user navigating to `/onboarding` would infinite-redirect. Documented inline in both files.
- **Backend must enforce onboarding too.** Per Cross-Surface Rules in `AGENTS.md`, the backend (Phase 1.4+) must refuse to create/return projects, documents, payments, etc. for accounts with `onboardingComplete: false`. The frontend gates are UX only — never trust them for data security.
- **Sign-out lives in CreativeLayout, not on a dedicated route.** Calling `useLogout()` clears the auth store, clears the React Query cache, and navigates to `/login`. The cache clear matters — stale per-user data must not be visible to the next signed-in user.
- **No-enumeration on forgot-password** is enforced both ways: the MSW handler always returns success, and the form shows the same "if an account exists" message even on transport failure. Per ADR-002.
- **MSW handlers split by domain.** `src/mocks/handlers/` is the new home; `src/mocks/handlers.ts` is the composition root. Adding new domains (projects, payments) means adding a file under `handlers/` and importing it into the root array.
- **`useCurrentUser` is implemented but not yet wired into `<App>` boot.** When wired (small Phase 1.8 follow-up or part of 1.9), it restores the session on page refresh: calls `/auth/me`, lets the Axios interceptor's silent-refresh attempt run if the access token is missing, and either authenticates or stays logged-out cleanly.
- **CI dependency:** this PR is based on `main` per the workflow rule, so CI will be red until `fix/ci-workflow-errors` merges AND `pnpm-lock.yaml` is committed. The Phase 1.8 code itself doesn't depend on those — it just can't be verified green in CI until they land.
- **Out of scope for 1.8:** brand settings UI (1.9), dashboard data (1.9 + Phase 2), real `/auth/me` bootstrap call on app mount (small follow-up).

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

### 1.10 — CI Pipeline & Security

**Status:** 🟡 In progress (all workflows + Dependabot + branch-protection guide landed on `feature/phase-1.10-ci-and-security`. CI itself won't go green until `feature/phase-1.7-frontend-scaffold` merges first — see PR description.)

- [x] GitHub Actions CI workflow (`.github/workflows/ci.yml`):
  - [x] Lint check (`pnpm lint`, ESLint `--max-warnings 0`)
  - [x] TypeScript typecheck (`pnpm typecheck`)
  - [x] Unit tests (`pnpm test`, Vitest)
  - [x] Build (`pnpm build`)
- [x] Docker build check (`.github/workflows/docker.yml`) — guarded by `hashFiles('<path>/Dockerfile')` so it shows as skipped (not failed) until Phase 1.2 lands the Dockerfiles
- [x] CodeQL static analysis (`.github/workflows/codeql.yml`) — every PR + weekly Mon 06:00 UTC, `security-and-quality` query set
- [x] Gitleaks secret scan (`.github/workflows/gitleaks.yml`) — every PR + push to main
- [x] Dependabot weekly updates (`.github/dependabot.yml`) — npm (root + workspaces), github-actions, docker (frontend + backend). Mon 06:00 EAT. Patch + minor grouped per ecosystem.
- [x] Pull request template (`.github/pull_request_template.md`) — workflow checklist + Documentation Rules checklist + test plan + breaking-changes prompt
- [x] CODEOWNERS placeholder (`.github/CODEOWNERS`) — commented out until real owners are assigned
- [x] CI & security reference (`docs/deployment/ci-and-security.md`)
- [x] Main branch-protection guide (`docs/deployment/main-branch-protection.md`)
- [ ] **Required status checks configured in GitHub UI** — manual one-time step by a repo admin; follow `docs/deployment/main-branch-protection.md`. Can't be done in YAML.

**Implementation notes:**
- All workflows use `paths` filters so docs-only and `.github/`-only PRs don't trigger code-level CI (those PRs are reviewed visually). This means the very PR landing the CI doesn't trigger its own CI, by design — honest.
- CI will fail on the first PR that adds `package.json` to `main` if `pnpm-lock.yaml` isn't committed alongside it. Phase 1.7's PR includes the lockfile — verify before merge.
- Dependabot npm uses native pnpm support (added 2024); pnpm-lock.yaml is treated correctly as the lockfile source.
- Gitleaks-action is free for personal accounts and public repos. If the repo becomes an organization-owned private repo later, add `GITLEAKS_LICENSE` as a repo secret and uncomment the matching line in `gitleaks.yml`. Documented in the branch-protection guide.
- CodeQL uses the `security-and-quality` query set (broader than the default `security-extended`). Scan time is acceptable given codebase size; revisit if it grows past 30 minutes per run.
- Branch protection itself **cannot be configured in YAML** in non-org repos (org-level Rulesets are YAML-able but require an org plan). The guide documents the GitHub UI clicks step-by-step plus how to verify the protection actually works.
- Concurrency groups cancel in-progress runs when a new commit lands on the same branch — saves CI minutes during iterative pushes.
- All workflows have `permissions: contents: read` (or the minimum required) instead of inheriting the default token. Minimises blast radius if a transitive dep is compromised.

**Deliberately not in scope here:**
- Bundle-size budget enforcement — Phase 4.5 prep
- a11y check (axe / pa11y) — Phase 1.9+ when real screens exist
- Playwright E2E — Phase 4.4
- `npm audit` hard-fail on high/critical CVEs — too noisy at current dep tree size; relying on Dependabot security PRs instead

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
