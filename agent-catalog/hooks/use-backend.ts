"use client";

import { useQuery } from "@tanstack/react-query";
import { backendKeyMap } from "@/features/diagnosed/backendKeys";
import { getMainContract } from "@/lib/provider";

/**
 * Extracts a flat list of key names and a mapping of backend keys from agent configuration.
 *
 * @param agentConfig - A record containing backend type to backend name mapping.
 * @returns keysMap - Object mapping each backend name to its relevant keys.
 *          keysList - A flattened list of all metadata keys needed.
 */
export function extractKeyNames(agentConfig: Record<string, string>) {
  const keysMap: Record<string, string[]> = {};

  for (const backendType in agentConfig) {
    const backendName = agentConfig[backendType];
    const mappedKeys = backendKeyMap[backendName];
    if (mappedKeys) {
      keysMap[backendName] = mappedKeys;
    }
  }

  const keysList = Object.values(keysMap).flat();
  return { keysMap, keysList };
}

/**
 * React hook to fetch backend metadata for a given agent.
 *
 * @param agentId - NFT/Agent token ID.
 * @param agentConfig - Backend configuration of the agent.
 * @returns Object with metadata result, loading state, and error if any.
 */
export function useBackend(agentId: number, agentConfig: Record<string, string>) {
  const { keysMap, keysList } = extractKeyNames(agentConfig);

  const queryEnabled = agentId !== undefined && keysList.length > 0;

  const {
    data: backendData,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["backend", agentId, keysList],
    queryFn: () => fetchBackend(agentId, keysList, keysMap),
    staleTime: 10 * 60 * 1000, // Cache data for 10 minutes
    enabled: queryEnabled,
  });

  return {
    data: backendData,
    loading,
    error: error ? (error as Error).message : null,
  };
}

/**
 * Fetches backend metadata from the smart contract in a single call using batch keys.
 *
 * @param agentId - The token ID to fetch metadata for.
 * @param keysList - A flat array of all metadata keys to fetch.
 * @param keysMap - A mapping of backend names to their respective metadata keys.
 * @returns A structured object mapping backend names to their metadata values.
 */
export async function fetchBackend(
  agentId: number,
  keysList: string[],
  keysMap: Record<string, string[]>
): Promise<Record<string, Record<string, string>>> {
  try {
    const mainContract = getMainContract();
    const metadata: string[] = await mainContract.getMetadata(agentId, keysList);

    if (!metadata || metadata.length !== keysList.length) {
      throw new Error("Incomplete metadata response");
    }

    const result: Record<string, Record<string, string>> = {};
    let index = 0;

    // Assign metadata values back to the appropriate backend sections
    for (const backendName in keysMap) {
      result[backendName] = {};
      for (const field of keysMap[backendName]) {
        result[backendName][field] = metadata[index++];
      }
    }

    return result;
  } catch (err) {
    console.error("Error fetching backend metadata:", err);
    throw new Error("Failed to fetch backend metadata");
  }
}
