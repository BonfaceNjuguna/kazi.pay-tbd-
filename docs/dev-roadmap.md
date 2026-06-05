# KaziPay — Development Roadmap

> **For AI agents:** Read this to understand current progress before working on any task.
> For product context, read [`CLAUDE.md`](../CLAUDE.md).
> For coding rules and documentation rules, read [`AGENTS.md`](../AGENTS.md).
> For each phase's full scope, see `docs/milestones/`.
> For the lifecycle of every feature vision (proposed → milestone → shipped), see [`docs/vision-register.md`](./vision-register.md).

---

## Current Status

**Active Phase:** Phase 1 — Foundation & Auth
**Last Updated:** 2026-05-30
**Overall Progress:** 🟡 In Planning

Three standalone HTML prototypes are in place at the project root (`kazipay_landing.html`, `kazipay_prototype.html`, `kazipay_client.html`). Phase 1 turns those prototypes into a real application.

---

## Status Legend

Used in this file, in every milestone document, and in `docs/vision-register.md`. Update inline as work progresses.

| Symbol | Meaning |
|--------|---------|
| `⬜` | Not started |
| `🟡` | In progress (code merged but not yet verified end-to-end) |
| `🟢` | Shipped (verified end-to-end, Definition of Done met) |
| `~~strike~~` | Descoped — reason recorded in `docs/vision-register.md` |

Per the **Documentation Rules** in `AGENTS.md`, the PR that lands code also updates the status here and in the relevant milestone doc.

---

## Phase Overview

| Phase | Name | Status | Target | Coded | Verified |
|-------|------|--------|--------|-------|----------|
| 1 | Foundation & Auth | 🟡 In Progress | Q3 2026 | ~90% (1.1 + 1.2 + 1.3 + 1.4 + 1.5 + 1.6 + 1.7 + 1.8 + 1.10) | 0% |
| 2 | Projects, Documents & Signing | ⬜ Pending | Q4 2026 | 0% | 0% |
| 3 | Payments, WhatsApp & Pro Tier | ⬜ Pending | Q1 2027 | 0% | 0% |
| 4 | eTIMS, Polish & Launch | ⬜ Pending | Q2 2027 | 0% | 0% |

---

## Phase 1 — Foundation & Auth

**Goal:** Working monorepo with auth, brand settings, and the empty creative dashboard. A creative can sign up, configure their brand (logo + signature), and land on a zero-state dashboard.

**Headline deliverables:** sign-up + login, brand settings (logo + type-to-sign signature), dark-mode dashboard shell, dockerised local stack, CI pipeline.

