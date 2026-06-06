# Phase 2 — Projects, Documents & Signing

**Status:** ⬜ Pending
**Target Completion:** Q4 2026
**Dependencies:** Phase 1 complete (auth, brand settings, dashboard shell).
**Status legend:** `⬜` not started · `🟡` in progress · `🟢` shipped · `~~strike~~` descoped (see vision-register).

---

## Objective

Deliver the full project lifecycle from "new project" through "client signed", without money moving yet. A creative can create a project (either entry point), generate documents from the 12-item library, preview, edit, send a public link to the client, and the client can read all docs and type-to-sign. Payments are simulated only — real M-Pesa integration lands in Phase 3.

This is the phase where `perxli_prototype.html` (creative side) and `perxli_client.html` (client side) become real.

---

## Deliverables

A creative + their client can, end-to-end:
1. **Create a project** via either entry point (`DIRECT_TO_AGREEMENT` or `WITH_PROPOSAL`).
2. **Select and generate documents** from the 12-item library — defaults pre-checked, smart suggestions surfaced.
3. **Preview and edit** generated documents inline before sending.
4. **Send a share link** (URL displayed for copy/paste; actual WhatsApp delivery is Phase 3).
5. **Client opens the link** with no account, reads all documents in a light-mode view that mirrors `perxli_client.html`.
6. **Client types-to-sign** every required document; the project phase advances on the creative's dashboard.
7. **Track deliverables** through the Delivery phase as `X/Y done`.
8. The signing produces an immutable `audit_hash` per document.

---

## Non-Deliverables (Explicit Non-Goals)

- ❌ Real M-Pesa STK Push for deposits or invoices — **Phase 3**. (A simulated "Mark deposit paid" admin override exists for testing.)
- ❌ Real WhatsApp / email delivery of share links — **Phase 3**. (The link is generated and shown in the UI; sending is logged but not transmitted.)
- ❌ AI payment reminders — **Phase 3**.
- ❌ Pro tier upgrade flow with real payment — **Phase 3**. (Tier can be flipped via SUPER_ADMIN endpoint for QA.)
- ❌ eTIMS payloads or submission — **Phase 4**.
- ❌ Real-time activity feed via WebSocket / SSE — **Phase 4**. (Polled fetch is enough in Phase 2.)

---

## Scope

### 2.1 — Project Schema & State Machine

- [ ] `clients` table — name, contact (phone, email, whatsapp), client_type (`INDIVIDUAL` | `SME` | `CORPORATE` | `NGO`), notes
- [ ] `projects` table — title, description, client_id, mode (`DIRECT_TO_AGREEMENT` | `WITH_PROPOSAL`), phase (`PROPOSAL` | `AGREEMENT` | `DELIVERY` | `CLOSED`), currency (always `KES` for v1), total_amount_cents, deposit_percent, deliverables_count, deadline, created_by, soft delete
- [ ] Phase state machine enforced in `ProjectService.advancePhase()` — illegal transitions throw `INVALID_PHASE_TRANSITION`
- [ ] Migration generated and seeded with one example project on the demo user

**Acceptance:** Repository tests verify both entry points produce valid initial states; state machine rejects illegal jumps (e.g., `PROPOSAL` → `DELIVERY`).

---

### 2.2 — New Project Wizard

- [ ] 3-step wizard matching `perxli_prototype.html`:
  1. Client info (existing client picker + create-new form)
  2. Project details (title, description, deadline, deliverables count)
  3. Payment terms (total in KES, deposit %, optional milestone schedule)
- [ ] Entry-point selector at the top: "I already have the project" vs "I'm sending a proposal first"
- [ ] Selecting `with_proposal` adds the Proposal tab to project navigation
- [ ] Free-tier limit enforced: 1 active (non-closed) project
- [ ] `POST /api/v1/projects` accepts the full wizard payload and returns the new project

---

### 2.3 — Document Library & AI Generation

