import { ethers } from "ethers";
import { UNIPAIR_ABI } from "@/utils/abi/uniswapPair";
import { AgentTier, calculatePrice, calculateTier } from "@/utils/agentUtils";
import type { Agent } from "@/types/agent";
import { useQuery } from "wagmi/query";
import {
  getMainContract,
  getMainEthcallContract,
  getEthcallProvider,
  getProvider,
} from "@/lib/provider";
import { decodeAgentId } from "@/utils/fileUtils";
import { supabase } from "@/utils/supabase";
import { extractKeyNames } from "./use-backend";

// Metadata keys defined in the smart contract
const METADATA_KEYS = [
  "agent_id",
  "name",
  "description",
  "image",
  "vrm_url",
  "bg_url",
  "tags",
  "agent_category",
  "chatbot_backend",
  "tts_backend",
  "stt_backend",
  "vision_backend",
  "brain",
  "virtuals",
  "eacc",
  "uos",
  "system_prompt",
  "vision_system_prompt",
];

// Public React hook to load agent(s)
export function useAgents(agentId?: string) {
  const {
    data: agents = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["agents", agentId],
    queryFn: () => fetchAgents(agentId),
  });

  return {
    agents,
    loading: isLoading,
    error: error ? (error as Error).message : null,
  };
}

// Fetch agent(s) from blockchain and sync with Supabase
export async function fetchAgents(
  agentId?: string,
): Promise<Agent[] | Agent | null> {
  const contract = getMainContract();
  const tokenIds = agentId
    ? [decodeAgentId(agentId)]
    : Array.from(
        { length: Number(await contract.tokenIdCounter()) },
        (_, i) => i,
      );

  const syncedAgents = await syncSupabaseWithBlockchain(tokenIds, contract);
  const enrichedAgents = await fetchAgentPriceAndTiers(syncedAgents);

  return agentId
    ? enrichedAgents.find((a) => a.agentId === agentId) || null
    : enrichedAgents;
}

