"use client";

import { useQuery } from "@tanstack/react-query";
import { ethers } from "ethers";
import { backendKeyMap } from "@/features/diagnosed/backendKeys";
import { ERC721_ABI } from "@/utils/abi/erc721";

export function extractKeyNames(agentConfig: Record<string, string>) {
  const keysMap: Record<string, string[]> = {};

  for (const backendType in agentConfig) {
    const backendName = agentConfig[backendType];
    if (backendKeyMap[backendName]) {
      keysMap[backendName] = backendKeyMap[backendName];
    }
  }

  const keysList = Object.values(keysMap).flat();
  return { keysMap, keysList };
}

export function useBackend(agentId: number, agentConfig: Record<string, string>) {
  const { keysMap, keysList } = extractKeyNames(agentConfig);

  const {
    data: backendData,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["backend", agentId, keysList],
    queryFn: () => fetchBackend(agentId, keysList, keysMap),
    staleTime: 10 * 60 * 1000, // 5 minutes
  });

  return {
    data: backendData,
    loading,
    error: error ? (error as Error).message : null,
  };
}

// --- FETCHER: fetchBackend ---
export async function fetchBackend(
  agentId: number,
  keysList: string[],
  keysMap: Record<string, string[]>
): Promise<Record<string, Record<string, string>>> {
  const INFURA_RPC = process.env.NEXT_PUBLIC_INFURA_RPC;
  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

  if (!INFURA_RPC || !CONTRACT_ADDRESS) {
    throw new Error("Missing environment variables");
  }

  const provider = new ethers.JsonRpcProvider(INFURA_RPC);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ERC721_ABI, provider);

  try {
    const metadata: string[] = await contract.getMetadata(agentId, keysList);
    if (!metadata || metadata.length !== keysList.length) {
      throw new Error("Incomplete metadata response");
    }

    // Reconstruct backend result
    const result: Record<string, Record<string, string>> = {};
    let index = 0;

    for (const backendName in keysMap) {
      const fields = keysMap[backendName];
      result[backendName] = {};

      for (const field of fields) {
        result[backendName][field] = metadata[index++];
      }
    }

    return result;
  } catch (err) {
    console.error("Error fetching backend metadata:", err);
    throw new Error("Failed to fetch backend metadata");
  }
}
