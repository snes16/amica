import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { parseEther } from "viem";
import { ERC721_ABI } from "@/utils/abi/erc721";

export function useReserveToken() {
  const { data: hash, isPending, writeContract, error: writeError } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: confirmError,
    data: receipt
  } = useWaitForTransactionReceipt({
    hash
  });

  const reserve = (tokenId: number, amountEth: string) => {
    const amount = parseEther(amountEth);
    writeContract({
      address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS! as `0x${string}`,
      abi: ERC721_ABI,
      functionName: "reserveTokens",
      args: [tokenId, amount],
    });
  };

  return {
    write: reserve,
    isLoading: isPending || isConfirming,
    isSuccess: isConfirmed,
    error: writeError || confirmError,
  };
}
