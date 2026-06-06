# ADR-001 — Technology Stack Selection

**Date:** 2026-05-30
**Status:** Accepted
**Deciders:** Rowlex (Founder/Lead)

---

## Context

Perxli needs a full-stack web application capable of handling AI document generation, type-to-sign signature flows, public client-facing pages without auth, M-Pesa STK Push payment integration, and WhatsApp/email delivery. The product must run well on Kenyan mobile networks. We are a small team and need a stack that is productive, well-supported, and hirable in Nairobi.

---

## Decision

### Frontend
**React 18 + TypeScript + Vite + TailwindCSS**

- React is the dominant frontend framework with the largest ecosystem and the deepest local talent pool in Nairobi.
- TypeScript provides type safety — critical when KES amounts and signed-document audit hashes are flowing through the system.
- Vite gives fast DX (dev server + build) over CRA and small bundle sizes — important for mobile-first delivery on patchy networks.
- TailwindCSS enables rapid UI development without a heavy component library lock-in, and lets us cleanly express the two themes (dark creative side, light client side) with token-based variants.
- `@tanstack/react-query` for server state management — purpose-built for async data and built-in mutation/optimistic updates we need for the signing flow.
- `zustand` for lightweight client-side global state (auth user, subscription tier, theme).
- `react-router-v6` for routing.
- Inline SVGs only — no icon CDN, no icon font, to keep bundle small.
- Manrope font self-hosted to avoid Google Fonts roundtrips on first load.

### Backend
**Node.js + Express + TypeScript**

- JavaScript/TypeScript across the full stack reduces context switching.
- Express is minimal, unopinionated, and extremely well-understood.
- TypeScript strict mode prevents entire classes of runtime errors in payment-handling and signing-audit code.
- `zod` for runtime schema validation.
- `prisma` as ORM: excellent TypeScript integration, readable migrations, good DX.

### Database
**PostgreSQL 15**

- ACID compliance is non-negotiable for payment records and signature audit trails.
- PostgreSQL's JSON support is useful for AI-generated document `content_json`.
- Widely supported by managed cloud offerings (RDS, Supabase, Neon).

### Infrastructure
**Docker + Docker Compose + NGINX**

See ADR-005 for deployment detail.

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|----------------|
| Next.js | SSR overhead unnecessary for an authenticated SaaS app; complicates deployment. The client-facing share page is fast enough as a Vite SPA with a small bundle. |
| NestJS | Too opinionated for current team size; Express gives more control over the integration layer (M-Pesa, WhatsApp, AI). |
| MongoDB | Lack of strict relational guarantees makes payment/signature consistency harder to enforce. |
| Fastify | Strong choice, but team more familiar with Express; can migrate later. |
| GraphQL | Adds complexity without clear benefit at current scale; REST is sufficient. |
| Component library (Chakra, MUI, shadcn) | Want full control of two distinct themes (dark creative + light client) and a brand that doesn't look like a generic SaaS reskin. Tailwind primitives are enough. |

---

## Consequences

- TypeScript must be `strict: true` everywhere. No exceptions.
- All financial amounts stored as integers (KES cents). See ADR-003.
- Team must be comfortable with async/await patterns throughout.
- The integration layer (M-Pesa, WhatsApp, AI) is isolated behind interfaces — swapping providers later does not touch services or controllers.
- Future migration to NestJS or a more structured framework remains possible without a full rewrite.
