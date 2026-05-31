# AGENTS.md — KaziPay Developer & AI Agent Guide

> This file is the **primary reference** for all AI agents (Copilot, Claude, Cursor, etc.) and human developers working on this codebase. Read it fully before making any changes.
> For product context (problem, users, flow, design system), read [`CLAUDE.md`](./CLAUDE.md) first.

---

## Project Overview

**KaziPay** is a business management platform for Kenyan creatives (graphic designers, photographers, videographers, illustrators, copywriters). It handles the entire client-to-payment journey: AI-generated proposals and agreements, type-to-sign digital signatures sent via WhatsApp/email, M-Pesa deposits and invoicing, and proof-of-delivery — replacing the messy Google Docs + WhatsApp + manual eTIMS + M-Pesa + prayer stack that creatives currently rely on.

**Core promise:** "Get the project formalised, get paid, and have proof of everything."

**Stack:**
- **Frontend:** React 18 + TypeScript, Vite, TailwindCSS, React Query, Zustand
- **Backend:** Node.js + Express, TypeScript, Prisma ORM
- **Database:** PostgreSQL
- **Auth:** JWT + Refresh Tokens (httpOnly cookies)
- **Deployment:** Docker + Docker Compose, NGINX reverse proxy
- **External integrations:** M-Pesa (Daraja), WhatsApp Business API, AI document generation, eTIMS (hidden at launch)

---

## Navigation Index

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Product context: what KaziPay is, user flow, document library, pricing, design system |
| `AGENTS.md` | ← You are here. Coding rules, patterns, conventions |
| `docs/dev-roadmap.md` | Current progress and next milestones |
| `docs/milestones/` | Concrete implementation scopes per phase |
| `docs/visions/` | Feature vision documents (product direction) |
| `docs/vision-register.md` | Single changelog tracking every vision's lifecycle (proposed → milestone → shipped) |
| `docs/decisions/` | Architecture Decision Records (ADRs) |
| `docs/architecture/` | Folder structure, system design, data flow |
| `docs/deployment/` | Docker, environment setup, CI/CD |
| `kazipay_landing.html` | Marketing landing page prototype (standalone) |
| `kazipay_prototype.html` | Creative dashboard prototype (standalone) |
| `kazipay_client.html` | Client sign-off screen prototype (standalone) |

---

## Folder Structure

```
kazi-pay/
├── CLAUDE.md                  # Product context (read first)
├── AGENTS.md                  # This file
├── kazipay_landing.html       # Standalone marketing prototype
├── kazipay_prototype.html     # Standalone creative dashboard prototype
├── kazipay_client.html        # Standalone client sign-off prototype
├── docker-compose.yml
├── .env.example
├── frontend/                  # React + TypeScript (Vite)
│   ├── src/
│   │   ├── assets/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── ui/            # Base design system (Button, Input, Modal…)
│   │   │   └── features/      # Feature-scoped components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── layouts/           # Page layout wrappers
│   │   ├── pages/             # Route-level page components
│   │   ├── services/          # API client functions (Axios)
│   │   ├── store/             # Zustand global state slices
│   │   ├── types/             # Shared TypeScript types/interfaces
│   │   └── utils/             # Pure utility functions
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   └── tsconfig.json
├── backend/                   # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── config/            # App config, env validation (zod)
│   │   ├── controllers/       # Request handlers (thin layer)
│   │   ├── services/          # Business logic (projects, documents, payments, signing)
│   │   ├── repositories/      # Data access via Prisma
│   │   ├── routes/            # Express router definitions
│   │   ├── middlewares/       # Auth, error handling, validation
│   │   ├── schemas/           # Zod request/response schemas
│   │   ├── integrations/      # M-Pesa, WhatsApp, AI, eTIMS clients
│   │   ├── types/             # Shared backend types
│   │   └── utils/             # Helpers (date, crypto, format)
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── tsconfig.json
└── docs/
```

---

## Domain Model (Core Entities)

These are the building blocks every developer and agent should know. Full schema lives in `docs/decisions/ADR-003-database-design.md`.

- **User** — the creative (account holder)
- **BrandSettings** — logo + signature + business details attached to a User
- **Client** — the person/company a creative is doing work for
- **Project** — the unit of work. Has a `mode` (`with_proposal` | `direct_to_agreement`) and a `phase` (`proposal` | `agreement` | `delivery` | `closed`)
- **Document** — a generated artifact attached to a project (one of 12 types). Has its own status (`draft` | `previewed` | `sent` | `signed` | `void`)
- **Signature** — a type-to-sign record (typed name → rendered signature image), bound to a Document and a signer (creative or client)
- **Deliverable** — a tracked work item within the Delivery phase
- **Payment** — an M-Pesa transaction (deposit or final invoice payment) with reconciliation status
- **Reminder** — scheduled payment reminder (Pro tier only)
- **Subscription** — Free / Single Project / Pro plan state per user

