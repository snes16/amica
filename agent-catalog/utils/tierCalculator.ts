import { Agent } from "http"
import { tiers } from "../components/agent-tiers"

// Find the highest tier that the stakedAIUS qualifies for
export type AgentTier = {
  name: "None" | "Newborn" | "Baby" | "Child" | "Teen" | "Adult"
  level: number
  stakedAIUS: number
}

export function calculatedAgentTier(stakedAIUS: number): AgentTier {
  const currentTierIndex = tiers
    .map((tier, index) => ({ ...tier, index }))
    .filter((tier) => stakedAIUS >= tier.requiredAIUS)
    .sort((a, b) => b.requiredAIUS - a.requiredAIUS)[0]

  return {
    name: (currentTierIndex?.name as AgentTier["name"]) || "None",
    level: currentTierIndex?.index != null ? currentTierIndex.index : 0,
    stakedAIUS,
  }
}
