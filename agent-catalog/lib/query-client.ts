// lib/query-client.ts
import { QueryClient } from "@tanstack/react-query";

// Define constants that can be imported elsewhere
export const CACHE_TTL = 0.5 * 60 * 1000; // 0.5 minute in milliseconds

// Create a QueryClient with default options
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_TTL, // Use the same value as in your hooks
      gcTime: CACHE_TTL, // Use the same time for garbage collection
      retry: 1, // Only retry failed requests once
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
    },
  },
});