---

## Architecture Patterns

### Backend

**Layered Architecture (Controller → Service → Repository)**

```
Request → Route → Middleware → Controller → Service → Repository → DB
                                                   │
                                                   └→ Integrations (M-Pesa, WhatsApp, AI)
```

- **Controllers** are thin: parse input, call service, return response. No business logic.
- **Services** contain all business rules. No direct DB calls — always via repository.
- **Repositories** wrap Prisma. One file per domain entity.
- **Integrations** isolate every external API (M-Pesa, WhatsApp, AI provider, eTIMS). Services depend on integration *interfaces*, not concrete clients, so we can stub them in tests.
- All layers communicate via interfaces defined in `types/`.

**Error Handling**

Use a centralized error handler middleware. Throw typed `AppError` instances from services:

```ts
// backend/src/utils/AppError.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) { super(message); }
}
```

All unhandled errors are caught by `middlewares/errorHandler.ts` and formatted as:
```json
{ "status": "error", "message": "...", "code": "..." }
```

**Validation**

Use `zod` schemas in `schemas/` to validate all incoming requests. Apply via middleware before reaching controllers.

**API Response Shape**

Always return a consistent envelope:
```json
{ "status": "success", "data": { ... } }
{ "status": "error",   "message": "...", "code": "SNAKE_CASE_CODE" }
```

### Frontend

**Two surface areas, two themes**

- **Creative-facing screens (dark mode)** — dashboard, project detail, document editor, settings. Background `#141414`, lime `#D4F53C` and purple `#8B5CF6` accents, Manrope font, top nav only (no sidebar).
- **Client-facing screens (light mode)** — the public link where a client reads documents and signs. Receives no login. Same font and accents but on a light surface.

Keep these two themes completely separated in the design system — do not share top-level layout components.

**Component Design**

- **`components/ui/`** — design-system primitives only. No business logic, no API calls. Support both dark and light themes via Tailwind class variants.
- **`components/features/`** — feature components scoped to a domain (e.g., `projects/ProjectCard.tsx`, `documents/DocumentPreview.tsx`, `signing/TypeToSign.tsx`).
- **`pages/`** — route-level components. Compose feature components. Handle page-level state.

**Data Fetching**

Use `@tanstack/react-query` for all server state. Define query/mutation hooks in `hooks/use{Entity}.ts`:

```ts
// hooks/useProjects.ts
export const useProjects = () =>
  useQuery({ queryKey: ['projects'], queryFn: () => api.get('/projects') });
```

**Global State**

Use `zustand` only for truly global client-side state (auth user, UI theme, notifications). Prefer React Query for server state.

**Type Safety**

- All API response shapes must have matching TypeScript interfaces in `frontend/src/types/`.
- No `any`. Use `unknown` and narrow where needed.
- Avoid `!` non-null assertions — handle null/undefined explicitly.

**Icons**

Inline SVGs only. No icon CDNs, no icon font libraries. Keep bundle small and offline-friendly — many Kenyan creatives access from mobile on patchy connections.

---

## Coding Standards

When code exists, follow these rules:

### Scope & Architecture

- **Keep changes scoped to the active milestone.** If you discover work that belongs in a future phase, write it down in the relevant milestone doc — don't sneak it in.
- **Prefer clear, boring architecture over clever abstractions.** A new contributor should be able to trace a request from route → controller → service → repository without reading framework docs.
- **Do not introduce new patterns without an ADR.** If something doesn't fit the existing layered model, that's an architecture decision and deserves a record in `docs/decisions/`.
- **Use migrations for every schema change.** Never edit `prisma/schema.prisma` without `prisma migrate dev`. Never edit migration files after they've run against any environment.

### Cross-Surface Rules (Critical)

KaziPay has two front-end surfaces (creative dashboard, client share page) that share one backend. Business rules that affect both surfaces must live **once**, in the backend.

- **Do not duplicate sensitive business rules between creative-side and client-side code.** The phase state machine, signature audit logic, free-tier feature gating, payment reconciliation, and document status transitions all live in `backend/src/services/`. The frontend reads results — it never re-implements the rule.
- **Do not bypass backend permission checks with frontend-only visibility.** Hiding the "Generate NDA" button on the free tier is fine for UX, but the backend must still reject `POST /api/v1/documents/generate` for an NDA on a free account with `FREE_TIER_DOC_LOCKED`. Same for project creation limits, Pro-only reminders, and admin actions.
- **Phase transitions are server-enforced.** A creative cannot "advance to delivery" by sending a crafted request — the server validates that all required signatures exist and the deposit has been confirmed. `INVALID_PHASE_TRANSITION` is the response.