// Sync metadata from blockchain into Supabase
export async function syncSupabaseWithBlockchain(
  tokenIds: number[],
  contract: ethers.Contract,
): Promise<Agent[]> {
  const ethcallContract = getMainEthcallContract();
  const ethcallProvider = await getEthcallProvider();

  const idsToCheck = tokenIds.map(String);

  // 🧩 Fetch only relevant agents from Supabase
  const { data: existingAgents = [], error } = await supabase
    .from("agents")
    .select("*")
    .in("id", idsToCheck);

  if (error) {
    console.error("Failed to fetch agents from Supabase:", error);
    return [];
  }

  // Ensure consistent string types for comparison
  const existingIds = new Set(existingAgents?.map((agent) => String(agent.id)));

  // Compare using the same string format
  const missingTokenIds = tokenIds.filter((id) => !existingIds.has(String(id)));

  // 🧱 If all agents are already in Supabase, return them
  if (missingTokenIds.length === 0) return existingAgents!;

  // 🔍 Fetch missing metadata from the blockchain
  // const metadataCalls = missingTokenIds.map((id) => {
  //   return ethcallProvider
  //     .all([ethcallContract.getMetadata(id, METADATA_KEYS)])
  //     .then(([result]) => ({ id, result }))
  //     .catch((error) => ({ id, error }));
  // });

  // const metadataResults = await Promise.all(metadataCalls);

  // metadataResults.forEach((res) => {
  //   if ("error" in res) {
  //     console.error(`Error fetching metadata for ${res.id}:`, res.error);
  //   } else {
  //     const result = res.result as any[];
  //     console.log(`Metadata for ${res.id}:`, result[1]);
  //   }
  // });

  const metadataCalls = missingTokenIds.map((id) =>
    ethcallContract.getMetadata(id, METADATA_KEYS),
  );
  const metadataResults = await ethcallProvider.all(metadataCalls);

  console.log("Metadata Results : ", metadataResults);

  const newAgents: Agent[] = [];
  const newBackends: object[] = [];

  for (let i = 0; i < missingTokenIds.length; i++) {
    // const res = metadataResults[i];
    // if (!("result" in res)) {
    //   // Skip if there was an error fetching metadata
    //   continue;
    // }
    // const metadata = res.result;
    const metadata = metadataResults[i]
    const tokenId = missingTokenIds[i];

    if (
      !Array.isArray(metadata) ||
      metadata.length === 0 ||
      metadata[0] === "0x"
    )
      continue;

    const [
      agentId,
      name,
      description,
      image,
      vrmUrl,
      bgUrl,
      tags,
      category,
      chatbot,
      tts,
      stt,
      vision,
      brain,
      virtuals,
      eacc,
      uos,
      systemPrompt,
      visionSystemPrompt,
    ] = metadata;

    const integrations: Record<string, string> = {};
    if (brain) integrations.brain = brain;
    if (virtuals) integrations.virtuals = virtuals;
    if (eacc) integrations.eacc = eacc;
    if (uos) integrations.uos = uos;

    const config = {
      chatbot,
      tts,
      stt,
      vision,
      amicaLife: "amicaLife",
      rvc: "rvc",
    };

    newAgents.push({
      id: String(tokenId),
      agentId,
      name: name || "Unknown",
      description: description || "No description available",
      status: "status", // optional: update dynamically
      avatar: image,
      token: "AINFT",
      category: category || "All Agents",
      tags: tags?.split(",") || [],
      vrmUrl,
      bgUrl,
      config,
      integrations,
      systemPrompt,
      visionSystemPrompt,
    });

    const { keysMap, keysList } = extractKeyNames(config);
    const backendLists: string[] = await contract.getMetadata(
      tokenId,
      keysList,
    );

    if (!backendLists || backendLists.length !== backendLists.length) {
      throw new Error("Incomplete metadata response");
    }

    const backendResult: Record<string, Record<string, string>> = {};
    let index = 0;

    // Assign metadata values back to the appropriate backend sections
    for (const backendName in keysMap) {
      backendResult[backendName] = {};
      for (const field of keysMap[backendName]) {
        backendResult[backendName][field] = backendLists[index++];
      }
    }

    newBackends.push({ agentId, ...backendResult });
  }

  if (newAgents.length > 0) {
    const { error: agentsUpsertError } = await supabase
      .from("agents")
      .upsert(newAgents);
    const { error: backendUpsertError } = await supabase
      .from("agent-backend")
      .upsert(newBackends);

    if (agentsUpsertError) {
      console.error("Failed to upsert agents:", agentsUpsertError);
    }
    if (backendUpsertError) {
      console.error("Failed to upsert backends:", backendUpsertError);
    }
  }

  return [...existingAgents!, ...newAgents];
}

// Fetch and enrich agents with price and tier info
export async function fetchAgentPriceAndTiers(
  agents: Agent[],
): Promise<Agent[]> {
  const provider = getProvider();
  const contract = getMainContract();
  const pairContractCache = new Map<string, ethers.Contract>();
  const token0Cache = new Map<string, string>();

  const updatedAgents: Agent[] = [];

  for (const agent of agents) {
    const tokenId = Number(agent.id);
    let price = 0;
    let stakedAius = 0;
    let tier: AgentTier = { name: "None", level: 0, stakedAIUS: 0 };

    try {
      const tokenData = await contract.getTokenData(tokenId);
      [stakedAius, price] = await calculatePrice(
        contract,
        provider,
        pairContractCache,
        token0Cache,
        tokenData,
      );
      tier = await calculateTier(
        contract,
        tokenId,
        price,
        stakedAius,
        tokenData,
      );
    } catch (err) {
      const reason = (err as any)?.revert?.args?.[0] ?? (err as any)?.reason;
      if (reason === "Pair not created") {
        console.warn(`Token ${tokenId}: Pair not created`);
      } else {
        console.warn(
          `Failed to calculate price/tier for token ${tokenId}`,
          err,
        );
      }
    }

    updatedAgents.push({ ...agent, price, tier });
  }

  return updatedAgents;
}
