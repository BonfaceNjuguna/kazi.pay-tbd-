# ADR-003 — Database Design Principles

**Date:** 2026-05-30
**Status:** Accepted
**Deciders:** Rowlex (Founder/Lead)

---

## Context

Perxli stores financial data (M-Pesa payments, deposits, invoices), legally-meaningful artifacts (signed contracts, type-to-sign audit trails), and AI-generated content (document JSON + rendered HTML). These require strict data integrity, auditability, and per-creative isolation. Design decisions made now are expensive to undo.

---

## Decisions

### 1. All monetary amounts stored as integers (KES cents)

All currency values are stored as the **lowest denomination integer**, i.e. KES cents — so KES 12,500.00 = `1250000`.

**Rationale:** Floating-point arithmetic is not safe for money. Integer arithmetic is exact and predictable across all languages and DB drivers.

**Rule:** Any field ending in `_amount`, `_total`, `_deposit`, `_balance`, `_paid`, `_due` is an integer representing KES cents. Division back to display units happens only at the presentation layer (`utils/money.ts`).

---

### 2. Per-user isolation via `user_id` column

Perxli is single-tenant in spirit (one creative = one account), but the same DB serves all creatives. Every user-scoped table has a `user_id` foreign key.

**Rationale:** Cross-creative data leaks are catastrophic — a competitor seeing your client list or signed contracts would be a product-ending bug.

**Rule:** Every query on a user-scoped table **must** include a `WHERE user_id = ?` filter. The repository layer enforces this. No exceptions.

Tables that are intentionally accessible without user auth (e.g., `project_share_links` looked up by token) use the token as the access key but still resolve to a `user_id` on the linked project before returning data.

---

### 3. UUIDs as primary keys

All tables use `UUID` primary keys (PostgreSQL `gen_random_uuid()`), not auto-increment integers.

**Rationale:** UUIDs are safe to generate client-side, expose no row-count information (so a competitor can't estimate how many users we have from a leaked ID), and are easier to merge/sync across environments. The performance overhead at our scale is negligible.

---

### 4. Soft deletes for business entities

Projects, clients, documents, and similar entities use soft deletes (`deleted_at TIMESTAMPTZ`). Hard deletes are only used for session tokens, share links, and ephemeral records.

**Rationale:** A signed contract or paid invoice cannot be retroactively deleted without compromising the audit trail. Soft deletes preserve history.

**Rule:** All queries on soft-deletable tables must filter `WHERE deleted_at IS NULL` unless explicitly fetching history.

---

### 5. `created_at` / `updated_at` on every table

All tables include:
```sql
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

Prisma's `@updatedAt` handles `updated_at` automatically. Default timezone for display is `Africa/Nairobi` (EAT) but storage is always UTC.

---

### 6. Append-only audit log

A separate `audit_logs` table records all state-changing operations relevant to compliance and trust. It is never updated or deleted — only inserted.

```sql
audit_logs (
  id          UUID PRIMARY KEY,
  user_id     UUID,                   -- creative who owns the entity (null for client actions)
  actor_kind  TEXT NOT NULL,          -- 'CREATIVE' | 'CLIENT' | 'SYSTEM'
  actor_ref   TEXT,                   -- user_id, share token hash, or job name
  action      TEXT NOT NULL,          -- e.g. 'DOCUMENT_SIGNED', 'PAYMENT_CONFIRMED'
  entity_type TEXT NOT NULL,          -- e.g. 'Document', 'Payment'
  entity_id   UUID NOT NULL,
  before      JSONB,                  -- state before change
  after       JSONB,                  -- state after change
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
)
```

---

### 7. Signature audit hashes are immutable

Each `signatures` row stores an `audit_hash` (sha256) computed over the canonical JSON of the signed document content plus the signer metadata at sign time. This is **not** recomputable from current data — if the document is later edited, the original audit hash still proves what was actually signed.

---

### 8. Migrations via Prisma Migrate

All schema changes go through `prisma migrate dev` in development and `prisma migrate deploy` in production. No raw SQL DDL outside of migrations.

**Rule:** Never modify `schema.prisma` without generating a migration. Never edit migration files after they've been run against any environment.

---

## Core Schema Entities (v1)

```
users               id, email, password_hash, full_name, profession, city, country,
                    currency (default 'KES'), role, created_at, updated_at

user_sessions       id, user_id, token_hash, expires_at, ip_address, user_agent

brand_settings      id, user_id (unique), logo_url, signature_image_url,
                    signature_typed_name, business_name, business_address,
                    kra_pin (nullable)

subscriptions       id, user_id (unique), plan ('FREE'|'SINGLE_PROJECT'|'PRO'),
                    current_period_end (nullable), single_project_id (nullable),
                    cancelled_at (nullable), created_at, updated_at

clients             id, user_id, name, phone, email, whatsapp_number,
                    client_type ('INDIVIDUAL'|'SME'|'CORPORATE'|'NGO'),
                    notes, deleted_at

projects            id, user_id, client_id, title, description,
                    mode ('DIRECT_TO_AGREEMENT'|'WITH_PROPOSAL'),
                    phase ('PROPOSAL'|'AGREEMENT'|'DELIVERY'|'CLOSED'),
                    currency ('KES'), total_amount, deposit_percent,
                    deposit_amount, paid_amount, deadline, deliverables_count,
                    deleted_at

deliverables        id, project_id, title, status ('PENDING'|'IN_PROGRESS'|'DELIVERED'),
                    order_index, delivered_at

documents           id, project_id, type (12-value enum),
                    status ('DRAFT'|'PREVIEWED'|'SENT'|'SIGNED'|'VOID'),
                    content_json (JSONB), content_html (TEXT),
                    generated_at, sent_at, signed_at, deleted_at

signatures          id, document_id, signer_role ('CLIENT'|'CREATIVE'),
                    typed_name, rendered_signature_url, signed_at,
                    ip_address, user_agent, audit_hash (sha256, immutable)

project_share_links id, project_id, token (32-byte urlsafe base64, indexed),
                    expires_at, revoked_at, view_count, last_viewed_at

payments            id, project_id, type ('DEPOSIT'|'FINAL_INVOICE'|'SUBSCRIPTION'),
                    amount, msisdn (encrypted), mpesa_checkout_request_id,
                    mpesa_receipt (encrypted), status ('PENDING'|'CONFIRMED'|'FAILED'|'TIMEOUT'),
                    initiated_at, confirmed_at

reminders           id, project_id, payment_id (nullable), scheduled_at, sent_at,
                    channel ('WHATSAPP'|'EMAIL'), message_text, status

etims_payloads      id, document_id (FK to invoice doc), payload (JSONB),
                    submitted_at (nullable), submission_response (JSONB nullable)

audit_logs          (see above)
```

---

## Consequences

- Prisma schema is the single source of truth for the DB. TypeScript types are generated from it.
- Repository functions must always scope queries to `user_id` (or resolve the user via the share token, on the client-facing path).
- Any new table added must follow: UUID PK, `user_id` (or explicit cross-user table rationale), `created_at`/`updated_at`, migration required.
- Signature audit hashes must never be regenerated, even for displaying signatures in different sizes — the rendered_signature_url is the display copy, the audit_hash is the legal proof.
- M-Pesa msisdn and receipt fields are encrypted at rest in production (Phase 4) — PII reduction is a design constraint, not a polish task.
