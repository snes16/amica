"use client";

import { ethers } from "ethers";
import type { Agent } from "@/types/agent";
import { ERC721_ABI } from "@/utils/abi/erc721";
import { useQuery } from "@tanstack/react-query";
import { CACHE_TTL } from "@/lib/query-client"; 

export function useAgents() {
  const {
    data: agents = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    // These will fall back to the defaults in queryClient if not specified
    // You can override them here if needed for this specific query
  });

  return { agents, loading, error: error ? (error as Error).message : null };
}

async function fetchAgents(): Promise<Agent[]> {
  try {
    // Load cached agents from localStorage
    const cachedData = localStorage.getItem("agents");
    const cachedTimestamp = localStorage.getItem("agents_timestamp");
    
    const now = Date.now();
    const isCacheValid = cachedData && cachedTimestamp && 
      (now - parseInt(cachedTimestamp, 10)) < CACHE_TTL;
    
    // Return cached data if it's still valid
    if (isCacheValid) {
      return JSON.parse(cachedData) as Agent[];
    }
    
    const INFURA_RPC = process.env.NEXT_PUBLIC_INFURA_RPC;
    const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

    if (!CONTRACT_ADDRESS || !INFURA_RPC) {
      throw new Error("Environment variables are not defined");
    }

    const provider = new ethers.JsonRpcProvider(INFURA_RPC);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ERC721_ABI, provider);

    // Get total number of tokens
    const totalNFTs = await contract.tokenIdCounter();
    
    // Create batch of token IDs (in chunks to avoid too large requests)
    const tokenIds = Array.from({ length: Number(totalNFTs) }, (_, i) => i);
    const metadataKeys = ["name", "description", "image", "vrm_url", "bg_url", "tags", "chatbot_backend", "tts_backend", "stt_backend", "vision_backend"];
    
    // Fetch in chunks of 20 tokens at a time to avoid request size limits
    const chunkSize = 20;
    const fetchedAgents: Agent[] = [];
    
    for (let i = 0; i < tokenIds.length; i += chunkSize) {
      const chunk = tokenIds.slice(i, i + chunkSize);
      
      // Create a multicall-style batch of promises
      const promises = chunk.map(tokenId => 
        contract.getMetadata(tokenId, metadataKeys)
          .then((metadata: string[]) => {
            if (!metadata || metadata.length === 0 || metadata[0] === "0x") {
              return null;
            }
            
            return {
              id: `${tokenId}`,
              name: metadata[0] || "Unknown",
              token: "AINFT",
              description: metadata[1] || "No description available",
              price: 0,
              status: "active",
              avatar: metadata[2],
              category: "System",
              tags: metadata[5].split(","),
              tier: { name: "Teen", level: 4, stakedAIUS: 5000 },
              vrmUrl: metadata[3],
              bgUrl: metadata[4],
              config: {
                chatbotBackend: metadata[6],
                ttsBackend: metadata[7],
                sttBackend: metadata[8],
                visionBackend: metadata[9],
                amicaLifeBackend: "amicaLife", 
              }
            };
          })
          .catch(err => {
            console.error(`Error fetching metadata for token ${tokenId}:`, err);
            return null;
          })
      );
      
      // Execute batch
      const results = await Promise.all(promises);
      fetchedAgents.push(...results.filter(Boolean) as Agent[]);
    }

    // Merge with existing cached data if there was any
    const cachedAgents = cachedData ? JSON.parse(cachedData) as Agent[] : [];
    const updatedAgents = mergeAgents(cachedAgents, fetchedAgents);

    // Store updated data in localStorage with timestamp
    localStorage.setItem("agents", JSON.stringify(updatedAgents));
    localStorage.setItem("agents_timestamp", now.toString());
    
    return updatedAgents;
  } catch (err) {
    console.error("Error fetching agents:", err);
    throw new Error("Failed to fetch agents");
  }
}

function mergeAgents(cached: Agent[], fetched: Agent[]): Agent[] {
  const agentMap = new Map<string, Agent>();

  // Add cached agents first
  cached.forEach(agent => agentMap.set(agent.id, agent));

  // Update or add new fetched agents
  fetched.forEach(agent => agentMap.set(agent.id, agent));

  return Array.from(agentMap.values());
}