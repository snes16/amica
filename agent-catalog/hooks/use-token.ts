import { useState, useEffect } from "react";
import { ethers, BigNumberish } from "ethers";
import { ERC721_ABI } from "@/utils/abi/erc721";
import { ERC20_ABI } from "@/utils/abi/erc20";
import { UNIPAIR_ABI } from "@/utils/abi/uniswapPair";
import { useQuery } from "@tanstack/react-query";

interface TokenStats {
  marketCap: number;
  tvl: number;
  price: number;
  volume: number;
  holders: number;
  change24h: number;
}

interface SwapEvent {
  args: {
    amount0In: BigNumberish;
    amount0Out: BigNumberish;
    amount1In: BigNumberish;
    amount1Out: BigNumberish;
  };
  blockTimestamp: number;
}

interface TransferEvent {
  args: { to: string };
}

const INFURA_URL = process.env.NEXT_PUBLIC_INFURA_RPC;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

if (!INFURA_URL || !CONTRACT_ADDRESS) {
  console.error("Missing environment variables.");
  throw new Error("Environment variables not defined.");
}

const provider = new ethers.JsonRpcProvider(INFURA_URL);

export function useTokens(tokenId: number) {
  const {
    data,
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["token-stats", tokenId],
    queryFn: () => fetchTokenStats(tokenId),
  });

  const stats = data?.stats || null;
  const priceHistory = data?.priceHistory || [];
  const tokenAddress = data?.tokenAddress || null;

  return {
    stats,
    priceHistory,
    tokenAddress,
    loading,
    error: error as Error | null | "Pair not created",
  };
}

async function fetchTokenStats(tokenId: number) {
  try {
    if(!CONTRACT_ADDRESS) {
      throw new Error("Contract address is not defined.");
    }

    const nftContract = new ethers.Contract(
      CONTRACT_ADDRESS,
      ERC721_ABI,
      provider
    );
    const [erc20Token, totalSupply, reserve0, reserve1, pairAddress] =
      await nftContract.getTokenData(tokenId);

    // used for swapping
    // console.log(erc20Token)

    if (!erc20Token || !pairAddress)
      throw new Error("Invalid token data received.");

    const pairContract = new ethers.Contract(
      pairAddress,
      UNIPAIR_ABI,
      provider
    );
    const tokenContract = new ethers.Contract(erc20Token, ERC20_ABI, provider);

    const [token0, swapFilter, transferFilter] = await Promise.all([
      pairContract.token0(),
      pairContract.queryFilter(pairContract.filters.Swap(), 0, "latest"),
      tokenContract.queryFilter(tokenContract.filters.Transfer(), 0, "latest"),
    ]);

    const aiusReserve = token0 === erc20Token ? reserve1 : reserve0;
    const tokenReserve = token0 === erc20Token ? reserve0 : reserve1;

    const tokenReserveParsed = parseFloat(ethers.formatUnits(tokenReserve, 18));
    const aiusReserveParsed = parseFloat(ethers.formatUnits(aiusReserve, 18));
    const totalSupplyParsed = parseFloat(ethers.formatUnits(totalSupply, 18));

    const price =
      tokenReserveParsed === 0 ? 0 : aiusReserveParsed / tokenReserveParsed;
    const marketCap = price * totalSupplyParsed;
    const tvl = 2 * aiusReserveParsed;

    const blockCache = new Map();
    const swapEvents: SwapEvent[] = await Promise.all(
      swapFilter.map(async (event) => {
        if (!("args" in event)) return null;

        if (!blockCache.has(event.blockNumber)) {
          const block = await provider.getBlock(event.blockNumber);
          if (block) blockCache.set(event.blockNumber, block.timestamp);
        }

        return {
          args: {
            amount0In: event.args.amount0In as BigNumberish,
            amount0Out: event.args.amount0Out as BigNumberish,
            amount1In: event.args.amount1In as BigNumberish,
            amount1Out: event.args.amount1Out as BigNumberish,
          },
          blockTimestamp: blockCache.get(event.blockNumber),
        };
      })
    ).then((events) => events.filter((e): e is SwapEvent => e !== null));

    const now = Math.floor(Date.now() / 1000);
    const timestamp24hAgo = now - 86400;

    const getFloat = (val?: BigNumberish): number =>
      parseFloat(ethers.formatUnits(val ?? BigInt(0), 18));

    const findClosestPastPrice = (): number => {
      const sortedEvents = [...swapEvents].sort(
        (a, b) => a.blockTimestamp - b.blockTimestamp
      );

      for (let i = sortedEvents.length - 1; i >= 0; i--) {
        const e = sortedEvents[i];
        if (e.blockTimestamp <= timestamp24hAgo) {
          
          const amount0In = getFloat(e.args.amount0In);
          const amount0Out = getFloat(e.args.amount0Out);
          const amount1In = getFloat(e.args.amount1In);
          const amount1Out = getFloat(e.args.amount1Out);

          const amount0 = amount0In - amount0Out;
          const amount1 = amount1Out - amount1In;

          if (amount1 !== 0) {
            return amount0 / amount1;
          }
        }
      }

      return price; // fallback
    };

    const pastPrice = findClosestPastPrice();
    const change24h = pastPrice !== 0 ? ((price - pastPrice) / pastPrice) * 100 : 0;

    const last24hEvents = swapEvents.filter(
      (e) => now - e.blockTimestamp <= 86400
    );
    const volume = last24hEvents.reduce((sum, e) => {
      return (
        sum +
        parseFloat(ethers.formatUnits(e.args.amount0In, 18)) +
        parseFloat(ethers.formatUnits(e.args.amount0Out, 18)) +
        parseFloat(ethers.formatUnits(e.args.amount1In, 18)) +
        parseFloat(ethers.formatUnits(e.args.amount1Out, 18))
      );
    }, 0);

    const transferEvents: TransferEvent[] = transferFilter
      .map((event) =>
        "args" in event ? { args: { to: event.args.to as string } } : null
      )
      .filter((e): e is TransferEvent => e !== null);
    const holders = new Set(transferEvents.map((e) => e.args.to)).size;

    const sortedSwaps = swapEvents
      .map((e) => {
        const amount0In = getFloat(e.args.amount0In);
        const amount0Out = getFloat(e.args.amount0Out);
        const amount1In = getFloat(e.args.amount1In);
        const amount1Out = getFloat(e.args.amount1Out);
        let price = 0;
        if (amount0In > 0 && amount1Out > 0) {
          price = amount1Out / amount0In;
        } else if (amount1In > 0 && amount0Out > 0) {
          price = amount0Out / amount1In;
        }

        return {
          x: new Date(e.blockTimestamp * 1000).toISOString(),
          y: price,
        };
      })
      .filter((d) => isFinite(d.y))
      .sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());

    const finalPriceHistory = sortedSwaps.length
      ? sortedSwaps
      : [{ x: new Date().toISOString(), y: price }];

    const cleanedPriceHistory = finalPriceHistory.filter(
      (p) => p.y > 0.01 && p.y < 1_000_000
    );

    return {
      stats: { marketCap, tvl, price, volume, holders, change24h },
      priceHistory: cleanedPriceHistory,
      tokenAddress: erc20Token,
    };
  } catch (error) {
    const reason = (error as any)?.revert?.args?.[0] ?? (error as any)?.reason;

    if (reason === "Pair not created") {
      console.warn("Pair not created");
      throw "Pair not created";
    } else {
      console.error("Error fetching token stats:", error);
      throw error;
    }
  }
}
