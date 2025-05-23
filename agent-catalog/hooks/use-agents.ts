import { ethers, formatUnits } from "ethers";
import { UNIPAIR_ABI } from "@/utils/abi/uniswapPair";
import { AgentTier, calculatedAgentTier } from "@/utils/tierCalculator";
import type { Agent } from "@/types/agent";
import { CACHE_TTL } from "@/lib/query-client";
import { useQuery } from "wagmi/query";
import {
  CONTRACT_ADDRESS,
  getEthcallProvider,
  getMainContract,
  getMainEthcallContract,
  getProvider,
} from "@/lib/provider";


// Keys used to fetch agent metadata from the contract
const metadataKeys = [
  "name", "description", "image", "vrm_url", "bg_url",
  "tags", "agent_category", "chatbot_backend",
  "tts_backend", "stt_backend", "vision_backend",
];

/**
 * Custom React hook to fetch and manage agents.
 * Uses React Query for async data fetching with caching support.
 */
export function useAgents(agentId?: number) {
  const {
    data: agents = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: agentId !== undefined ? ["agent", agentId] : ["agents"],
    queryFn: () => fetchAgents(agentId),
  });

  return {
    agents,
    loading,
    error: error ? (error as Error).message : null,
  };
}

/**
 * Fetches all AI agents from the blockchain.
 * Uses localStorage for basic TTL caching to avoid redundant on-chain reads.
 */
export async function fetchAgents(agentId?: number): Promise<Agent[] | Agent | null> {
  const agentsCacheRaw = localStorage.getItem("agents");
  const timestampsRaw = localStorage.getItem("agent_timestamps");

  const agentsCache: Record<string, Agent> = agentsCacheRaw ? JSON.parse(agentsCacheRaw) : {};
  const timestamps: Record<string, number> = timestampsRaw ? JSON.parse(timestampsRaw) : {};
  const now = Date.now();

  // Check TTL if agentId is specified
  if (agentId !== undefined) {
    const idStr = String(agentId);
    const timestamp = timestamps[idStr];
    if (agentsCache[idStr] && timestamp && now - timestamp < CACHE_TTL) {
      console.log("Using cached single agent data");
      return agentsCache[idStr];
    }
  } else {
    // Check TTL for all agents
    const allValid = Object.entries(timestamps).every(([id, timestamp]) =>
      agentsCache[id] && now - timestamp < CACHE_TTL
    );
    if (Object.keys(agentsCache).length && allValid) {
      console.log("Using cached agents data");
      return Object.values(agentsCache);
    }
  }

  // --- FETCH from blockchain ---
  const provider = getProvider();
  const contract = getMainContract();
  const ethcallContract = getMainEthcallContract();
  const ethcallProvider = await getEthcallProvider();

  const tokenIds = agentId !== undefined
    ? [agentId]
    : Array.from({ length: Number(await contract.tokenIdCounter()) }, (_, i) => i);

  const metadataCalls = tokenIds.map((id) => ethcallContract.getMetadata(id, metadataKeys));
  const metadataResults = await ethcallProvider.all(metadataCalls);

  const pairContractCache = new Map<string, ethers.Contract>();
  const token0Cache = new Map<string, string>();

  const fetchedAgents: Agent[] = [];

  for (let i = 0; i < tokenIds.length; i++) {
    const tokenId = tokenIds[i];
    const metadata = metadataResults[i];
    if (!Array.isArray(metadata) || metadata.length === 0 || metadata[0] === "0x") continue;

    let price = 0;
    let tier: AgentTier = { name: "None", level: 0, stakedAIUS: 0 };

    try {
      const tokenData = await contract.getTokenData(tokenId);
      if ((tokenData as any[]).length > 4) {
        const [erc20Token, , reserve0, reserve1, pairAddress] = tokenData as any[];

        if (erc20Token && pairAddress) {
          if (!pairContractCache.has(pairAddress)) {
            pairContractCache.set(pairAddress, new ethers.Contract(pairAddress, UNIPAIR_ABI, provider));
          }
          const pairContract = pairContractCache.get(pairAddress)!;

          if (!token0Cache.has(pairAddress)) {
            const token0 = await pairContract.token0();
            token0Cache.set(pairAddress, token0);
          }

          const token0 = token0Cache.get(pairAddress)!;
          const [aiusReserve, tokenReserve] =
            token0 === erc20Token ? [reserve1, reserve0] : [reserve0, reserve1];

          const aius = parseFloat(formatUnits(aiusReserve, 18));
          const tokens = parseFloat(formatUnits(tokenReserve, 18));
          if (tokens > 0) price = aius / tokens;

          tier = calculatedAgentTier(aius);
        }
      } else {
        const [aius] = (await contract.getAiusAndOwed(tokenId, CONTRACT_ADDRESS)) || [BigInt(0)];
        tier = {
          name: "None",
          level: 0,
          stakedAIUS: Number(formatUnits(aius, 18)),
        };
      }
    } catch (err) {
      const reason = (err as any)?.revert?.args?.[0] ?? (err as any)?.reason;
      if (reason === "Pair not created") {
        console.warn(`Pair not created for token ${tokenId}`);
      } else {
         console.warn(`Failed to calculate price or tier for token ${tokenId}`, err);
      }
    }

    const [
      name, description, image, vrmUrl, bgUrl,
      tags, agentCategory, chatbotBackend,
      ttsBackend, sttBackend, visionBackend,
    ] = metadata;

    fetchedAgents.push({
      id: `${tokenId}`,
      name: name || "Unknown",
      token: "AINFT",
      description: description || "No description available",
      price,
      status: "status",
      avatar: image,
      category: agentCategory || "All Agents",
      tags: tags?.split(",") || [],
      tier,
      vrmUrl,
      bgUrl,
      config: {
        chatbotBackend,
        ttsBackend,
        sttBackend,
        visionBackend,
        amicaLifeBackend: "amicaLife",
      },
    });
  }

  // Update localStorage
  const updatedCache = { ...agentsCache };
  const updatedTimestamps = { ...timestamps };

  for (const agent of fetchedAgents) {
    updatedCache[agent.id] = agent;
    updatedTimestamps[agent.id] = now;
  }

  localStorage.setItem("agents", JSON.stringify(updatedCache));
  localStorage.setItem("agent_timestamps", JSON.stringify(updatedTimestamps));

  return agentId !== undefined
    ? updatedCache[String(agentId)] || null
    : Object.values(updatedCache);
}


/**
 * Merges two lists of agents based on unique ID, ensuring newer data overwrites old.
 */
function mergeAgents(cached: Agent[], fetched: Agent[]): Agent[] {
  const map = new Map<string, Agent>();
  [...cached, ...fetched].forEach((agent) => map.set(agent.id, agent));
  return Array.from(map.values());
}
