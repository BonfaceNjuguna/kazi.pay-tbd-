# frontend/

React 18 + TypeScript + Vite + Tailwind. Two surfaces share this app:

- **Creative-facing** (dark theme) — dashboard, projects, settings.
- **Client-facing** (light theme) — public `/s/:token` share view, no auth.

See [`../AGENTS.md`](../AGENTS.md) for coding rules and [`../docs/`](../docs/) for product context.

## Quick start

```bash
# From repo root
pnpm install

# Generate the MSW service worker file (first-time setup, gitignored)
pnpm --filter @perxli/frontend exec msw init public/ --save

# Copy env defaults
cp frontend/.env.example frontend/.env

# Run
pnpm dev
```

Then open <http://localhost:5173>.

## Scripts

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Vite dev server with hot reload, MSW intercepting API calls |
| `pnpm build` | Type-check then produce a production bundle in `dist/` |
| `pnpm preview` | Serve the production bundle locally |
| `pnpm lint` | ESLint (fails on any warning) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest run once |
| `pnpm test:watch` | Vitest in watch mode |

## Where things live

```
src/
├── main.tsx               # bootstrap: MSW → QueryClient → Router → App
├── App.tsx                # delegates to routes
├── routes.tsx             # creative + client + auth route tree
├── layouts/               # CreativeLayout (dark), ClientLayout (light), AuthLayout
├── pages/                 # route-level components (creative/, client/, auth/)
├── components/
│   ├── ui/                # design-system primitives + icons (this scaffold)
│   └── features/          # domain components (added in Phase 1.8+)
├── hooks/                 # React Query hooks per domain (added with screens)
├── services/              # Axios call functions per domain (added with screens)
├── store/                 # Zustand slices (auth.store.ts here today)
├── lib/                   # api.ts, query-client.ts, msw.ts, cn.ts
├── mocks/                 # MSW handlers — grows as screens land
├── utils/                 # pure helpers (money.ts here today)
└── test/                  # vitest setup
```

## Design tokens

Source of truth is the `@theme` block in `src/index.css` (Tailwind 4's
CSS-based config replaced the old `tailwind.config.ts`). Tokens were extracted
from the three prototype HTML files at the repo root (`perxli_landing.html`,
`perxli_prototype.html`, `perxli_client.html`). See the file's header
comment for the mapping.
