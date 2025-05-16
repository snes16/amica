"use client";

import type { Agent } from "@/types/agent";
import VRMDemo from "./vrm-demo";
import { PriceChart } from "./price-chart";
import { TokenData } from "./token-data";
import { AgentDescription } from "./agent-description";
import { SocialMediaButtons } from "./social-media-buttons";
import { AgentTags } from "./agent-tags";
import { AgentTiers } from "./agent-tiers";
import { Button } from "./ui/button";
import { MessageSquare, ArrowRightLeft } from "lucide-react";
import { Integrations } from "./integrations";
import { useEffect, useState } from "react";
import { useTokens } from "@/hooks/use-token";
import { AlertTriangle } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useReserveToken } from "@/hooks/use-reserve-token";
import { useAccount, useReadContract } from "wagmi";
import { ERC721_ABI } from "@/utils/abi/erc721";
import { formatUnits } from "ethers";
import { ERC20_ABI } from "@/utils/abi/erc20";
import { AgentVrmDiagnosis } from "./agent-diagnosis";

interface AgentDetailsProps {
  agent: Agent;
}

const AMICA_URL = process.env.NEXT_PUBLIC_AMICA_URL as string;

export function AgentDetails({ agent }: AgentDetailsProps) {
  const [vrmLoaded, setVrmLoaded] = useState(false);
  const [vrmError, setVrmError] = useState(false);
  const { stats, priceHistory, tokenAddress, loading, error } = useTokens(Number(agent.id));
  const [reserveAmount, setReserveAmount] = useState("");
  const { isConnected, address } = useAccount();
  const { write: reserveTokens, isLoading: reserving, isSuccess: reserveSuccess, error: reserveError } = useReserveToken();
  const { data, isLoading: loadingAius, refetch: refetchAiusData } = useReadContract({
    address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS! as `0x${string}`,
    abi: ERC721_ABI,
    functionName: "getAiusAndOwed",
    args: [BigInt(agent.id), address],
    query: { enabled: isConnected && !!address },
  });

  const [aius, owed] = (data as [bigint, bigint]) || [BigInt(0), BigInt(0)];

  const { data : aiusAmount, refetch: refetchAiusAmount} = useReadContract({
    address: process.env.NEXT_PUBLIC_AIUS_CONTRACT_ADDRESS! as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
    query: { enabled: isConnected && !!address },
  });
  

  const formattedAius = aius ? formatUnits(aius, 18) : "0.0";
  const formattedOwed = owed ? formatUnits(owed, 18) : "0.0";

  const isPairNotCreated = error == "Pair not created";

  useEffect(() => {
    if (reserveSuccess) {
      refetchAiusData();
      refetchAiusAmount();
      setReserveAmount("");
    }
  }, [refetchAiusData, reserveSuccess, refetchAiusAmount]);
  
  if (loading) {
    return (
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (error && !isPairNotCreated) {
    return (
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b">
        <div className="p-4 text-red-500">Error loading agents: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-5xl font-orbitron font-bold text-gray-900 mb-2 text-center">
          {agent.name}
        </h1>
        <div className="absolute top-4 right-4">
          <ConnectButton />
        </div>
        <p className="text-center text-gray-500 mb-2 font-roboto-mono">
          {agent.token} | {agent.tier.name} (Level {agent.tier.level})
        </p>

        {isPairNotCreated && (
          <div className="p-6 bg-yellow-100 text-yellow-700 rounded-lg flex items-center">
            <AlertTriangle className="mr-2" />
            Pair not created yet.
          </div>
        )}


        {!isPairNotCreated && (<TokenData stats={stats} />)}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12">
          <div className="space-y-12">
            <VRMDemo
              vrmUrl={agent.vrmUrl}
              bgUrl={agent.bgUrl}
              onLoaded={() => setVrmLoaded(true)}
              onError={() => setVrmError(true)}
            />

          {!isPairNotCreated && (<PriceChart priceHistory={isPairNotCreated ? [] : priceHistory} />)}
          <AgentVrmDiagnosis vrmLoaded={vrmLoaded} vrmError={vrmError} agentId={agent.id} agentConfig={agent.config}/>
          </div>
          <div className="space-y-8">
            <div className="flex justify-center space-x-4 mb-8">
              <Button
                className="bg-blue-500 hover:bg-blue-600 text-white font-roboto-mono"
                onClick={() =>
                  window.open(`${AMICA_URL}/agent/${agent.id}`, "_blank", "noopener,noreferrer")
                }
              >
                <MessageSquare className="mr-2 h-4 w-4" /> Chat
              </Button>
              {isPairNotCreated ? (
                <div className={isConnected ? "w-full max-w-sm space-y-4 p-4 border rounded-2xl shadow-md bg-white" : ""}>
                  {isConnected && (
                    <>
                      <label className="block text-sm font-medium text-gray-700 font-roboto-mono mb-1">
                        Your AIUS balance : {Number(formatUnits(aiusAmount as bigint, 18)).toFixed(2)}
                      </label>

                      <div className="w-full max-w-sm p-4 mb-4 bg-gray-50 border rounded-xl shadow-sm text-sm text-gray-700 font-roboto-mono">
                        <div className="flex justify-between">
                          <span className="font-semibold">AIUS Deposited on token:</span>
                          <span className="text-blue-600">{formattedAius ? formattedAius.toString() : loadingAius ? "Loading..." : "0"}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="font-semibold">Your Own AINFT:</span>
                          <span className="text-green-600">{formattedOwed ? formattedOwed.toString() : loadingAius ? "Loading..." : "0"}</span>
                        </div>
                      </div>


                      <div className="relative">
                        <input
                          type="number"
                          min="0.1"
                          max={100 - Number(formattedAius)}
                          step="0.1"
                          value={reserveAmount}
                          onChange={(e) => {
                            const inputValue = parseFloat(e.target.value);
                            const maxLimit = 100 - Number(formattedAius);
                            if (!isNaN(inputValue) && inputValue <= maxLimit) {
                              setReserveAmount(e.target.value);
                            } else if (e.target.value === "") {
                              setReserveAmount(""); 
                            }
                          }}
                          placeholder={`${100 - Number(formattedAius)} AIUS before added liquidity`}
                          className="w-full pl-4 pr-16 py-3 text-sm border rounded-xl shadow-sm font-roboto-mono focus:outline-none focus:ring-2 focus:ring-yellow-400"
                        />
                        <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 font-semibold text-sm">
                          AIUS
                        </span>
                      </div>
                    </>
                  )}

                  <Button
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-roboto-mono py-3 rounded-xl"
                    onClick={() => {
                      if (!isConnected) {
                        alert("Please connect your wallet first.");
                        return;
                      }
                      reserveTokens(Number(agent.id), reserveAmount);
                    }}
                    disabled={reserving}
                  >
                    {reserving ? "Reserving..." : (
                      <>
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Reserve Token
                      </>
                    )}
                  </Button>

                  {reserveError && !reserveError?.message?.toLowerCase().includes("user rejected") && (
                    <div className="text-red-600 text-sm font-roboto-mono">{reserveError.message}</div>
                  )}
                </div>
              ) : (
                <Button
                  className="bg-pink-500 hover:bg-pink-600 text-white font-roboto-mono"
                  onClick={() =>
                    window.open(
                      `https://app.uniswap.org/#/swap?inputCurrency=${tokenAddress}`,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                >
                  <ArrowRightLeft className="mr-2 h-4 w-4" /> Buy/Sell on Uniswap
                </Button>
              )}
            </div>
            <AgentDescription description={agent.description} />
            <SocialMediaButtons />
            <AgentTags tags={agent.tags} />
            <AgentTiers currentTier={agent.tier} />
            <Integrations />
          </div>
        </div>
      </div>
    </div>
  );
}
