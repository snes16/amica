// lib/query-client.ts
import { QueryClient } from "@tanstack/react-query";

// Define constants that can be imported elsewhere
export const CACHE_TTL = 3 * 60 * 1000; // 3 minutes in milliseconds

// Create a QueryClient with default options
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_TTL, // Use the same value as in your hooks
      gcTime: CACHE_TTL, // Use the same time for garbage collection
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      refetchOnMount: false,
    },
  },
});