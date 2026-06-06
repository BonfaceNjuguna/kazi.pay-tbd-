import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query client.
 *
 * Defaults chosen for Perxli:
 *  - staleTime 30s: most reads (projects list, dashboard stats) are fine slightly stale.
 *  - retry once on transient failures — payments and signing must not silently retry.
 *  - refetchOnWindowFocus off for the client-share surface (clients reopening the tab
 *    should not silently re-fetch the document set mid-read). We override per-query
 *    where focus-refetch makes sense (creative dashboard).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