### What Must Have Tests

Coverage targets are in the Testing section, but these areas require tests regardless of coverage math:

- **Permission and feature-gate logic** (subscription tier checks, RBAC, share-token resolution)
- **Phase state machine and document status transitions** (every legal and illegal transition)
- **Signature audit-hash computation** (deterministic, document-content sensitive)
- **Payment reconciliation logic** (M-Pesa callbacks: success, failure, duplicate, timeout, mismatched amount)
- **Integrations behind interfaces** (stub providers verified against the interface contract)
- **Free-tier limit enforcement** (project count, doc type allow-list, 30-day archive)

### AI Output Rule

AI-generated content is always a **draft**, never an automatic source of truth.

- **Documents** generated by the AI provider are saved as `status: DRAFT` and must be previewed (and optionally edited) by the creative before they reach `SENT`.
- **AI payment reminders** are queued in `reminders` with `status: PENDING_APPROVAL` only when the creative has not opted into auto-send. With auto-send on, they go out — but a tone-escalation guardrail (defined in the reminder service, not in the prompt) caps how aggressive the message can become.
- **Smart suggestions** (e.g., "this looks like a corporate client — add an NDA") are surfaced as banners with explicit accept/dismiss, never as silent automatic actions.
- **No AI-generated text is rendered as HTML on the client share page without server-side sanitization** (see Security Rules).

### Auditability

Every action that affects money, signed documents, or the creative's tier writes to `audit_logs` (see ADR-003). The audit log is append-only — never updated, never deleted.

- Project phase transitions, document signs, payment confirmations, subscription tier changes, refunds, and admin overrides all log a row.
- Signature `audit_hash` is immutable — if a document is later edited, the original hash still proves what was signed.
- Logs include the actor (`CREATIVE`, `CLIENT`, `SYSTEM`) and IP where applicable, with PII redacted per Security Rules.

### General

- TypeScript strict mode enabled everywhere (`"strict": true`).
- No `console.log` in committed code — use the logger utility.
- All async functions must handle errors (try/catch or `.catch()`).
- Prefer `const` over `let`. Never use `var`.
- Use named exports over default exports (exceptions: pages and Next.js-style routes).
- Do not add dependencies without justification in a comment or ADR.

### Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Files/folders | kebab-case | `project-service.ts` |
| React components | PascalCase | `ProjectCard.tsx` |
| Variables/functions | camelCase | `generateDocuments` |
| Types/Interfaces | PascalCase | `ProjectPhase` |
| Constants | UPPER_SNAKE | `MAX_DOCUMENT_BYTES` |
| DB tables | snake_case | `project_documents` |
| API routes | kebab-case | `/api/v1/projects` |
| Env vars | UPPER_SNAKE | `DATABASE_URL` |

### Git Commit Format (Conventional Commits)

```
<type>(<scope>): <subject>

feat(projects): add direct-to-agreement entry flow
feat(documents): generate NDA template via AI service
fix(signing): unlock signature only after all docs are read
chore(deps): upgrade prisma to v5
docs(adr): add ADR-006 for M-Pesa Daraja integration
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `style`

### API Versioning

All routes are prefixed `/api/v1/`. Version bump only on breaking changes.

---

## Product & Copy Rules (enforced in code)

These are not style preferences — they are product rules that must hold across all surfaces:

- **Never say "AI generates"** in user-facing copy. The activity feed, banners, and tooltips say **"kazipay generates"**. (Reason: positions KaziPay as the brand doing the work, not "some AI tool".)
- **Currency is always KES**, stored as integer cents (see ADR-003). Format with thousands separators: `KES 12,500`.
- **Swahili is allowed and welcome** in UI copy where it feels natural ("Karibu", "Asante", "Hujambo") — but never machine-translate; only use phrases reviewed by a native speaker.
- **Tone:** direct, confident, warm. Not corporate. Not generic SaaS. Speaks to a young Nairobi creative who's been burned by clients.
- **Documents are never auto-generated all at once.** The creative selects which of the 12 documents to generate via checkboxes. Recommended defaults are pre-checked (Quotation, Scope of Work, Contract, Deposit Receipt, Invoice).
- **eTIMS UI is hidden at launch.** Backend support is built from day one (every invoice produces an eTIMS-ready payload), but no UI surfaces it until the eTIMS Pro feature is announced.
- **Demo profile** (for dev fixtures, seed data, screenshots): Rowlex Karimi, graphic designer, Nairobi, Kenya, KES currency.

---

## Security Rules

- Never log or expose PII (full names, ID numbers, phone numbers, M-Pesa transaction codes) in logs or error messages.
- All financial amounts stored as integers (KES cents). Never floats.
- JWT secrets, DB credentials, M-Pesa Daraja keys, and WhatsApp API tokens live in `.env` only. Never commit secrets.
- All endpoints require authentication unless explicitly marked `// PUBLIC` (the client-facing signing link is the main public route — it uses a long opaque token, not auth).
- Rate-limit all auth endpoints and the public client-link endpoint.
- Validate and sanitize all user input with `zod` before processing.
- AI-generated document text must be sanitized before rendering as HTML on the client page (no script injection via project description).
- M-Pesa callback endpoints must verify the Safaricom IP allowlist and the callback signature.