- [ ] `documents` table — project_id, type (12-value enum), status (`DRAFT` | `PREVIEWED` | `SENT` | `SIGNED` | `VOID`), content_json (structured), content_html (rendered), generated_at, sent_at, signed_at
- [ ] `DocumentGenerationService` — accepts project + selected doc types, calls AI provider, returns structured + rendered content
- [ ] Integration interface `AIProvider` with a stub implementation for local dev (so contributors don't need API keys)
- [ ] 12 document templates with deterministic structure per type:
  - Proposal, Quotation, Scope of Work, Contract / Service Agreement, NDA, Letter of Engagement, Creative Brief
  - Change Order, Deposit Receipt
  - Invoice, Final Delivery Note, Project Completion Certificate
- [ ] Free-tier limit enforced: only Quotation, Scope of Work, Contract are generatable
- [ ] Activity feed entries use **"perxli generates"** copy — never "AI generates"

---

### 2.4 — Document Selection UX

- [ ] Document picker grouped into three sections: Before / During / Closing
- [ ] Recommended defaults pre-checked: Quotation, Scope of Work, Contract, Deposit Receipt, Invoice
- [ ] One-line description under each document
- [ ] Smart suggestion banner based on client type (e.g., `CORPORATE`/`NGO` → nudge NDA + Letter of Engagement)
- [ ] Greyed-out + lock icon on Free-tier-restricted documents with "Upgrade to unlock" link
- [ ] "Generate selected" CTA → progress UI → preview screen

---

### 2.5 — Document Preview + Inline Edit

- [ ] Document preview renders content_html with creative's logo and brand
- [ ] Inline edit mode — creative can adjust text in editable blocks before sending
- [ ] Edits persist as `content_json` patch on the document record
- [ ] Free-tier documents render with Perxli watermark (logic ships in Phase 3 with the rest of free-tier enforcement, but render path is built here behind a feature flag)
- [ ] Side-by-side document tab navigation if multiple documents are generated

---

### 2.6 — Public Client Link

- [ ] `project_share_links` table — project_id, token (opaque, 32 bytes urlsafe base64), expires_at, revoked_at, view_count, last_viewed_at
- [ ] `POST /api/v1/projects/:id/share` issues a fresh link
- [ ] `GET /api/v1/share/:token` (PUBLIC, no auth) returns project + documents + signature status, scoped to the link
- [ ] Rate-limited (`AUTH_RATE_LIMIT_MAX` style budget per IP)
- [ ] Revoke action invalidates the link immediately

---

### 2.7 — Client-Facing Reading View

- [ ] Light-mode theme used (matches `perxli_client.html`)
- [ ] Sender card — creative's logo, name, profession, contact
- [ ] Project summary
- [ ] Reading progress tracker — scroll position per document determines "read" status
- [ ] Expandable accordion per document with proper formatting (headings, paragraphs, tables for quotations)
- [ ] Signature section is locked until every document is marked read
- [ ] Mobile-first responsive layout

---

### 2.8 — Type-to-Sign Flow

- [ ] `signatures` table — document_id, signer_role (`CLIENT` | `CREATIVE`), typed_name, rendered_signature_url (PNG generated server-side from typed name), signed_at, ip_address, user_agent, audit_hash (sha256 of doc content + signature metadata)
- [ ] Client types name → live preview in signature font
- [ ] "Sign all documents" CTA captures one signature record per document
- [ ] Audit hash stored immutably — protects against later document edits
- [ ] Confirmation screen after signing with "Your copies have been emailed to you" message (real email lands in Phase 3 — for now this is logged)
- [ ] Project phase advances `PROPOSAL` → `AGREEMENT` (or `AGREEMENT` → `DELIVERY` if proposal was skipped) on successful signing of all docs

---

### 2.9 — Deliverables Tracker

- [ ] `deliverables` table — project_id, title, status (`PENDING` | `IN_PROGRESS` | `DELIVERED`), order_index, delivered_at
- [ ] Creative can add/edit/reorder/check-off deliverables on the project detail page
- [ ] Dashboard project card shows `X / Y deliverables done` for projects in `DELIVERY` phase

---

### 2.10 — Project List & Detail Pages

- [ ] Dashboard shows project cards with phase-aware status copy:
  - *"Luxe Nails — Proposal sent · Awaiting response"*
  - *"Madison Inv. — Agreement phase · Awaiting deposit"*
  - *"CCSA — Delivery phase · 3/5 deliverables done"*
- [ ] Projects list page with filter by phase
- [ ] Project detail page with phase-based tab navigation (Proposal tab only present in `WITH_PROPOSAL` mode)
- [ ] Each phase tab only enabled when the previous phase is complete

---

## Definition of Done

Each verifiable end-to-end:

- [ ] Both entry-point flows (`DIRECT_TO_AGREEMENT`, `WITH_PROPOSAL`) work from wizard → signed.
- [ ] All 12 document types are generatable via the AI stub provider (no real API key required for dev).
- [ ] Recommended-default checkboxes are pre-selected on the document picker.
- [ ] Smart-suggestion banner appears for `CORPORATE` / `NGO` clients with NDA + Letter of Engagement.
- [ ] Document preview renders the creative's logo (Phase 1) and supports inline edits that persist as `content_json` patches.
- [ ] Share link generated via `POST /projects/:id/share` is opaque (not guessable), expires per `SHARE_LINK_DEFAULT_TTL_DAYS`, and is revocable.
- [ ] Client-facing page renders in light mode, mobile-responsive, with a reading progress tracker that blocks signing until every document is read.
- [ ] Type-to-sign produces one `signatures` row per document with a computed `audit_hash` (sha256 of canonical doc content + signer metadata).
- [ ] Phase state machine rejects illegal transitions with `INVALID_PHASE_TRANSITION` (e.g., `PROPOSAL` → `DELIVERY` without signing).
- [ ] Free-tier limits enforced **server-side** (not just hidden in UI): second active project rejected with `FREE_TIER_PROJECT_LIMIT`; locked doc types rejected with `FREE_TIER_DOC_LOCKED`.
- [ ] Activity feed uses "perxli generates" copy — verified by a grep in CI or a code-review checklist.
- [ ] Tests cover: phase transitions (legal + illegal), signature audit hashing, share-token lookup + revocation, free-tier gating, document picker defaults.
- [ ] Both `perxli_prototype.html` and `perxli_client.html` were referenced during implementation and the React app visually matches them.
- [ ] `docs/dev-roadmap.md`, this milestone document, and `docs/vision-register.md` updated per Documentation Rules.
