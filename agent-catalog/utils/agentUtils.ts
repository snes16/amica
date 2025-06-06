import { tiers } from "../components/agent-tiers";
import { ethers, formatUnits } from "ethers";
import { UNIPAIR_ABI } from "@/utils/abi/uniswapPair";
import { CONTRACT_ADDRESS } from "@/lib/provider";

// Find the highest tier that the stakedAIUS qualifies for
export type AgentTier = {
  name: "None" | "Newborn" | "Baby" | "Child" | "Teen" | "Adult";
  level: number;
  stakedAIUS: number;
};

// Calculates price based on tokenData and blockchain reserves
export async function calculatePrice(
  contract: ethers.Contract,
  provider: ethers.Provider,
  pairContractCache: Map<string, ethers.Contract>,
  token0Cache: Map<string, string>,
  tokenData: any[],
): Promise<number[]> {
  if (tokenData.length <= 4) return [0, 0];

  const [erc20Token, , reserve0, reserve1, pairAddress] = tokenData;

  if (!erc20Token || !pairAddress) return [0, 0];

  if (!pairContractCache.has(pairAddress)) {
    pairContractCache.set(
      pairAddress,
      new ethers.Contract(pairAddress, UNIPAIR_ABI, provider),
    );
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

  if (tokens === 0) return [0, 0];

  return [aius, aius / tokens];
}

// Calculates tier based on AIUS staked amount or tokenId
export async function calculateTier(
  contract: ethers.Contract,
  tokenId: number,
  price: number,
  stakedAius: number,
  tokenData: any[],
): Promise<AgentTier> {
  if (tokenData.length > 4) {
    const staked = stakedAius * 1; // price already calculated based on reserves
    const currentTierIndex = tiers
      .map((tier, index) => ({ ...tier, index }))
      .filter((tier) => staked >= tier.requiredAIUS)
      .sort((a, b) => b.requiredAIUS - a.requiredAIUS)[0];

    return {
      name: (currentTierIndex?.name as AgentTier["name"]) || "None",
      level: currentTierIndex?.index != null ? currentTierIndex.index : 0,
      stakedAIUS: staked,
    };
  } else {
    // fallback: get AIUS directly
    const [aius] = (await contract.getAiusAndOwed(
      tokenId,
      CONTRACT_ADDRESS,
    )) || [BigInt(0)];
    return {
      name: "None",
      level: 0,
      stakedAIUS: Number(formatUnits(aius, 18)),
    };
  }
}
