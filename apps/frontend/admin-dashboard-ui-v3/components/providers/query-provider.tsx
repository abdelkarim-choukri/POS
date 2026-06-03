"use client"

import { useState, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

/**
 * App-wide TanStack Query provider.
 *
 * A single QueryClient is created per browser session (via useState initializer
 * so it is stable across re-renders and never shared between requests on the
 * server). Defaults are tuned for an internal dashboard: short staleness,
 * single retry, no refetch-on-focus storms.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
