import { BigNumberish } from "ethers";

export interface TokenStats {
  marketCap: number;
  tvl: number;
  price: number;
  volume: number;
  holders: number;
  change24h: number;
}

export interface PricePoint {
  x: string; // ISO timestamp
  y: number; // price
}

export interface SwapEvent {
  args: {
    amount0In: BigNumberish;
    amount0Out: BigNumberish;
    amount1In: BigNumberish;
    amount1Out: BigNumberish;
  };
  blockTimestamp: number;
}

export interface TransferEvent {
  args: { to: string };
}