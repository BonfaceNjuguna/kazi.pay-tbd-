# System Architecture Overview

**Last Updated:** 2026-05-30

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                            │
│                                                                  │
│   Creative-facing app (React, dark mode, authenticated)          │
│   Client-facing share page (React, light mode, no auth)          │
│   Future: React Native mobile app                                │
└─────────────────────────┬────────────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼────────────────────────────────────────┐
│                       NGINX (Reverse Proxy)                      │
│  /            →  Frontend (static)                               │
│  /api/*       →  Backend (Express API)                           │
└─────────┬──────────────────────────────────────────┬────────────┘
          │                                          │
┌─────────▼────────────────┐          ┌──────────────▼────────────┐
│     BACKEND SERVICE      │          │    FRONTEND SERVICE       │
│  Node.js + Express + TS  │          │  React 18 + Vite + TS     │
│  Port 3000               │          │  Served by NGINX :80      │
│                          │          └───────────────────────────┘
│  Layers:                 │
│  Routes                  │           ┌──────────────────────────┐
│  Middlewares             │           │  INTEGRATIONS            │
│  Controllers             │◄─────────►│  M-Pesa Daraja (Ph.3)    │
│  Services                │           │  WhatsApp Cloud (Ph.3)   │
│  Repositories            │           │  AI Provider (Ph.2)      │
│  Integrations            │           │  eTIMS (Ph.4, hidden)    │
│  Prisma ORM              │           └──────────────────────────┘
└─────────┬────────────────┘
          │
┌─────────▼────────────────┐          ┌──────────────────────────┐
│      DATABASE            │          │   JOB QUEUE (Phase 4)    │
│  PostgreSQL 15            │          │   BullMQ + Redis         │
│  Managed by Prisma        │          │   AI gen, reminders,     │
└──────────────────────────┘          │   M-Pesa reconciliation  │
                                      └──────────────────────────┘
```

---

## Two Audiences, Two Surfaces

KaziPay has two distinct user-facing surfaces. They share a backend but have different design systems and different auth models. Keep them visibly separated in the codebase.

| Surface | Audience | Theme | Auth |
|---------|----------|-------|------|
| Creative dashboard | The creative (account holder) | Dark mode (`#141414` bg, Manrope, lime + purple accents, top nav only — no sidebar) | JWT + refresh cookies (ADR-002) |
| Client share page | The creative's client (no account) | Light mode, same fonts and accents | Opaque share-link token (ADR-002) |

---

## Request Lifecycle (Authenticated, Creative-Side)

```
1. Browser sends request to NGINX
2. NGINX routes /api/* → Express backend
3. Express matches route
4. Auth middleware validates JWT (extracts userId, role, plan)
5. Feature-gate middleware (if needed) checks subscription tier
6. Zod validation middleware checks request body/params
7. Controller calls service method
8. Service executes business logic, calls repository / integrations
9. Repository executes Prisma query (always scoped to user_id)
10. Response flows back up the chain
11. Error handler catches any thrown AppError and formats response
```

## Request Lifecycle (Public, Client-Side)

```
1. Browser opens https://kazi.pay/s/{token}
2. NGINX serves the static client-side React bundle
3. Client app calls GET /api/v1/share/{token}
4. Share-token middleware looks up the token in project_share_links
5. Middleware rejects if expired, revoked, or rate-limited
6. Resolves to project + user_id
7. Controller returns project, documents, signature status
8. (On sign) POST /api/v1/share/{token}/sign creates signature records
9. Phase advances; payment STK Push may be triggered
```

---

## Backend Layer Responsibilities

| Layer | File location | Responsibility |
|-------|--------------|----------------|
| **Routes** | `src/routes/` | Map HTTP verbs + paths to controllers. Apply middleware per route. |
| **Middleware** | `src/middlewares/` | Auth (`requireUser`, `shareTokenAuth`), RBAC, feature-gate, validation, logging, error handling |
| **Controllers** | `src/controllers/` | Parse request, call service, return response. No business logic. |
| **Services** | `src/services/` | All business logic. Calls repositories and integrations. Throws `AppError`. |
| **Repositories** | `src/repositories/` | Prisma queries. Always scoped to `user_id` for user-scoped tables. No logic. |
| **Integrations** | `src/integrations/` | External API clients (M-Pesa, WhatsApp, AI, eTIMS). Each exposes an interface that services depend on. |
| **Schemas** | `src/schemas/` | Zod schemas for request/response validation and TypeScript types |
| **Config** | `src/config/` | Env var parsing + validation (zod). Fails fast on startup if missing vars. |

### Dependency Rule

```
Controller → Service → (Repository | Integration) → Prisma | external API
```

Lower layers never import from higher layers. Services never import controllers. Repositories never import services or integrations.

---

## Frontend Layer Responsibilities

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Pages** | `src/pages/` | Route-level components. Compose features. Handle page-level state. Split by surface: `pages/creative/...` and `pages/client/...`. |
| **Feature components** | `src/components/features/` | Domain-specific UI components (e.g., `projects/ProjectCard`, `documents/DocumentPreview`, `signing/TypeToSign`) |
| **UI primitives** | `src/components/ui/` | Design-system atoms (Button, Input, Modal). Support dark + light themes via Tailwind variants. No API calls, no business logic. |
| **Hooks** | `src/hooks/` | React Query query/mutation hooks. One file per domain entity. |
| **Services** | `src/services/` | Axios API call functions. Called by hooks only. |
| **Store** | `src/store/` | Zustand slices for global client state (auth, theme, notifications) |
| **Types** | `src/types/` | TypeScript interfaces matching backend API response shapes |

---

## Authentication Flow (Creative-Side)

```
Login
  ├── POST /api/v1/auth/login
  ├── Backend: validate credentials, create session, sign JWT
  ├── Response: { accessToken } + Set-Cookie: refreshToken (httpOnly)
  ├── Frontend: store accessToken in Zustand (memory)
  └── Axios interceptor: inject Authorization: Bearer <token> on all requests

Token Refresh (automatic)
  ├── Axios interceptor catches 401
  ├── POST /api/v1/auth/refresh (cookie sent automatically)
  ├── Backend: validate refresh token, rotate, return new accessToken
  └── Retry original request with new token

Logout
  ├── POST /api/v1/auth/logout
  ├── Backend: delete session record
  ├── Response clears the cookie
  └── Frontend: clear Zustand auth state → redirect to /login
```

## Share-Link Flow (Client-Side)

```
Creative sends link via WhatsApp
  └── POST /api/v1/projects/:id/share → returns { token, url }
  └── Backend triggers WhatsApp send (Phase 3) — link contains token only, no user info

Client opens link
  ├── GET /api/v1/share/:token
  ├── Backend resolves token → project + documents
  ├── Client reads each document (read state tracked client-side)
  └── On "Sign all": POST /api/v1/share/:token/sign with typed names
       ├── Backend creates signature records per document
       ├── Computes audit_hash per document
       ├── Advances project phase
       └── Returns confirmation
```

---

## Per-User Isolation

Every authenticated request carries `userId` in the JWT. The `requireUser` middleware attaches it to `req.user`. Repositories receive `userId` as a parameter and apply it to every query:

```ts
// repositories/projects.repository.ts
async findAll(userId: string, filters: ProjectFilters) {
  return this.prisma.project.findMany({
    where: { userId, deletedAt: null, ...filters }
  });
}
```

For client-side share endpoints, the share-token middleware resolves the token to a `project.userId` and the same repositories are called with that scoped value. No cross-user data access is possible through the repository layer.

---

## Error Handling

All errors flow to the centralized error handler middleware:

```
Service throws AppError (statusCode, message, code)
       ↓
Express error handler catches it
       ↓
Response: { status: 'error', message, code }
```

Unexpected errors (non-AppError) return `500` without leaking stack traces in production. PII is redacted from log entries (phone numbers, M-Pesa receipts, client names in some contexts).

---

## Integration Layer

Every external service is fronted by an interface so it can be stubbed in tests and swapped without touching services.

```
backend/src/integrations/
├── mpesa/
│   ├── mpesa-client.interface.ts
│   ├── daraja.mpesa-client.ts        # Real Safaricom Daraja implementation
│   └── stub.mpesa-client.ts          # Dev/test stub
├── whatsapp/
│   ├── whatsapp-client.interface.ts
│   ├── cloud-api.whatsapp-client.ts
│   └── stub.whatsapp-client.ts
├── ai/
│   ├── ai-provider.interface.ts
│   ├── anthropic.ai-provider.ts      # or whichever provider
│   └── stub.ai-provider.ts           # deterministic local fixtures
└── etims/
    ├── etims-client.interface.ts
    └── ...                            # Phase 4
```

Dev environments use the stub implementations by default — new contributors don't need API keys to run the stack.

---

## Key Conventions Reference

See `AGENTS.md` for the full list. Quick reference:

- All monetary amounts: integer KES cents
- All IDs: UUID
- All dates: ISO 8601 UTC (display formatting to Africa/Nairobi is frontend-only)
- API responses: standard envelope `{ status, data }` or `{ status, message, code }`
- DB queries: always include `user_id` filter on user-scoped tables
- Soft deletes: `deletedAt` field; queries always filter `WHERE deleted_at IS NULL`
- User-facing copy: "kazipay generates", never "AI generates"
- Icons: inline SVG only — no CDN, no icon font
