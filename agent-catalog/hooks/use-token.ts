import { PricePoint, SwapEvent, TransferEvent } from "@/types/token";
import { ethers, BigNumberish } from "ethers";
import { ERC20_ABI } from "@/utils/abi/erc20";
import { useQuery } from "@tanstack/react-query";
import {
  getMainContract,
  getProvider,
  getUniswapPairContract,
} from "@/lib/provider";

/**
 * React hook to fetch and return token statistics and historical pricing data
 * @param tokenId - ID of the token to fetch data for
 */
export function useTokens(tokenId: number) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["token-stats", tokenId],
    queryFn: () => fetchTokenStats(tokenId),
  });

  // Check if error message contains "Pair not created"
  const processedError =
    error && error instanceof Error && error.message.includes("Pair not created")
      ? "Pair not created"
      : (error as Error | null);

  return {
    stats: data?.stats || null,
    priceHistory: data?.priceHistory || [],
    tokenAddress: data?.tokenAddress || null,
    loading: isLoading,
    error: processedError,
  };
}

/**
 * Fetches token data from blockchain and computes market metrics
 */
async function fetchTokenStats(tokenId: number) {
  const provider = getProvider();
  const nftContract = getMainContract();

  const [erc20Token, totalSupply, reserve0, reserve1, pairAddress] =
    await nftContract.getTokenData(tokenId);

  if (!erc20Token || !pairAddress)
    throw "Pair not created";

  const pairContract = getUniswapPairContract(pairAddress);
  const tokenContract = new ethers.Contract(erc20Token, ERC20_ABI, provider);

  // Fetch required on-chain logs in parallel
  const [token0, swapLogs, transferLogs] = await Promise.all([
    pairContract.token0(),
    pairContract.queryFilter(pairContract.filters.Swap(), 0, "latest"),
    tokenContract.queryFilter(tokenContract.filters.Transfer(), 0, "latest"),
  ]);

  const { aiusReserveParsed, tokenReserveParsed } = parseReserves({
    reserve0,
    reserve1,
    token0,
    erc20Token,
  });

  const totalSupplyParsed = parseFloat(ethers.formatUnits(totalSupply, 18));
  const price =
    tokenReserveParsed === 0 ? 0 : aiusReserveParsed / tokenReserveParsed;

  const marketCap = price * totalSupplyParsed;
  const tvl = 2 * aiusReserveParsed; // Total Value Locked in liquidity pool

  const swapEvents = await enrichSwapEvents(swapLogs, provider);
  const pastPrice = computePastPrice(swapEvents, price, erc20Token, token0);
  const change24h =
    pastPrice !== 0 ? ((price - pastPrice) / pastPrice) * 100 : 0;

  const volume = compute24hVolume(swapEvents);

  // Unique holders based on transfer event recipients
  const holders = new Set(
    transferLogs
      .filter((e) => "args" in e)
      .map((e) => (e as unknown as TransferEvent).args.to),
  ).size;

  const priceHistory = generatePriceHistory(
    swapEvents,
    erc20Token,
    token0,
    price,
  );

  return {
    stats: { marketCap, tvl, price, volume, holders, change24h },
    priceHistory,
    tokenAddress: erc20Token,
  };
}

/**
 * Helper to determine which reserve belongs to the token vs AIUS
 */
function parseReserves({
  reserve0,
  reserve1,
  token0,
  erc20Token,
}: {
  reserve0: BigNumberish;
  reserve1: BigNumberish;
  token0: string;
  erc20Token: string;
}) {
  const [tokenReserve, aiusReserve] =
    token0 === erc20Token ? [reserve0, reserve1] : [reserve1, reserve0];

  return {
    tokenReserveParsed: parseFloat(ethers.formatUnits(tokenReserve, 18)),
    aiusReserveParsed: parseFloat(ethers.formatUnits(aiusReserve, 18)),
  };
}

/**
 * Enhances swap events by attaching block timestamps for time-based analytics
 */
async function enrichSwapEvents(
  events: any[],
  provider: ethers.Provider,
): Promise<SwapEvent[]> {
  const blockCache = new Map<number, number>();

  const enrichedEvents = await Promise.all(
    events.map(async (event) => {
      if (!("args" in event)) return null;

      if (!blockCache.has(event.blockNumber)) {
        const block = await provider.getBlock(event.blockNumber);
        if (block) blockCache.set(event.blockNumber, block.timestamp);
      }

      return {
        args: {
          amount0In: event.args.amount0In,
          amount0Out: event.args.amount0Out,
          amount1In: event.args.amount1In,
          amount1Out: event.args.amount1Out,
        },
        blockTimestamp: blockCache.get(event.blockNumber)!,
      };
    }),
  );

  return enrichedEvents.filter((e): e is SwapEvent => e !== null);
}

/**
 * Computes the token price 24 hours ago using historical swap events
 */
function computePastPrice(
  events: SwapEvent[],
  currentPrice: number,
  erc20Token: string,
  token0: string,
): number {
  const timestamp24hAgo = Math.floor(Date.now() / 1000) - 86400;

  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.blockTimestamp <= timestamp24hAgo) {
      const [in0, out0, in1, out1] = [
        getFloat(e.args.amount0In),
        getFloat(e.args.amount0Out),
        getFloat(e.args.amount1In),
        getFloat(e.args.amount1Out),
      ];

      const amount0 = in0 - out0;
      const amount1 = out1 - in1;

      if (amount1 !== 0) return amount0 / amount1;
    }
  }

  return currentPrice;
}

/**
 * Calculates total 24-hour trading volume from swap events
 */
function compute24hVolume(events: SwapEvent[]): number {
  const now = Math.floor(Date.now() / 1000);
  return events
    .filter((e) => now - e.blockTimestamp <= 86400)
    .reduce((sum, e) => {
      return (
        sum +
        getFloat(e.args.amount0In) +
        getFloat(e.args.amount0Out) +
        getFloat(e.args.amount1In) +
        getFloat(e.args.amount1Out)
      );
    }, 0);
}

/**
 * Generates a time-series price history from swap events
 */
function generatePriceHistory(
  events: SwapEvent[],
  erc20Token: string,
  token0: string,
  currentPrice: number,
): PricePoint[] {
  const history: PricePoint[] = events
    .map((e) => {
      const [in0, out0, in1, out1] = [
        getFloat(e.args.amount0In),
        getFloat(e.args.amount0Out),
        getFloat(e.args.amount1In),
        getFloat(e.args.amount1Out),
      ];

      let price = 0;
      if (token0 === erc20Token) {
        if (in0 > 0 && out1 > 0) price = out1 / in0;
        else if (in1 > 0 && out0 > 0) price = in1 / out0;
      } else {
        if (in1 > 0 && out0 > 0) price = out0 / in1;
        else if (in0 > 0 && out1 > 0) price = in0 / out1;
      }

      return {
        x: new Date(e.blockTimestamp * 1000).toISOString(),
        y: price,
      };
    })
    // Filter out unrealistic values
    .filter((d) => isFinite(d.y) && d.y > 0.01 && d.y < 1_000_000)
    .sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());

  // Append current price to the history
  history.push({ x: new Date().toISOString(), y: currentPrice });

  return history;
}

/**
 * Utility to parse a BigNumberish value into a float
 */
function getFloat(val: BigNumberish | undefined): number {
  return parseFloat(ethers.formatUnits(val ?? 0, 18));
}
