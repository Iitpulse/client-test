"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isRetryable } from "./student-api";

/**
 * TanStack Query for the signed-in student screens (plan: Design system > Data fetching). Responses are per student
 * and `no-store` on the server; this cache only makes tab switches and back navigation instant.
 * 30 s fresh, refetch when the student comes back to the tab, retry twice only on network errors and 5xx.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 10 * 60_000,
            refetchOnWindowFocus: true,
            retry: (count, err) => count < 2 && isRetryable(err),
          },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
