import { ethers } from "ethers";
import { pinFileToIPFS, cidify } from "@/utils/ipfs";
import ArbiusAbi from "./abis/arbius.json";
import ERC20Abi from "./abis/erc20.json";
import { arbiusProcessSteps } from "@/components/arbiusModelProcess";
import { config } from "@/utils/config";

export type ArbiusState = {
  currentStep: number;
  completedSteps: number[];
  isProcessing: boolean;
  taskId?: string;
  result?: string;
  ipfs?: string;
  error?: string;
};

const arbiusAddress = process.env.NEXT_PUBLIC_ARBIUS_ADDRESS as `0x${string}`;
const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS as `0x${string}`;

export class ArbiusModel {
  address?: string;
  signer?: ethers.Signer;
  provider?: ethers.Provider;
  wsProvider?: ethers.WebSocketProvider;
  setArbiusState?: (state: ArbiusState) => void;
  arbiusState: ArbiusState;

  constructor() {
    this.arbiusState = {
      currentStep: 0,
      completedSteps: [],
      isProcessing: false,
    };
  }

  public async initialize(
    signer: ethers.Signer,
    setArbiusState: (state: ArbiusState) => void
  ) {
    this.signer = signer;
    this.provider = signer.provider!;
    this.wsProvider = new ethers.WebSocketProvider(process.env.NEXT_PUBLIC_WS_PROVIDER! as string);
    this.setArbiusState = setArbiusState;
    this.address = await signer.getAddress();

    this.bootupChecks()
  }

  private async bootupChecks() {
    const token = new ethers.Contract(tokenAddress, ERC20Abi, this.signer);

    console.log(`Wallet address: ${this.address}`);
    const balance = await token.balanceOf(this.address);
    console.log(`Arbius balance: ${ethers.formatEther(balance)}`);
  
    const allowance = await token.allowance(this.address, arbiusAddress);
    console.log('Allowance:', ethers.formatEther(allowance));
    if (allowance < balance) {
      console.log('Approving Arbius to spend tokens');
      const tx = await token.approve(arbiusAddress, ethers.MaxUint256);
      const receipt = await tx.wait();
      console.log('tx:', receipt.transactionHash);
    }
  }

  public resetState() {
    this.updateState({
      currentStep: 0,
      completedSteps: [],
      isProcessing: false,
      taskId: undefined,
      result: undefined,
      error: undefined,
    });
  }

  private updateState(updates: Partial<ArbiusState>) {
    if (!this.setArbiusState) return;
    this.arbiusState = { ...this.arbiusState, ...updates };
    this.setArbiusState(this.arbiusState);
  }

  private advanceStep() {
    const { currentStep, completedSteps } = this.arbiusState;
    const nextStep = currentStep + 1;

    if (nextStep < arbiusProcessSteps.length) {
      this.updateState({
        completedSteps: [...completedSteps, currentStep],
        currentStep: nextStep,
      });
      return true;
    }

    // Finish final step
    if (!completedSteps.includes(currentStep)) {
      this.updateState({
        completedSteps: [...completedSteps, currentStep],
        isProcessing: false,
      });
    }

    return false;
  }

  public async getArbiusModelResponse(prompt: string): Promise<string | undefined> {
    try {
      this.resetState();
      this.updateState({ isProcessing: true });
  
      const taskId = await this.submitTask(prompt);
      if (!taskId) throw new Error("Task submission failed");
      this.updateState({ taskId });
      this.advanceStep();
  
      const cid = await this.waitForSolutionCID(taskId);
      const ipfs = `https://ipfs.arbius.org/ipfs/${cidify(cid)}/out-1.txt`;
      this.updateState({ ipfs });
      this.advanceStep();
  
      const res = await fetch(ipfs);
      if (!res.ok) throw new Error("Failed to fetch from IPFS");
      const text = await res.text();
  
      this.updateState({
        result: text,
        isProcessing: false,
      });
      this.advanceStep();
  
      return text;
    } catch (err: any) {
      console.error("❌ Failed to get model response:", err);
      this.updateState({ isProcessing: false, error: err.message });
    }
  }
  

  public async submitTask(prompt: string): Promise<string | undefined> {
    if (!this.signer || !this.address) throw new Error("Signer not initialized");

    const modelId = config("arbius_llm_model_id") as `0x${string}`;

    try {
      const input = JSON.stringify({ prompt });
      const bytes = ethers.hexlify(ethers.toUtf8Bytes(input));

      const contract = new ethers.Contract(arbiusAddress, ArbiusAbi, this.signer);

      const model = await contract.models(modelId);
      const fee = model[0];
      console.log("💰 Model Fee:", ethers.formatEther(fee));

      const tx = await contract.submitTask(0, this.address, modelId, fee, bytes);

      const receipt = await tx.wait();

      const taskId = receipt.logs[0].args[0];

      const cid = await pinFileToIPFS(
        Buffer.from(input, "utf-8"),
        `task-${taskId}.json`
      );

      console.log(`📦 Task input pinned to IPFS with CID: ${cid}`);
      return taskId;
    } catch (err) {
      console.error("❌ Failed to submit task", err);
    }
  }

  public async waitForSolutionCID(taskId: string): Promise<string> {
    if (!this.wsProvider) throw new Error("WebSocketProvider not set");

    const contract = new ethers.Contract(arbiusAddress, ArbiusAbi, this.wsProvider);
  
    return new Promise<string>((resolve, reject) => {
      const listener = async (addr: string, submitTaskId: string) => {
        console.log(`🔔 Event: Solution ${submitTaskId} solved by: ${addr}`);
  
        if (submitTaskId !== taskId) return;
  
        try {
          const solution = await contract.solutions(submitTaskId);
          if (!solution.cid || solution.cid === "") throw new Error("Missing CID in solution");
  
          contract.off("SolutionSubmitted", listener); // Clean up
          clearTimeout(timeout); // Stop timeout
          resolve(solution.cid);
        } catch (err) {
          contract.off("SolutionSubmitted", listener);
          clearTimeout(timeout);
          reject(err);
        }
      };
  
      contract.on("SolutionSubmitted", listener);
  
      // Optional timeout to avoid hanging forever
      const timeout = setTimeout(() => {
        contract.off("SolutionSubmitted", listener);
        reject(new Error("Timeout: No solution submitted in time"));
      }, 2 * 60 * 1000); // 2 minutes
    });
  }
  
  
  public async getTaskResult(taskId: string): Promise<string | undefined> {
    try {
      const cid = await this.waitForSolutionCID(taskId);
      const url = `https://ipfs.arbius.org/ipfs/${cidify(cid)}/out-1.txt`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch IPFS: ${url}`);

      const fullText = await res.text();
      return fullText.includes("</think>")
        ? fullText.split("</think>").pop()?.trim()
        : fullText;
    } catch (err) {
      console.error("❌ Error getting task result:", err);
    }
  }
}
