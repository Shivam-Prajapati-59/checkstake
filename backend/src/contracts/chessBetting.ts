import { ethers } from "ethers";
import * as dotenv from "dotenv";
import {
  CHESS_BETTING_ABI,
  BetDetails,
  PlayerStats,
  BetStatus,
  GameResult,
} from "./abi";

dotenv.config();

// Validate environment variables
const requiredEnvVars = ["RPC_URL", "CONTRACT_ADDRESS", "OWNER_PRIVATE_KEY"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(
      `⚠️  Warning: ${envVar} not set in .env file. Blockchain features will be disabled.`
    );
  }
}

// Setup provider and contract (only if env vars are present)
let provider: ethers.JsonRpcProvider | null = null;
let wallet: ethers.Wallet | null = null;
let chessBettingContract: ethers.Contract | null = null;
let isBlockchainEnabled = false;

try {
  if (
    process.env.RPC_URL &&
    process.env.CONTRACT_ADDRESS &&
    process.env.OWNER_PRIVATE_KEY
  ) {
    provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    wallet = new ethers.Wallet(process.env.OWNER_PRIVATE_KEY, provider);
    chessBettingContract = new ethers.Contract(
      process.env.CONTRACT_ADDRESS,
      CHESS_BETTING_ABI,
      wallet
    );
    isBlockchainEnabled = true;
    console.log("✅ Blockchain integration enabled");
    console.log(`📜 Contract address: ${process.env.CONTRACT_ADDRESS}`);
  } else {
    console.log("ℹ️  Blockchain integration disabled - running in local mode");
  }
} catch (error) {
  console.error("❌ Error initializing blockchain connection:", error);
  console.log("⚠️  Continuing without blockchain integration");
}

/**
 * Get bet details from the blockchain
 */
export async function getBetDetails(betId: number): Promise<BetDetails | null> {
  if (!chessBettingContract || !isBlockchainEnabled) {
    console.warn("Blockchain not enabled");
    return null;
  }

  try {
    const bet = await chessBettingContract.getBet(betId);
    return {
      player1: bet.player1,
      player2: bet.player2,
      amount: ethers.formatEther(bet.amount),
      winner: bet.winner,
      status: Number(bet.status) as BetStatus,
      result: Number(bet.result) as GameResult,
      createdAt: Number(bet.createdAt),
      completedAt: Number(bet.completedAt),
      gameHash: bet.gameHash,
    };
  } catch (error) {
    console.error(`Error getting bet details for bet ${betId}:`, error);
    throw error;
  }
}

/**
 * Declare winner on the blockchain
 */
export async function declareWinner(
  betId: number,
  winnerAddress: string
): Promise<any> {
  if (!chessBettingContract || !isBlockchainEnabled) {
    console.warn("Blockchain not enabled - skipping declareWinner");
    return null;
  }

  try {
    console.log(`🔗 Declaring winner for bet ${betId}: ${winnerAddress}`);
    const tx = await chessBettingContract.declareWinner(betId, winnerAddress);
    console.log(`⏳ Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Winner declared! Block: ${receipt.blockNumber}`);
    return receipt;
  } catch (error: any) {
    console.error("❌ Error declaring winner:", error.message);
    throw error;
  }
}

/**
 * Declare draw on the blockchain
 */
export async function declareDraw(betId: number): Promise<any> {
  if (!chessBettingContract || !isBlockchainEnabled) {
    console.warn("Blockchain not enabled - skipping declareDraw");
    return null;
  }

  try {
    console.log(`🔗 Declaring draw for bet ${betId}`);
    const tx = await chessBettingContract.declareDraw(betId);
    console.log(`⏳ Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Draw declared! Block: ${receipt.blockNumber}`);
    return receipt;
  } catch (error: any) {
    console.error("❌ Error declaring draw:", error.message);
    throw error;
  }
}

/**
 * Get player statistics from the blockchain
 */
