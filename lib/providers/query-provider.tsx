// =============================================================================
// HarvestFile — Surface 2 Deploy 1: TanStack Query Provider
// lib/providers/query-provider.tsx
//
// Client component wrapping QueryClientProvider for the root layout.
// Configures global defaults for all TanStack Query hooks:
//   - staleTime: 2 minutes (server data considered fresh for 2 min)
//   - gcTime: 10 minutes (garbage collect unused cache after 10 min)
//   - retry: 2 (retry failed requests twice)
//   - refetchOnWindowFocus: true (refresh when farmer returns to tab)
//   - refetchOnReconnect: true (refresh on network reconnect — critical for rural 4G)
//
// This provider wraps ALL pages, but TanStack Query hooks are only called
// by components that import them — zero overhead for pages that don't use queries.
// =============================================================================

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Server data is considered fresh for 2 minutes
        staleTime: 2 * 60 * 1000,
        // Unused cache entries garbage collected after 10 minutes
        gcTime: 10 * 60 * 1000,
        // Retry failed requests twice (3 total attempts)
        retry: 2,
        // Refresh data when farmer returns to the tab
        refetchOnWindowFocus: true,
        // Refresh on network reconnect (critical for rural 4G drops)
        refetchOnReconnect: true,
        // Don't refetch when component mounts if data is still fresh
        refetchOnMount: true,
      },
    },
  });
}

// Singleton for browser — prevents creating new client on every render
let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always create a new client (prevents shared state between requests)
    return makeQueryClient();
  }
  // Browser: reuse the same client across renders
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
