# Phase 3 — Payments, WhatsApp & Pro Tier

**Status:** ⬜ Pending
**Target Completion:** Q1 2027
**Dependencies:** Phase 2 complete (projects, documents, signing all working with simulated payments/delivery).
**Status legend:** `⬜` not started · `🟡` in progress · `🟢` shipped · `~~strike~~` descoped (see vision-register).

---

## Objective

Connect the simulated parts of Phase 2 to real money and real client delivery. Clients pay deposits and invoices via M-Pesa; share links go out over WhatsApp (with email fallback); creatives can upgrade to Single Project or Pro and unlock AI reminders.

After Phase 3, KaziPay is a complete usable product for early-access creatives — but eTIMS and final hardening still come in Phase 4.

---

## Deliverables

A creative + their client can, end-to-end, on a real (sandbox) M-Pesa flow:
1. **Creative upgrades to Pro** via M-Pesa STK Push and unlocks unlimited projects + reminders.
2. **Creative sends a share link via WhatsApp**; client receives the message in WhatsApp directly.
3. **Client pays deposit via M-Pesa STK Push**; creative's dashboard reflects confirmed payment within seconds via callback.
4. **Deposit Receipt and Invoice auto-generate** on payment confirmation, sent to the client via WhatsApp.
5. **AI reminders send on schedule** to nudge unpaid invoices, with escalating-but-professional tone.
6. **Free-tier hard limits hold** for downgraded users: 1 active project, 3 doc types, 30-day archive, KaziPay watermark.

---

## Non-Deliverables (Explicit Non-Goals)

- ❌ eTIMS submission UI for users — **Phase 4**. (Backend may begin generating eTIMS-ready payloads here behind a flag.)
- ❌ Admin tooling beyond a manual tier override / refund endpoint — **Phase 4**.
- ❌ Real-time activity feed via WebSocket / SSE — **Phase 4**. (Polled fetch still acceptable.)
- ❌ Mobile-native app — future phase, see vision-register.
- ❌ Multi-currency or non-KES support — future phase.
- ❌ Multi-collaborator projects — future phase ("group project mode" in vision-register).

---

## Scope

### 3.1 — M-Pesa Daraja Integration

- [ ] `MpesaClient` integration with sandbox + production env switching
- [ ] STK Push initiation for deposit and final invoice payments
- [ ] Callback endpoint with Safaricom IP allowlist verification and signature check
- [ ] Idempotent callback handling — duplicate callbacks for the same `CheckoutRequestID` are dropped safely
- [ ] `payments` table — project_id, type (`DEPOSIT` | `FINAL_INVOICE`), amount_cents, mpesa_checkout_request_id, mpesa_receipt, msisdn, status (`PENDING` | `CONFIRMED` | `FAILED` | `TIMEOUT`), initiated_at, confirmed_at
- [ ] Reconciliation worker — polls pending payments older than 60s and asks Daraja for status
- [ ] PII redaction — never log MSISDN or M-Pesa receipt in plaintext

**Acceptance:** End-to-end deposit flow in sandbox: client clicks pay → STK prompt → enter PIN → callback received → project advances → Deposit Receipt auto-generated.

---

### 3.2 — Auto-Generated Receipts & Invoices

- [ ] On `payments.status = CONFIRMED` with type `DEPOSIT`, the Deposit Receipt document is generated automatically and emailed/WhatsApped to the client
- [ ] Final Invoice generated when the creative marks delivery complete (last deliverable → `DELIVERED`)
- [ ] Final invoice deducts deposit already paid and shows balance due
- [ ] On final payment confirmation, project advances to `CLOSED` and the Project Completion Certificate becomes available for client sign-off

---

### 3.3 — WhatsApp Business API

- [ ] `WhatsAppClient` integration (Meta Cloud API)
- [ ] Approved message templates for: new share link, payment received, payment due reminder
- [ ] Variable substitution (creative name, project title, link, amount)
- [ ] Delivery status webhook handling (sent/delivered/read/failed)
- [ ] Failure surfaces in the activity feed as "Couldn't reach client on WhatsApp — sent via email instead"

---

### 3.4 — Email Fallback

- [ ] `EmailClient` integration (SendGrid or AWS SES)
- [ ] Transactional templates matching WhatsApp templates
- [ ] Automatic fallback when WhatsApp send fails or client has no WhatsApp number on file
- [ ] Plain-text and HTML versions

