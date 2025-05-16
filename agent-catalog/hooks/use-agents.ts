"use client";

import { ethers } from "ethers";
import type { Agent } from "@/types/agent";
import { ERC721_ABI } from "@/utils/abi/erc721";
import { useQuery } from "@tanstack/react-query";
import { CACHE_TTL } from "@/lib/query-client";
import { UNIPAIR_ABI } from "@/utils/abi/uniswapPair";

const metadataKeys = [
  "name",
  "description",
  "image",
  "vrm_url",
  "bg_url",
  "tags",
  "chatbot_backend",
  "tts_backend",
  "stt_backend",
  "vision_backend",
];

const chunkSize = 10;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export function useAgents() {
  const {
    data: agents = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["agents"],
    queryFn: fetchAgents,
  });

  return { agents, loading, error: error ? (error as Error).message : null };
}

async function fetchAgents(): Promise<Agent[]> {
  const cachedData = localStorage.getItem("agents");
  const cachedTimestamp = localStorage.getItem("agents_timestamp");
  const now = Date.now();

  if (
    cachedData &&
    cachedTimestamp &&
    now - parseInt(cachedTimestamp, 10) < CACHE_TTL
  ) {
    return JSON.parse(cachedData) as Agent[];
  }

  const INFURA_RPC = process.env.NEXT_PUBLIC_INFURA_RPC;
  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

  if (!INFURA_RPC || !CONTRACT_ADDRESS) {
    throw new Error("Missing required environment variables.");
  }

  const provider = new ethers.JsonRpcProvider(INFURA_RPC);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ERC721_ABI, provider);

  const totalNFTs = Number(await contract.tokenIdCounter());
  const tokenIds = Array.from({ length: totalNFTs }, (_, i) => i);
  const fetchedAgents: Agent[] = [];

  for (let i = 0; i < tokenIds.length; i += chunkSize) {
    await delay(300);
    
    const chunk = tokenIds.slice(i, i + chunkSize);

    const results = await Promise.all(
      chunk.map(async (tokenId) => {
        try {
          const [metadata, tokenData] = await Promise.all([
            contract.getMetadata(tokenId, metadataKeys),
            contract.getTokenData(tokenId),
          ]);

          if (!metadata?.length || metadata[0] === "0x") return null;

          const [erc20Token, , reserve0, reserve1, pairAddress] = tokenData;
          let price = 0;

          if (erc20Token && pairAddress) {
            try {
              const pairContract = new ethers.Contract(
                pairAddress,
                UNIPAIR_ABI,
                provider,
              );
              const token0 = await pairContract.token0();

              const [aiusReserve, tokenReserve] =
                token0 === erc20Token
                  ? [reserve1, reserve0]
                  : [reserve0, reserve1];

              const aius = parseFloat(ethers.formatUnits(aiusReserve, 18));
              const tokens = parseFloat(ethers.formatUnits(tokenReserve, 18));
              if (tokens > 0) price = aius / tokens;
            } catch (innerError: any) {
              const reason = innerError?.revert?.args?.[0] ?? innerError?.reason ?? "";
              if (reason !== "Pair not created") {
                console.error(
                  `Error fetching pair data for token ${tokenId}:`,
                  innerError,
                );
              }
              // price remains 0
            }
          }

          const [
            name,
            description,
            image,
            vrmUrl,
            bgUrl,
            tags,
            chatbotBackend,
            ttsBackend,
            sttBackend,
            visionBackend,
          ] = metadata;

          return {
            id: `${tokenId}`,
            name: name || "Unknown",
            token: "AINFT",
            description: description || "No description available",
            price,
            status: "active",
            avatar: image,
            category: "System",
            tags: tags?.split(",") || [],
            tier: { name: "Teen", level: 4, stakedAIUS: 5000 },
            vrmUrl,
            bgUrl,
            config: {
              chatbotBackend,
              ttsBackend,
              sttBackend,
              visionBackend,
              amicaLifeBackend: "amicaLife",
            },
          } satisfies Agent;
        } catch (err: any) {
          const reason = err?.revert?.args?.[0] ?? err?.reason ?? "";
          if (reason !== "Pair not created") {
            console.error(`Token ${tokenId} error:`, err);
          }
          
          return null;
        }
      }),
    );

    fetchedAgents.push(...(results.filter(Boolean) as Agent[]));
  }

  const cachedAgents = cachedData ? (JSON.parse(cachedData) as Agent[]) : [];
  const updatedAgents = mergeAgents(cachedAgents, fetchedAgents);

  localStorage.setItem("agents", JSON.stringify(updatedAgents));
  localStorage.setItem("agents_timestamp", now.toString());

  return updatedAgents;
}

function mergeAgents(cached: Agent[], fetched: Agent[]): Agent[] {
  const map = new Map<string, Agent>();
  [...cached, ...fetched].forEach((agent) => map.set(agent.id, agent));
  return Array.from(map.values());
}
