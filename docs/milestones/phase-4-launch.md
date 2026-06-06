# Phase 4 — eTIMS, Polish & Launch

**Status:** ⬜ Pending
**Target Completion:** Q2 2027
**Dependencies:** Phase 3 complete (payments, WhatsApp, Pro tier all live in sandbox).
**Status legend:** `⬜` not started · `🟡` in progress · `🟢` shipped · `~~strike~~` descoped (see vision-register).

---

## Objective

Production hardening, eTIMS compliance built into the backend (no UI yet — that's the future "we handle your compliance for you" Pro feature), and public launch. By end of Phase 4, Perxli is deployed on cloud infrastructure, security-audited, and onboarding paying creatives.

---

## Deliverables

1. **Production deployment** at a public URL with managed Postgres, secrets in a real secrets manager, automated backups, uptime monitoring.
2. **Security audit passed** — dependency scan, OWASP review, penetration test (or internal red-team review).
3. **Every invoice generates a stored eTIMS-ready payload** (submission flag off — UI hidden).
4. **End-to-end test suite (Playwright)** covering the full creative + client loop runs green on every merge to `main`.
5. **Background job queue (BullMQ + Redis)** absorbs all async work — AI gen, reminders, M-Pesa reconciliation, WhatsApp/email sending.
6. **Admin dashboard** lets Perxli staff manage users, refunds, feature flags, and view platform metrics.
7. **First paying creative outside the team** completes a full project-to-payment loop on production.

---

## Non-Deliverables (Explicit Non-Goals)

- ❌ User-facing eTIMS UI — that's a separate vision in `docs/vision-register.md` (`eTIMS Pro upsell UI`). Phase 4 builds the foundation only.
- ❌ Multi-country expansion — see vision-register (Uganda → Tanzania → Rwanda).
- ❌ Mobile-native app — see vision-register.
- ❌ Public API surface for third parties — see vision-register (`white-label / API-only mode`).
- ❌ Group / studio mode — see vision-register.

---

## Scope

### 4.1 — eTIMS Backend (Hidden from Users)

- [ ] Every invoice produces an eTIMS-ready payload (KRA invoice number, line items with HS codes where applicable, tax breakdown) and stores it on the invoice record
- [ ] `EtimsClient` integration scaffolded behind a feature flag (`feature.etims_submission`)
- [ ] When the flag is off (launch default), payloads are generated and stored but never submitted
- [ ] Admin can toggle the flag per environment / per user for pilot testing
- [ ] **No user-facing eTIMS UI ships in Phase 4** — this is foundation only for the future Pro upsell

---

### 4.2 — Background Job Queue

- [ ] Redis + BullMQ for async jobs
- [ ] Job types: AI document generation, AI reminder generation, WhatsApp send, email send, M-Pesa reconciliation, eTIMS submission (flagged off)
- [ ] Job retry with exponential backoff
- [ ] Dead-letter queue + alerting on failures
- [ ] Bull Board UI for job monitoring (internal admin only, behind auth)

---

### 4.3 — In-App Activity Feed (Real-Time)

- [ ] Activity feed entries push via WebSocket or SSE to the creative's dashboard
- [ ] Banner notifications for high-priority events (payment received, client signed)
- [ ] Notification preferences per user
- [ ] All copy uses **"perxli generates"** — enforce via lint rule on copy strings if practical

---

### 4.4 — End-to-End Test Suite

- [ ] Playwright E2E covering critical paths:
  - Register → upgrade to Pro → create `WITH_PROPOSAL` project → generate docs → send link → client signs → deposit → deliver → invoice → final payment → completion certificate
  - Register → stay Free → create `DIRECT_TO_AGREEMENT` project → hit free-tier limits cleanly
  - Subscription lapse → auto-downgrade → archived projects become read-only
- [ ] CI runs E2E against staging on merge to `main`
- [ ] Mobile viewport coverage (iPhone SE size as the floor)

---

### 4.5 — Performance & Mobile

- [ ] Slow 3G smoke test passes for the client-facing reading view (target: < 4s to first interactive on 3G)
- [ ] Query analysis on heavy endpoints (project list, share link load)
- [ ] Database indexes reviewed and optimized
- [ ] Frontend bundle analysis (target: initial JS < 180KB gzipped for creative side, < 80KB for client side)
- [ ] Image optimization for uploaded logos and signatures
- [ ] API response time p95 < 500ms for list endpoints

---

### 4.6 — Admin Dashboard

- [ ] Super-admin portal (separate route tree, requires `SUPER_ADMIN` role)
- [ ] User management: search, suspend, manually adjust subscription tier
- [ ] Refund / void payment flow (with audit trail)
- [ ] Platform metrics: signups, active creatives by tier, projects created, GMV through M-Pesa
- [ ] Audit log viewer
- [ ] Feature flag management (including the eTIMS submission flag)

---

### 4.7 — Security Audit

- [ ] Dependency vulnerability scan (Snyk / npm audit) in CI
- [ ] OWASP Top 10 review focused on:
  - Public share link enumeration / brute force
  - AI-generated content rendered as HTML (XSS surface)
  - M-Pesa callback authenticity
  - File upload validation (logo, signature)
- [ ] Penetration test (external or internal red team)
- [ ] Data encryption at rest for PII fields (phone numbers, KRA PINs)
- [ ] TLS enforced everywhere; HSTS headers
- [ ] M-Pesa secrets rotated and stored in cloud secrets manager (not `.env` in production)

---

### 4.8 — Production Deployment

- [ ] Cloud provider selected (see ADR-005 → follow-up ADR-006)
- [ ] Infrastructure as Code (Terraform or Pulumi)
- [ ] Managed PostgreSQL (RDS or equivalent) with PITR backups
- [ ] Container orchestration (ECS, Fly.io, or similar)
- [ ] CDN for frontend assets and uploaded brand assets
- [ ] Automated backups (DB + uploaded files)
- [ ] Uptime monitoring + alerting (PagerDuty or similar)
- [ ] Runbook for common ops: refund a payment, regenerate a signature audit hash, manually trigger eTIMS submission, etc.

---

### 4.9 — Documentation & Help Center

- [ ] Public help center for creatives (how to start your first project, how M-Pesa STK works, when to use NDA vs Letter of Engagement, etc.)
- [ ] Public API docs (OpenAPI / Swagger) — useful for future integrations, not a launch deliverable for users
- [ ] Status page

---

## Definition of Done

Each verifiable end-to-end on production infrastructure:

- [ ] Public URL serves the creative-side app and `/s/:token` client share pages, both on HTTPS with HSTS.
- [ ] Managed Postgres with PITR backups; restore procedure exercised at least once and runbooked.
- [ ] All secrets (JWT keys, M-Pesa, WhatsApp, AI provider) loaded from the cloud secrets manager — `grep -r` confirms no production secrets in `.env`-style files in the repo or images.
- [ ] Uptime monitoring + paging configured; a deliberate outage triggers an alert.
- [ ] Every invoice record has an `etims_payloads` row generated; `FEATURE_ETIMS_SUBMISSION=false` so nothing is submitted; toggling the flag in a sandbox sends a valid payload to eTIMS sandbox.
- [ ] BullMQ workers handle: AI document generation, AI reminders, WhatsApp send, email send, M-Pesa reconciliation, eTIMS submission (flagged off). Dead-letter queue alerts on failure.
- [ ] Playwright E2E suite runs on every merge to `main` against staging and covers: full Pro loop, full Free loop, subscription lapse → auto-downgrade. Mobile viewport (iPhone SE) is in scope.
- [ ] Slow-3G smoke test: client share page hits "first interactive" in under 4 seconds on a throttled connection.
- [ ] Bundle budgets met: initial JS < 180KB gzipped (creative side), < 80KB (client share view).
- [ ] Admin dashboard supports: user search/suspend, manual tier override, refund/void payment with audit trail, feature flag toggle, view audit log + platform metrics.
- [ ] Security audit completed: dependency scan green, OWASP Top 10 review documented, penetration test report filed in `docs/decisions/` as an ADR addendum or separate folder.
- [ ] Public help center live with: getting started guide, M-Pesa STK explainer, document-type guidance, FAQ.
- [ ] Status page live.
- [ ] Demo creative (Rowlex Karimi) seeded in production.
- [ ] First paying external creative has completed a full project-to-payment loop on production; their feedback is captured in a follow-up note.
- [ ] `docs/dev-roadmap.md`, this milestone document, and `docs/vision-register.md` updated per Documentation Rules.