---

### 3.5 — Pro Tier Upgrade Flow

- [ ] Pricing page (in-app) matching the landing page tiers:
  - Free — KES 0
  - Single Project — KES 499 one-time
  - Pro — KES 299/month (with discounted yearly)
- [ ] Upgrade purchase via M-Pesa STK Push (own creative pays into the KaziPay till)
- [ ] On payment confirmation, `subscriptions` updated to new tier
- [ ] Single Project pins to the next created project (`subscriptions.single_project_id` set on first project creation after upgrade)
- [ ] Pro tier has `current_period_end`; lapsed Pro auto-downgrades to Free at period end
- [ ] Cancel / change plan supported

---

### 3.6 — Free-Tier Enforcement (Hard Gates)

- [ ] 1 active project at a time — creating a second active project errors with `FREE_TIER_PROJECT_LIMIT`
- [ ] Only 3 document types generatable on Free (Quotation, Scope of Work, Contract) — other types return `FREE_TIER_DOC_LOCKED`
- [ ] Documents render with **"Powered by KaziPay"** watermark and use KaziPay branding (not creative's own logo) on Free
- [ ] No custom signature upload — Free uses a default block
- [ ] No payment reminders
- [ ] Projects older than 30 days become read-only (archived UI banner with upgrade prompt)

---

### 3.7 — AI Payment Reminders (Pro Only)

- [ ] `reminders` table — project_id, payment_id, scheduled_at, sent_at, channel (`WHATSAPP` | `EMAIL`), message_text, status
- [ ] Reminder cadence configurable per project (default: at due date, +3 days, +7 days, +14 days)
- [ ] AI generates the reminder copy per send — escalates tone gradually but stays professional
- [ ] BullMQ worker processes scheduled reminders
- [ ] Creative can pause/cancel reminders per project

---

### 3.8 — Activity Feed

- [ ] Per-project activity feed records: project created, document generated, link sent, link viewed, signed, payment initiated, payment confirmed, reminder sent
- [ ] All entries use the **"kazipay generates"** convention — never "AI generates"
- [ ] Timestamps in EAT (Africa/Nairobi) by default

---

## Definition of Done

Each verifiable end-to-end against M-Pesa **sandbox** at minimum:

- [ ] STK Push initiates from `POST /api/v1/payments` for a deposit and for a final invoice.
- [ ] M-Pesa callback handler verifies Safaricom IP allowlist + payload signature; rejects invalid callbacks.
- [ ] Duplicate callbacks for the same `CheckoutRequestID` are dropped (idempotent — no double payment recorded).
- [ ] Reconciliation worker reconciles a pending payment whose callback was lost.
- [ ] Deposit Receipt and Invoice auto-generate on confirmed payment without manual trigger.
- [ ] Project Completion Certificate is signable by the client after final payment, advancing project to `CLOSED`.
- [ ] WhatsApp Cloud API delivers a share-link template message and a payment-received template message to a real WhatsApp number.
- [ ] Email fallback fires when WhatsApp delivery fails or no WhatsApp number is on file.
- [ ] Pro upgrade flow takes M-Pesa STK Push for KES 299; subscription tier flips on callback confirmation.
- [ ] Subscription lapse: a Pro user past `current_period_end` is auto-downgraded to Free by a daily worker.
- [ ] Free-tier limits enforced server-side: project count, doc type allow-list, watermark applied to rendered docs, projects older than 30 days return `403 PROJECT_ARCHIVED_FREE_TIER` on edit.
- [ ] AI reminder worker fires on schedule, generates copy via the AI provider, sends via WhatsApp (or email fallback), records to `reminders`.
- [ ] PII redaction verified: MSISDN and M-Pesa receipt do not appear in plaintext anywhere in logs.
- [ ] Tests cover: callback idempotency, signature/IP verification, reconciliation, tier transitions, free-tier gating, reminder cadence + escalation cap.
- [ ] Full E2E happy path (sign up → Pro upgrade → project → deposit → deliver → invoice → final payment → certificate signed → closed) recorded as a video or Playwright trace and linked from this milestone.
- [ ] `docs/dev-roadmap.md`, this milestone document, and `docs/vision-register.md` updated per Documentation Rules.
