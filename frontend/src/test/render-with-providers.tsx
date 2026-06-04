import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';

/**
 * Render helper for component tests that need React Query + React Router.
 *
 * Each call creates a fresh QueryClient so state doesn't leak between tests.
 * Retries are disabled so a mock 401 doesn't get retried into a different
 * outcome mid-assertion.
 */
export function renderWithProviders(
  ui: ReactNode,
  options: {
    route?: string;
    routerEntries?: string[];
    renderOptions?: Omit<RenderOptions, 'wrapper'>;
  } = {},
) {
  const { route = '/', routerEntries, renderOptions } = options;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  const entries = routerEntries ?? [route];

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={entries}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}
