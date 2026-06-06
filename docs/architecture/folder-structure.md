# Project Folder Structure

**Last Updated:** 2026-05-30

---

## Root

```
perxli/
├── CLAUDE.md                       # Product context (read first)
├── AGENTS.md                       # AI agent + developer guide
├── perxli_landing.html            # Standalone marketing prototype
├── perxli_prototype.html          # Standalone creative dashboard prototype
├── perxli_client.html             # Standalone client sign-off prototype
├── docker-compose.yml              # Production-like multi-service setup
├── docker-compose.dev.yml          # Dev overrides (hot reload, exposed ports)
├── .env.example                    # All required env vars with descriptions
├── .gitignore
├── .editorconfig
├── pnpm-workspace.yaml             # Monorepo workspace config
├── turbo.json                      # Turborepo pipeline (optional)
├── backend/
├── frontend/
└── docs/
```

The three `perxli_*.html` files are standalone — they don't import from each other or from the React app. They're reference prototypes that the real React app should match in design and flow.

---

## Backend

```
backend/
├── Dockerfile
├── package.json
├── tsconfig.json                   # extends ../tsconfig.base.json
├── .env                            # local only, gitignored
├── prisma/
│   ├── schema.prisma               # Single source of truth for DB schema
│   ├── seed.ts                     # Dev seed: demo creative (Rowlex Karimi) + example project
│   └── migrations/                 # Generated migration files (committed)
└── src/
    ├── index.ts                    # Entry point: create app, start server
    ├── app.ts                      # Express app factory (no listen call)
    ├── config/
    │   └── env.ts                  # zod parse of process.env, exported as config
    ├── routes/
    │   ├── index.ts                # Mount all routers under /api/v1
    │   ├── auth.routes.ts
    │   ├── brand-settings.routes.ts
    │   ├── clients.routes.ts
    │   ├── projects.routes.ts
    │   ├── documents.routes.ts
    │   ├── deliverables.routes.ts
    │   ├── payments.routes.ts
    │   ├── mpesa.routes.ts         # Daraja callback handler
    │   ├── share.routes.ts         # Public client-side share endpoints
    │   ├── subscriptions.routes.ts
    │   └── admin.routes.ts         # Super-admin only
    ├── controllers/                # Thin: parse request, call service, return
    │   ├── auth.controller.ts
    │   ├── projects.controller.ts
    │   ├── documents.controller.ts
    │   ├── share.controller.ts
    │   └── ...
    ├── services/                   # All business logic
    │   ├── auth.service.ts
    │   ├── projects.service.ts     # Phase state machine lives here
    │   ├── documents/
    │   │   ├── document-generation.service.ts   # Calls AI provider
    │   │   ├── document-templates/              # 12 type-specific renderers
    │   │   └── document-preview.service.ts
    │   ├── signing.service.ts      # Type-to-sign, audit hash
    │   ├── payments.service.ts     # M-Pesa orchestration, reconciliation
    │   ├── reminders.service.ts    # AI payment reminders (Pro)
    │   ├── share-links.service.ts
    │   └── subscriptions.service.ts
    ├── repositories/               # Prisma queries, scoped to user_id
    │   ├── prisma.client.ts        # Singleton Prisma client
    │   ├── users.repository.ts
    │   ├── projects.repository.ts
    │   ├── documents.repository.ts
    │   ├── signatures.repository.ts
    │   ├── payments.repository.ts
    │   ├── share-links.repository.ts
    │   └── ...
    ├── integrations/               # External APIs behind interfaces
    │   ├── mpesa/
    │   │   ├── mpesa-client.interface.ts
    │   │   ├── daraja.mpesa-client.ts
    │   │   └── stub.mpesa-client.ts
    │   ├── whatsapp/
    │   │   ├── whatsapp-client.interface.ts
    │   │   ├── cloud-api.whatsapp-client.ts
    │   │   └── stub.whatsapp-client.ts
    │   ├── ai/
    │   │   ├── ai-provider.interface.ts
    │   │   └── stub.ai-provider.ts
    │   └── etims/                  # Phase 4
    │       ├── etims-client.interface.ts
    │       └── stub.etims-client.ts
    ├── middlewares/
    │   ├── require-user.ts         # Verifies JWT, attaches req.user (creative side)
    │   ├── share-token-auth.ts     # Resolves share token → req.share (client side)
    │   ├── require-role.ts         # RBAC middleware factory
    │   ├── require-feature.ts      # Subscription-tier gate
    │   ├── validate.ts             # Zod schema validation middleware
    │   ├── error-handler.ts        # Centralized error formatter
    │   ├── rate-limit.ts
    │   └── request-logger.ts       # With PII redaction
    ├── schemas/
    │   ├── auth.schema.ts
    │   ├── projects.schema.ts
    │   ├── documents.schema.ts
    │   ├── share.schema.ts
    │   └── ...
    ├── types/
    │   ├── express.d.ts            # Augments req.user and req.share types
    │   ├── api.types.ts            # Shared API types (ApiResponse, etc.)
    │   ├── phases.ts               # ProjectPhase, DocumentStatus enums
    │   └── ...
    ├── workers/                    # Phase 4 — BullMQ workers
    │   ├── document-generation.worker.ts
    │   ├── reminders.worker.ts
    │   ├── mpesa-reconciliation.worker.ts
    │   └── ...
    └── utils/
        ├── app-error.ts            # Typed error class
        ├── logger.ts               # Pino logger with PII redaction
        ├── money.ts                # int KES cents ↔ display conversion helpers
        ├── dates.ts                # UTC ↔ Africa/Nairobi helpers
        ├── crypto.ts               # Hashing helpers, audit_hash computation
        └── share-token.ts          # 32-byte token generator
```