---

## Testing

- **Unit tests:** Vitest (frontend), Jest (backend).
- **Integration tests:** Supertest for API routes.
- Test files co-located with source: `project-service.test.ts` next to `project-service.ts`.
- Mock external integrations (M-Pesa, WhatsApp, AI) in tests via the integration interfaces — never hit live APIs from CI.
- Minimum coverage targets: Services 80%, Repositories 60%, Controllers 50%.
- Run tests before pushing: `pnpm test`.

See the **What Must Have Tests** subsection under Coding Standards for the non-negotiable test areas (permissions, phase transitions, signature hashing, payment reconciliation, integrations, free-tier gating).

---

## Documentation Rules

Agents must keep the strategic system current. The docs are not a separate concern from the code — they are part of the deliverable.

### When completing implementation work

- **Update `docs/dev-roadmap.md`** — change the milestone status (🟡 → 🟢) and the "Coded / Not Coded" note for any milestone group you touched.
- **Update the relevant milestone document** in `docs/milestones/` — check off completed items, add implementation notes (file paths touched, decisions made inline, anything a future contributor would need to know).
- **Update or create an ADR** in `docs/decisions/` when you made a significant architecture or product decision. "Significant" means: something a future contributor might reasonably want to reverse, or that locks in a constraint (a new external dependency, a schema shape that's expensive to change, a security boundary, a pattern that will be copied).
- **Update `docs/vision-register.md`** when a feature vision has changed state — proposed → milestone, milestone → in-progress, in-progress → shipped, or shipped → deprecated.

### When starting a new larger feature

- **Create or update a feature vision** in `docs/visions/` first — what problem, who's it for, why now, what's explicitly out of scope.
- **Register it in `docs/vision-register.md`** as `proposed`.
- **Convert the vision into one or more milestone documents** under `docs/milestones/` with concrete scope, dependencies, deliverables, and Definition of Done.
- **Only then implement against the milestone scope.** Code-first followed by retroactive docs loses the chance to catch scope creep early.

### When the product context itself shifts

- **Update `CLAUDE.md`** — pricing, document library, user flow, design tokens, demo profile, and "what NOT to build" all live there. If reality moves and CLAUDE.md doesn't, every agent reading it will produce work aligned to a stale spec.

### What "in-flight" looks like in docs

| State | Convention |
|-------|-----------|
| Not started | `⬜` checkbox, no note |
| Coded but not yet verified end-to-end | `🟡` checkbox + `// in-progress: <commit/PR>` note |
| Coded and verified | `🟢` checkbox + `// shipped: <commit/PR>` note |
| Explicitly descoped | strike-through + `// descoped: <reason, see vision-register>` note |

Agents are allowed to update these inline as part of the same PR that lands the code.

---

## How AI Agents Should Work

1. **Read `CLAUDE.md` first** for product context, then this file, then `docs/dev-roadmap.md` to understand current phase.
2. **Check the relevant milestone file** in `docs/milestones/` before implementing features.
3. **Check `docs/decisions/`** before proposing architecture changes — decisions may already be settled.
4. **Follow the Coding Standards above strictly.** No new patterns without an ADR. No frontend-only enforcement of backend rules. No undocumented schema changes.
5. **Update the docs in the same PR as the code** — see Documentation Rules above. Roadmap status, milestone notes, ADRs, vision register.
6. **Respect the "what NOT to build" list in CLAUDE.md** — KaziPay is not a general document generator, not an HR tool, not a marketing-asset builder.
7. When in doubt, keep it simple. Prefer explicit over clever.
