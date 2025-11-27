"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * React Query Provider for data fetching and caching
 * 
 * Configuration:
 * - staleTime: 5 minutes - Data considered fresh for 5 minutes
 * - cacheTime: 10 minutes - Cached data retained for 10 minutes
 * - retry: 1 - Retry failed queries once
 * - refetchOnWindowFocus: false - Don't refetch when window regains focus
 */
export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