---

## Frontend

```
frontend/
├── Dockerfile
├── nginx.conf                      # NGINX config for serving static build
├── package.json
├── tsconfig.json
├── vite.config.ts                  # Includes @tailwindcss/vite plugin
├── eslint.config.js                # ESLint 9+ flat config
├── index.html
├── public/                         # Manrope ships via @fontsource (npm, not /public)
└── src/
    ├── index.css                   # Tailwind 4 @theme tokens live here
    │                                  (#141414, #D4F53C, #8B5CF6, Manrope, etc.)
    ├── main.tsx                    # React root, QueryClient, Router setup
    ├── routes.tsx                  # Centralized route definitions (React Router v6)
    ├── assets/
    │   ├── logo.svg
    │   └── icons/                  # Inline SVG icon components
    ├── components/
    │   ├── ui/                     # Design-system primitives (both themes)
    │   │   ├── Button.tsx
    │   │   ├── Input.tsx
    │   │   ├── Select.tsx
    │   │   ├── Modal.tsx
    │   │   ├── Card.tsx
    │   │   ├── Badge.tsx
    │   │   ├── Spinner.tsx
    │   │   ├── Checkbox.tsx
    │   │   ├── Accordion.tsx
    │   │   └── index.ts            # Barrel export
    │   └── features/               # Domain-scoped components
    │       ├── auth/
    │       │   ├── LoginForm.tsx
    │       │   └── ProtectedRoute.tsx
    │       ├── brand-settings/
    │       │   ├── LogoUploader.tsx
    │       │   └── TypeToSignCapture.tsx
    │       ├── projects/
    │       │   ├── ProjectCard.tsx
    │       │   ├── ProjectWizard/
    │       │   │   ├── Step1ClientInfo.tsx
    │       │   │   ├── Step2ProjectDetails.tsx
    │       │   │   └── Step3PaymentTerms.tsx
    │       │   └── PhaseTabs.tsx
    │       ├── documents/
    │       │   ├── DocumentPicker.tsx     # Grouped checkbox UI
    │       │   ├── DocumentPreview.tsx
    │       │   └── DocumentInlineEditor.tsx
    │       ├── signing/
    │       │   ├── TypeToSign.tsx
    │       │   └── ReadProgressTracker.tsx
    │       ├── payments/
    │       │   └── MpesaSTKPrompt.tsx
    │       └── client-view/               # Client-facing components (light theme)
    │           ├── SenderCard.tsx
    │           ├── DocumentAccordion.tsx
    │           └── ConfirmationScreen.tsx
    ├── hooks/                      # React Query hooks (one file per domain)
    │   ├── useAuth.ts
    │   ├── useBrandSettings.ts
    │   ├── useProjects.ts
    │   ├── useDocuments.ts
    │   ├── useShareLink.ts
    │   ├── usePayments.ts
    │   ├── useFeature.ts           # Subscription-tier feature gate
    │   └── ...
    ├── layouts/
    │   ├── CreativeLayout.tsx      # Dark mode, top nav, no sidebar
    │   ├── ClientLayout.tsx        # Light mode, minimal chrome
    │   └── AuthLayout.tsx          # Centered card for login/register
    ├── pages/
    │   ├── creative/
    │   │   ├── auth/
    │   │   │   ├── LoginPage.tsx
    │   │   │   ├── RegisterPage.tsx
    │   │   │   └── ForgotPasswordPage.tsx
    │   │   ├── DashboardPage.tsx
    │   │   ├── projects/
    │   │   │   ├── ProjectsPage.tsx
    │   │   │   ├── NewProjectPage.tsx
    │   │   │   └── ProjectDetailPage.tsx
    │   │   └── settings/
    │   │       ├── BrandSettingsPage.tsx
    │   │       └── SubscriptionPage.tsx
    │   └── client/
    │       └── SharePage.tsx       # /s/:token
    ├── services/                   # Axios API call functions (called by hooks)
    │   ├── api.ts                  # Axios instance with interceptors
    │   ├── auth.service.ts
    │   ├── projects.service.ts
    │   ├── documents.service.ts
    │   ├── share.service.ts
    │   └── ...
    ├── store/                      # Zustand global state
    │   ├── auth.store.ts           # Current user, access token, login/logout
    │   ├── subscription.store.ts   # Tier + feature flags
    │   └── ui.store.ts             # Theme, global notifications
    ├── types/
    │   ├── api.types.ts            # ApiResponse<T>, PaginatedResponse<T>
    │   ├── auth.types.ts
    │   ├── project.types.ts
    │   ├── document.types.ts
    │   ├── share.types.ts
    │   └── ...
    └── utils/
        ├── money.ts                # Format integer KES cents for display
        ├── dates.ts                # Format/parse dates; EAT helpers
        ├── cn.ts                   # Tailwind class merge helper (clsx + twMerge)
        └── sanitize.ts             # Sanitize AI-generated HTML
```

---

## Docs

```
docs/
├── dev-roadmap.md                  # Current phase + milestone index
├── architecture/
│   ├── system-overview.md          # Architecture diagram + request lifecycle
│   └── folder-structure.md         # ← This file
├── milestones/
│   ├── phase-1-foundation.md
│   ├── phase-2-projects-documents-signing.md
│   ├── phase-3-payments-pro.md
│   └── phase-4-launch.md
├── decisions/
│   ├── ADR-001-stack-selection.md
│   ├── ADR-002-authentication.md
│   ├── ADR-003-database-design.md
│   ├── ADR-004-api-design.md
│   └── ADR-005-deployment.md
├── visions/
│   ├── product-vision.md
│   └── future-features.md
└── deployment/
    ├── local-setup.md
    └── environment-variables.md
```

---

## Naming Rules (Quick Reference)

| Thing | Convention | Example |
|-------|-----------|---------|
| Source files | kebab-case | `project.service.ts` |
| React components | PascalCase | `ProjectCard.tsx` |
| Directories | kebab-case | `client-view/` |
| Test files | co-located | `project.service.test.ts` |
| DB tables | snake_case | `project_share_links` |
| Env vars | UPPER_SNAKE | `MPESA_CONSUMER_KEY` |
