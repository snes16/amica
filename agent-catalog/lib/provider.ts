import { ethers } from "ethers";
import { Contract as EthcallContract, Provider as EthcallProvider } from "ethcall";
import { ERC721_ABI } from "@/utils/abi/erc721";
import { UNIPAIR_ABI } from "@/utils/abi/uniswapPair";
import { ERC20_ABI } from "@/utils/abi/erc20";

// Validate environment
export const INFURA_RPC = process.env.NEXT_PUBLIC_INFURA_RPC;
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

if (!INFURA_RPC || !CONTRACT_ADDRESS) {
  throw new Error("Missing environment variables: NEXT_PUBLIC_INFURA_RPC or NEXT_PUBLIC_CONTRACT_ADDRESS");
}

// Singleton Ethers Provider
class EthersProviderSingleton {
  private static _instance: ethers.JsonRpcProvider | null = null;

  static getInstance(): ethers.JsonRpcProvider {
    if (!this._instance) {
      if (!INFURA_RPC) {
        throw new Error("Missing INFURA_RPC");
      }
      this._instance = new ethers.JsonRpcProvider(INFURA_RPC);
    }
    return this._instance;
  }
}

// Singleton Main ERC20 Contract
class TokenContractSingleton {
  static getContract(address: string): ethers.Contract {
    return new ethers.Contract(address, ERC20_ABI, EthersProviderSingleton.getInstance());
  }
}

// Singleton Main ERC721 Contract
class MainContractSingleton {
  private static _instance: ethers.Contract | null = null;

  static getInstance(): ethers.Contract {
    if (!this._instance) {
      if (!CONTRACT_ADDRESS) {
        throw new Error("Missing CONTRACT_ADDRESS");
      }
      this._instance = new ethers.Contract(CONTRACT_ADDRESS, ERC721_ABI, EthersProviderSingleton.getInstance());
    }
    return this._instance;
  }
}

// Singleton Main Ethcall Contract
class MainEthcallContractSingleton {
  private static _instance: EthcallContract | null = null;

  static getInstance(): EthcallContract {
    if (!this._instance) {
      if (!CONTRACT_ADDRESS) {
        throw new Error("Missing CONTRACT_ADDRESS");
      }
      this._instance = new EthcallContract(CONTRACT_ADDRESS, ERC721_ABI);
    }
    return this._instance;
  }
}

// Singleton Ethcall Provider (Async)
class EthcallProviderSingleton {
  private static _instance: EthcallProvider | null = null;

  static async getInstance(): Promise<EthcallProvider> {
    if (this._instance) return this._instance;

    const provider = EthersProviderSingleton.getInstance();
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    const ethCallProvider = new EthcallProvider(chainId, provider);
    this._instance = ethCallProvider;
    return ethCallProvider;
  }
}

// Factory for Uniswap Pair Contract
class UniswapPairFactory {
  static getContract(address: string): ethers.Contract {
    return new ethers.Contract(address, UNIPAIR_ABI, EthersProviderSingleton.getInstance());
  }
}

// Exported API
export const getProvider = () => EthersProviderSingleton.getInstance();
export const getMainContract = () => MainContractSingleton.getInstance();
export const getMainEthcallContract = () => MainEthcallContractSingleton.getInstance();
export const getEthcallProvider = () => EthcallProviderSingleton.getInstance();
export const getUniswapPairContract = UniswapPairFactory.getContract;
export const getTokenContract = TokenContractSingleton.getContract;