**Non-deliverables:** no project creation, no documents, no AI, no M-Pesa, no WhatsApp. ([full list in milestone doc](./milestones/phase-1-foundation.md#non-deliverables-explicit-non-goals))

### Milestones (status updated as code lands)
- 🟢 1.1 Monorepo setup _(workspace + tooling done; backend filled out in 1.6)_
- 🟡 1.2 Docker environment _(Postgres `db` service shipped; backend/frontend/NGINX containers deferred to Phase 4 prep)_
- 🟡 1.3 Database schema v1 _(Prisma schema with users, user_sessions, email_verification_tokens, password_reset_tokens; brand + subscription fields collapsed onto users for Phase 1; seed for Rowlex + Amina)_
- 🟡 1.4 Authentication system _(register, verify-email, resend, login, refresh-rotation with stolen-token detection, logout, me, forgot/reset password; RS256 JWT + bcrypt 12; rate-limited)_
- 🟡 1.5 Subscription state model _(plan column + selectable during onboarding + exposed in /auth/me and JWT claim; feature-gate helpers land alongside the features that need them in Phase 2/3)_
- 🟡 1.6 Backend foundations _(Express 5 + TS6 + zod + Pino + error handler + validate middleware + graceful shutdown + Vitest smoke tests; file upload deferred to Phase 1.9)_
- 🟡 1.7 Frontend scaffold _(Vite + Tailwind + tokens + Manrope + routes + UI primitives + MSW shipped — see milestone doc for notes; awaits first `pnpm install` + dev-server smoke test)_
- 🟡 1.8 Auth UI _(login, register, forgot/reset, ProtectedRoute, sign-out, axios refresh wiring, MSW handlers, 16 tests — landed on `feature/phase-1.8-auth-ui`; CI green pending the lockfile + fix/ci-workflow-errors prerequisites)_
- ⬜ 1.9 Dashboard zero-state + Brand Settings page
- 🟡 1.10 CI pipeline & security _(CI + Docker + CodeQL + Gitleaks + Dependabot + PR template + CODEOWNERS placeholder + branch-protection guide all landed; required-status-checks must be set in GitHub UI per `docs/deployment/main-branch-protection.md`)_

→ Full scope: [`docs/milestones/phase-1-foundation.md`](./milestones/phase-1-foundation.md)

---

## Phase 2 — Projects, Documents & Signing

**Goal:** End-to-end project flow from "new project" through "client signed". A creative can create a project (either entry point), generate documents from the 12-item library, preview/edit, send a public link, and the client can read and type-to-sign.

**Headline deliverables:** project wizard (both entry points), AI-stub document generation for all 12 types, document picker with smart suggestions, inline preview/edit, opaque share links, client-facing reading view with progress tracker, type-to-sign with audit hashes, deliverables tracker, phase state machine enforced server-side.

**Non-deliverables:** no real M-Pesa, no real WhatsApp/email send, no AI reminders, no real Pro upgrade purchase. ([full list in milestone doc](./milestones/phase-2-projects-documents-signing.md#non-deliverables-explicit-non-goals))

### Milestones
- ⬜ 2.1 Project schema & state machine
- ⬜ 2.2 New project wizard (both entry points)
- ⬜ 2.3 Document library & AI generation (stub provider)
- ⬜ 2.4 Document selection UX (defaults + smart suggestions + Free-tier locks)
- ⬜ 2.5 Document preview + inline edit
- ⬜ 2.6 Public client link
- ⬜ 2.7 Client-facing reading view (light mode)
- ⬜ 2.8 Type-to-sign flow with audit hashes
- ⬜ 2.9 Deliverables tracker
- ⬜ 2.10 Project list & detail pages

→ Full scope: [`docs/milestones/phase-2-projects-documents-signing.md`](./milestones/phase-2-projects-documents-signing.md)

---

## Phase 3 — Payments, WhatsApp & Pro Tier

**Goal:** Real money moves. Clients pay deposits and invoices via M-Pesa; creatives receive WhatsApp confirmations; Pro tier unlocks reminders.

**Headline deliverables:** M-Pesa Daraja STK Push + callback handling, payment reconciliation worker, auto-generated Deposit Receipt + Invoice, WhatsApp Cloud API send + delivery webhooks, email fallback, Pro tier upgrade flow (Single Project KES 499 + Pro KES 299/month), AI payment reminders worker with escalation cap, server-side Free-tier enforcement.

**Non-deliverables:** no eTIMS UI, no admin dashboard, no real-time SSE feed, no multi-currency, no group/studio mode. ([full list in milestone doc](./milestones/phase-3-payments-pro.md#non-deliverables-explicit-non-goals))

### Milestones
- ⬜ 3.1 M-Pesa Daraja integration (STK Push + callbacks)
- ⬜ 3.2 Auto-generated receipts & invoices
- ⬜ 3.3 WhatsApp Business API
- ⬜ 3.4 Email fallback
- ⬜ 3.5 Pro tier upgrade flow
- ⬜ 3.6 Free-tier enforcement (hard gates)
- ⬜ 3.7 AI payment reminders (Pro only)
- ⬜ 3.8 Activity feed

→ Full scope: [`docs/milestones/phase-3-payments-pro.md`](./milestones/phase-3-payments-pro.md)

---

## Phase 4 — eTIMS, Polish & Launch

**Goal:** Production hardening, eTIMS backend compliance built (UI hidden), and public launch ready.

**Headline deliverables:** production deployment with secrets manager + managed Postgres + automated backups, eTIMS payloads generated for every invoice (submission flag off), BullMQ job queue for all async work, in-app activity feed, Playwright E2E suite, admin dashboard, security audit, public help center.

**Non-deliverables:** no user-facing eTIMS UI (separate vision in register), no multi-country, no mobile app, no public API for third parties. ([full list in milestone doc](./milestones/phase-4-launch.md#non-deliverables-explicit-non-goals))

### Milestones
- ⬜ 4.1 eTIMS backend (hidden from users)
- ⬜ 4.2 Background job queue (BullMQ + Redis)
- ⬜ 4.3 In-app activity feed (real-time)
- ⬜ 4.4 End-to-end test suite (Playwright)
- ⬜ 4.5 Performance & mobile
- ⬜ 4.6 Admin dashboard
- ⬜ 4.7 Security audit
- ⬜ 4.8 Production deployment
- ⬜ 4.9 Documentation & help center

→ Full scope: [`docs/milestones/phase-4-launch.md`](./milestones/phase-4-launch.md)

---

## Decisions Log

See [`docs/decisions/`](./decisions/) for all Architecture Decision Records.

Key settled decisions:
- [ADR-001](./decisions/ADR-001-stack-selection.md) — Tech stack selection
- [ADR-002](./decisions/ADR-002-authentication.md) — Auth strategy (JWT + refresh tokens, plus public client-link token model)
- [ADR-003](./decisions/ADR-003-database-design.md) — Database design principles + KaziPay domain entities
- [ADR-004](./decisions/ADR-004-api-design.md) — REST API design conventions
- [ADR-005](./decisions/ADR-005-deployment.md) — Docker-based deployment strategy

Per the **Documentation Rules** in `AGENTS.md`, significant architecture or product decisions made during implementation must land as a new ADR in this folder.

---

## Vision Register

For every product vision's lifecycle (`proposed` → `milestoned` → `in-progress` → `shipped` or `deprecated`), see [`docs/vision-register.md`](./vision-register.md). Any new feature larger than a single milestone should land as a vision first, register there, and only then be milestoned and built.
