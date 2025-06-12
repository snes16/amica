import { supabase } from "@/utils/supabase";
import { ethers } from "ethers";
import { AgentTier, calculatePrice, calculateTier } from "@/utils/agentUtils";
import type { Agent } from "@/types/agent";
import {
  getMainContract,
  getProvider,
} from "@/lib/provider";

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