export async function getPlayerStats(
  playerAddress: string
): Promise<PlayerStats | null> {
  if (!chessBettingContract || !isBlockchainEnabled) {
    console.warn("Blockchain not enabled");
    return null;
  }

  try {
    const stats = await chessBettingContract.getPlayerStats(playerAddress);
    return {
      wins: Number(stats.wins),
      losses: Number(stats.losses),
      draws: Number(stats.draws),
      totalGames: Number(stats.totalGames),
    };
  } catch (error) {
    console.error(`Error getting player stats for ${playerAddress}:`, error);
    throw error;
  }
}

/**
 * Check if bet is expired
 */
export async function isBetExpired(betId: number): Promise<boolean> {
  if (!chessBettingContract || !isBlockchainEnabled) {
    return false;
  }

  try {
    return await chessBettingContract.isBetExpired(betId);
  } catch (error) {
    console.error(`Error checking bet expiry for ${betId}:`, error);
    return false;
  }
}

/**
 * Get total number of bets
 */
export async function getBetCounter(): Promise<number> {
  if (!chessBettingContract || !isBlockchainEnabled) {
    return 0;
  }

  try {
    const counter = await chessBettingContract.betCounter();
    return Number(counter);
  } catch (error) {
    console.error("Error getting bet counter:", error);
    return 0;
  }
}

/**
 * Get number of active bets
 */
export async function getActiveBetsCount(): Promise<number> {
  if (!chessBettingContract || !isBlockchainEnabled) {
    return 0;
  }

  try {
    const count = await chessBettingContract.getActiveBetsCount();
    return Number(count);
  } catch (error) {
    console.error("Error getting active bets count:", error);
    return 0;
  }
}

/**
 * Setup contract event listeners
 */
export function setupContractListeners(io: any) {
  if (!chessBettingContract || !isBlockchainEnabled) {
    console.log(
      "ℹ️  Contract event listeners not set up (blockchain disabled)"
    );
    return;
  }

  console.log("🎧 Setting up contract event listeners...");

  // Listen for new bets created
  chessBettingContract.on("BetCreated", (betId, creator, amount, gameHash) => {
    console.log(`📢 BetCreated event: ${betId} by ${creator}`);
    io.emit("betCreated", {
      betId: Number(betId),
      creator,
      amount: ethers.formatEther(amount),
      gameHash,
    });
  });

  // Listen for bets joined
  chessBettingContract.on("BetJoined", (betId, joiner, totalPool) => {
    console.log(`📢 BetJoined event: ${betId} joined by ${joiner}`);
    io.emit("betJoined", {
      betId: Number(betId),
      joiner,
      totalPool: ethers.formatEther(totalPool),
    });
  });

  // Listen for completed bets
  chessBettingContract.on("BetCompleted", (betId, winner, payout, result) => {
    console.log(`📢 BetCompleted event: ${betId} won by ${winner}`);
    io.emit("betCompleted", {
      betId: Number(betId),
      winner,
      payout: ethers.formatEther(payout),
      result: Number(result),
    });
  });

  // Listen for draws
  chessBettingContract.on("DrawDeclared", (betId, refundAmount) => {
    console.log(`📢 DrawDeclared event: ${betId}`);
    io.emit("drawDeclared", {
      betId: Number(betId),
      refundAmount: ethers.formatEther(refundAmount),
    });
  });

  // Listen for cancelled bets
  chessBettingContract.on("BetCancelled", (betId, canceller, refundAmount) => {
    console.log(`📢 BetCancelled event: ${betId}`);
    io.emit("betCancelled", {
      betId: Number(betId),
      canceller,
      refundAmount: ethers.formatEther(refundAmount),
    });
  });

  console.log("✅ Contract event listeners set up successfully");
}

// Export blockchain status
export { isBlockchainEnabled };

// Export contract instance for advanced usage
export { chessBettingContract, provider, wallet };
