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
- [x] **Onboarding page (`/onboarding`)** — `src/pages/onboarding/OnboardingPage.tsx`, `src/components/features/onboarding/OnboardingForm.tsx`. Captures profession (6-option dropdown: Graphic Designer, Photographer, Videographer, Illustrator, Copywriter, Other) and city. Backed by a separate `POST /api/v1/users/me/onboarding` endpoint via `user.service.ts`. Flips `user.onboardingComplete` to true and redirects to `/dashboard`.
- [x] **OnboardingGate** — `src/components/features/onboarding/OnboardingGate.tsx`. Outlet wrapper that nests inside `<ProtectedRoute>` and redirects to `/onboarding` when `user.onboardingComplete !== true`. Wraps the creative subtree (dashboard/projects/settings). `/onboarding` itself sits ABOVE the gate so users can actually reach it without infinite-redirecting.
- [x] Password reset flow — `src/pages/auth/{ForgotPasswordPage,ResetPasswordPage}.tsx`, paired forms. Forgot-password returns generic success regardless of email validity (per ADR-002 — no enumeration). Reset reads `?token=` from URL.
- [x] Protected route wrapper — `src/components/features/auth/ProtectedRoute.tsx`. Uses react-router-v6 `<Outlet />` pattern; wraps the creative subtree in `routes.tsx`. Preserves intended destination on `location.state.from` for post-login redirect.
- [x] Post-login redirect — `useLogin` / `useRegister` hooks navigate to `/onboarding` when `user.onboardingComplete === false`, else to `/dashboard`. Shared `postAuthDestination(user)` helper keeps them in sync. `useCompleteOnboarding` navigates to `/dashboard` on success.
- [x] Copy uses the KaziPay tone — "Karibu — sign in", "Create your account · Free to start", "Karibu, [name] 👋 · Just two quick questions" (onboarding), "Choose a new password · Pro tip: a short phrase beats a random string of symbols every time", etc.
- [x] Sign-out affordance — added to `CreativeLayout` top nav so the auth gate is testable end-to-end without DevTools.
- [x] `Select` UI primitive added — `src/components/ui/Select.tsx`, native `<select>` styled to match `Input`. Chosen over a custom dropdown for accessibility + mobile system-picker UX (per CLAUDE.md mobile-first rule). Used by the onboarding form's profession picker.
- [x] Axios silent-refresh wired — `lib/api.ts` now calls `/auth/refresh` on 401 with an `x-skip-refresh` header to prevent the refresh call itself from looping. Same-origin baseURL (`/api/v1`) so MSW (a service worker) can intercept.
- [x] MSW handlers — `src/mocks/handlers/auth.handlers.ts` covers login, register, logout, refresh, me, forgot-password, reset-password, **and the new `POST /users/me/onboarding`**. Demo creative is Rowlex Karimi per CLAUDE.md (`rowlex@demo.kazi.pay` / `Demo1234!`) and ships with `onboardingComplete: true` so signing in goes straight to dashboard; new accounts get `false` and bounce to onboarding.
- [x] Tests (22 total across 6 files) — `auth.service.test.ts` (login/register/forgot/reset/me cases), `user.service.test.ts` (completeOnboarding success + 401-without-token), `ProtectedRoute.test.tsx`, `OnboardingGate.test.tsx` (redirects when incomplete, renders when complete, no-op when not signed in), `LoginForm.test.tsx`, `money.test.ts`.

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
