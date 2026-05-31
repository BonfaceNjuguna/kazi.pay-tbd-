# ADR-004 — REST API Design Conventions

**Date:** 2026-05-30
**Status:** Accepted
**Deciders:** Rowlex (Founder/Lead)

---

## Context

KaziPay's backend exposes a REST API consumed by the React frontend (creative side), the public client-facing share page (no auth), and eventually third-party integrations. Consistent conventions reduce friction for both AI agents and human developers adding new endpoints.

---

## Decisions

### 1. Base path and versioning

All routes are prefixed: `/api/v1/`

Version bump only on breaking changes (e.g., removing a field, changing a response shape). Additive changes (new fields) do not require a new version.

The public client-facing share endpoint lives under `/api/v1/share/:token` to make the auth boundary visually obvious in route lists.

---

### 2. Resource naming

- Plural nouns for collections: `/projects`, `/documents`, `/clients`, `/payments`
- kebab-case for multi-word resources: `/project-share-links`, `/brand-settings`
- Nested routes for clear ownership (max 2 levels deep):

```
GET  /api/v1/projects/:projectId/documents
GET  /api/v1/projects/:projectId/deliverables
POST /api/v1/projects/:projectId/share
GET  /api/v1/share/:token
POST /api/v1/share/:token/sign
```

---

### 3. HTTP verbs

| Action | Verb | Example |
|--------|------|---------|
| List | `GET` | `GET /projects` |
| Get one | `GET` | `GET /projects/:id` |
| Create | `POST` | `POST /projects` |
| Full replace | `PUT` | `PUT /brand-settings` |
| Partial update | `PATCH` | `PATCH /projects/:id` |
| Delete | `DELETE` | `DELETE /projects/:id` |
| Actions/commands | `POST` | `POST /projects/:id/advance-phase`, `POST /documents/:id/generate` |

Use `POST` for state-transition actions (advance phase, send link, mark delivered, void document) — do not encode these in `PATCH status`.

---

### 4. Response envelope

**Success:**
```json
{
  "status": "success",
  "data": { ... }
}
```

**Success (list):**
```json
{
  "status": "success",
  "data": [ ... ],
  "meta": {
    "total": 42,
    "page": 1,
    "pageSize": 20,
    "pageCount": 3
  }
}
```

**Error:**
```json
{
  "status": "error",
  "message": "Human-readable description",
  "code": "SNAKE_CASE_ERROR_CODE"
}
```

**Validation error:**
```json
{
  "status": "error",
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": [
    { "field": "email", "message": "Invalid email address" }
  ]
}
```

---

### 5. HTTP status codes

| Situation | Code |
|-----------|------|
| Success (read) | `200` |
| Success (created) | `201` |
| Success (accepted, async) | `202` |
| Success (no content) | `204` |
| Validation error | `400` |
| Unauthenticated | `401` |
| Forbidden (wrong role / feature-gated) | `403` |
| Not found | `404` |
| Conflict (duplicate, illegal state transition) | `409` |
| Rate limited | `429` |
| Server error | `500` |

Use `202 Accepted` for endpoints that kick off async work (document generation, M-Pesa STK Push initiation, WhatsApp send).

---

### 6. Pagination

All list endpoints support cursor or offset pagination via query params:

```
GET /projects?page=2&pageSize=20
GET /projects?cursor=<lastId>&pageSize=20
```

Default `pageSize`: 20. Maximum: 100. Response includes `meta` object (see above).

---

### 7. Filtering and sorting

```
GET /projects?phase=DELIVERY&clientId=uuid
GET /projects?sort=updatedAt&order=desc
```

Filter params use camelCase matching field names. Sort defaults to `createdAt desc`.

---

### 8. Date format

All dates and timestamps use **ISO 8601 UTC**: `2026-05-30T10:00:00Z`.

Display formatting (e.g., to EAT) is the frontend's responsibility.

---

### 9. Money format

All amounts in API responses are **integers in KES cents**, accompanied by a `currency` field:

```json
{ "totalAmount": 1250000, "currency": "KES" }
```

Frontend formats with thousands separators for display: `KES 12,500`.

---

### 10. Error codes

Error codes are UPPER_SNAKE_CASE and domain-specific. Document them alongside the endpoint. Examples:

```
VALIDATION_ERROR
UNAUTHENTICATED
FORBIDDEN
NOT_FOUND
DUPLICATE_EMAIL
INVALID_PHASE_TRANSITION
FREE_TIER_PROJECT_LIMIT
FREE_TIER_DOC_LOCKED
FEATURE_GATED
SHARE_LINK_EXPIRED
SHARE_LINK_REVOKED
DOCUMENT_ALREADY_SIGNED
SIGNATURE_REQUIRES_ALL_READ
MPESA_CALLBACK_INVALID
PAYMENT_ALREADY_CONFIRMED
WHATSAPP_DELIVERY_FAILED
```

---

## Consequences

- Every new endpoint must return the standard envelope — no raw responses.
- Zod schemas validate request bodies and produce `VALIDATION_ERROR` responses automatically via middleware.
- API clients (frontend `services/`) must handle `{ status: 'error' }` responses uniformly through the Axios interceptor.
- The client-side share endpoints follow the same envelope but use share-token auth instead of JWT (see ADR-002).
- Future OpenAPI spec generation will be based on Zod schemas (using `zod-to-openapi` or similar).
