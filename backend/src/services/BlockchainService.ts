import { ethers } from "ethers";

/**
 * Blockchain Service - Centralized blockchain interaction utilities
 */
export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract | null = null;

  constructor(rpcUrl: string, contractAddress?: string, abi?: any) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    if (contractAddress && abi) {
      this.contract = new ethers.Contract(contractAddress, abi, this.provider);
    }
  }

  /**
   * Get provider instance
   */
  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  /**
   * Get contract instance
   */
  getContract(): ethers.Contract | null {
    return this.contract;
  }

  /**
   * Set contract with signer
   */
  setContractWithSigner(signer: ethers.Wallet): void {
    if (this.contract) {
      this.contract = this.contract.connect(signer) as ethers.Contract;
    }
  }

  /**
   * Get block number
   */
  async getBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  /**
   * Get balance of address
   */
  async getBalance(address: string): Promise<bigint> {
    return await this.provider.getBalance(address);
  }

  /**
   * Format Ether
   */
  formatEther(value: bigint): string {
    return ethers.formatEther(value);
  }

  /**
   * Parse Ether
   */
  parseEther(value: string): bigint {
    return ethers.parseEther(value);
  }

  /**
   * Wait for transaction receipt
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = 1
  ): Promise<ethers.TransactionReceipt | null> {
    return await this.provider.waitForTransaction(txHash, confirmations);
  }

  /**
   * Check if address is valid
   */
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Get transaction
   */
  async getTransaction(
    txHash: string
  ): Promise<ethers.TransactionResponse | null> {
    return await this.provider.getTransaction(txHash);
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(
    txHash: string
  ): Promise<ethers.TransactionReceipt | null> {
    return await this.provider.getTransactionReceipt(txHash);
  }
}
