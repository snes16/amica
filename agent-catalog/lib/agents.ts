import { supabase } from "@/utils/supabase";
import { ethers } from "ethers";
import { AgentTier, calculatePrice, calculateTier } from "@/utils/agentUtils";
import type { Agent } from "@/types/agent";
import {
  getEthcallProvider,
  getMainContract,
  getMainEthcallContract,
  getProvider,
} from "@/lib/provider";
import { decodeAgentId } from "@/utils/fileUtils";

export async function getAgentsFromSupabase(agentId?: string | null) {
  let query = supabase.from("agents").select("*");

  if (agentId) {
    query = query.eq("agentId", agentId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Fetch and enrich agents with price and tier info
export async function fetchAgentPriceAndTiers(
  agents: Agent | Agent[],
): Promise<Agent | Agent[]> {
  const agentArray = Array.isArray(agents) ? agents : [agents];

  const provider = getProvider();
  const contract = getMainContract();
  const pairContractCache = new Map<string, ethers.Contract>();
  const token0Cache = new Map<string, string>();

  const updatedAgents: Agent[] = [];

  for (const agent of agentArray) {
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

  // Return a single Agent if the input was a single Agent
  return Array.isArray(agents) ? updatedAgents : updatedAgents[0];
}

export const METADATA_KEYS = [
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

export async function getAgentFromContract(
  agentId: string,
): Promise<Agent | null> {
  const ethcallContract = getMainEthcallContract();
  const ethcallProvider = await getEthcallProvider();

  const tokenId = decodeAgentId(agentId);
  const [metadata] = await ethcallProvider.all([
    ethcallContract.getMetadata(tokenId, METADATA_KEYS),
  ]);

  if (!Array.isArray(metadata) || metadata.length === 0 || metadata[0] === "0x") {
    console.warn(`No metadata found for tokenId: ${tokenId}`);
    return null;
  }

  const [
    agentid,
    name,
    description,
    image,
    vrmUrl,
    bgUrl,
    tags,
    agentCategory,
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

  const agent: Agent = {
    id: `${tokenId}`,
    agentId: agentid,
    name: name || "Unknown",
    token: "AINFT",
    description: description || "No description available",
    price: 0,
    status: "status",
    avatar: image,
    category: agentCategory || "All Agents",
    tags: tags?.split(",") || [],
    tier: { name: "None", level: 0, stakedAIUS: 0 },
    vrmUrl,
    bgUrl,
    config: {
      chatbot,
      tts,
      stt,
      vision,
      amicaLife: "amicaLife",
      rvc: "rvc",
    },
    integrations,
    systemPrompt,
    visionSystemPrompt,
  };
  return agent;
}
