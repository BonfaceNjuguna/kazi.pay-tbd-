import { AppRoutes } from '@/routes';

/**
 * Top-level App shell.
 *
 * Routing for the two surfaces (creative + client) lives in `routes.tsx`.
 * Theme is set via `data-theme` on a route layout — see CreativeLayout
 * (dark) and ClientLayout (light).
 */
export default function App() {
  return <AppRoutes />;
}
