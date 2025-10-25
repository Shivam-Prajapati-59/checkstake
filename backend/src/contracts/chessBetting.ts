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

// Cache for available bets
let cachedAvailableBets: any[] = [];
let lastCacheUpdate = 0;
const CACHE_DURATION = 10000; // 10 seconds cache

/**
 * Get all available bets (Created status - waiting for second player)
 * Uses caching to reduce RPC calls and avoid rate limits
 */
export async function getAvailableBets(): Promise<any[]> {
  if (!chessBettingContract || !isBlockchainEnabled) {
    console.warn("Blockchain not enabled");
    return [];
  }

  // Return cached data if still valid
  const now = Date.now();
  if (
    now - lastCacheUpdate < CACHE_DURATION &&
    cachedAvailableBets.length > 0
  ) {
    console.log(
      `📋 Returning ${cachedAvailableBets.length} cached available bets`
    );
    return cachedAvailableBets;
  }

  console.log(
    `🔄 Cache expired or empty, fetching fresh data from blockchain...`
  );

  try {
    const betCounter = await chessBettingContract.betCounter();
    const availableBets = [];

    // Query recent bets (last 20 to reduce RPC calls)
    const startBetId = Math.max(1, Number(betCounter) - 19);
    const totalBets = Number(betCounter) - startBetId + 1;

    console.log(
      `🔍 Querying ${totalBets} recent bets (${startBetId} to ${betCounter})`
    );

    // Add delay between calls to respect rate limits (25/sec = 40ms between calls)
    for (let i = Number(betCounter); i >= startBetId; i--) {
      try {
        const bet = await chessBettingContract.bets(i);

        console.log(
          `   Bet ${i}: status=${Number(bet.status)}, player2=${bet.player2}`
        );

        // Only include bets with "Created" status (0)
        // Created = waiting for second player
        if (Number(bet.status) === BetStatus.Created) {
          console.log(`   ✅ Including bet ${i} (Created status)`);
          availableBets.push({
            betId: i,
            player1: bet.player1,
            amount: ethers.formatEther(bet.amount),
            createdAt: Number(bet.createdAt),
            gameHash: bet.gameHash,
          });
        } else {
          console.log(`   ❌ Skipping bet ${i} (status=${Number(bet.status)})`);
        }

        // Small delay to respect rate limits (50ms = 20 calls/sec)
        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (error) {
        // Skip bets that don't exist
        console.log(`   ⚠️  Error fetching bet ${i}:`, error);
        continue;
      }
    }

    // Update cache
    cachedAvailableBets = availableBets;
    lastCacheUpdate = now;

    console.log(
      `📋 Found ${availableBets.length} available bets (cached for ${
        CACHE_DURATION / 1000
      }s)`
    );
    return availableBets;
  } catch (error) {
    console.error("Error getting available bets:", error);
    // Return cached data if available on error
    return cachedAvailableBets;
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
 * Setup contract event listeners using polling (compatible with Monad testnet)
 * Monad doesn't support eth_newFilter, so we use block polling instead
 */
export function setupContractListeners(io: any) {
  if (!chessBettingContract || !isBlockchainEnabled || !provider) {
    console.log(
      "ℹ️  Contract event listeners not set up (blockchain disabled)"
    );
    return;
  }

  console.log("🎧 Setting up contract event polling (Monad-compatible)...");

  let lastProcessedBlock = 0;

  // Poll for new blocks and query events
  const pollEvents = async () => {
    try {
      if (!provider || !chessBettingContract) return;

      const currentBlock = await provider.getBlockNumber();

      // Initialize lastProcessedBlock on first run
      if (lastProcessedBlock === 0) {
        lastProcessedBlock = currentBlock;
        console.log(`📍 Starting event polling from block ${currentBlock}`);
        return;
      }

      // Only query if there are new blocks
      if (currentBlock > lastProcessedBlock) {
        const fromBlock = lastProcessedBlock + 1;
        const toBlock = currentBlock;

        // Query events using queryFilter (doesn't use eth_newFilter)
        try {
          // Get BetCreated events
          const betCreatedEvents = await chessBettingContract.queryFilter(
            chessBettingContract.filters.BetCreated(),
            fromBlock,
            toBlock
          );

          for (const event of betCreatedEvents) {
            if ("args" in event && event.args) {
              const args = event.args as any;
              console.log(
                `📢 BetCreated event: ${args.betId} by ${args.creator}`
              );
              io.emit("betCreated", {
                betId: Number(args.betId),
                creator: args.creator,
                amount: ethers.formatEther(args.amount),
                gameHash: args.gameHash,
              });
            }
          }

          // Get BetJoined events
          const betJoinedEvents = await chessBettingContract.queryFilter(
            chessBettingContract.filters.BetJoined(),
            fromBlock,
            toBlock
          );

          for (const event of betJoinedEvents) {
            if ("args" in event && event.args) {
              const args = event.args as any;
              console.log(
                `📢 BetJoined event: ${args.betId} joined by ${args.joiner}`
              );
              io.emit("betJoined", {
                betId: Number(args.betId),
                joiner: args.joiner,
                totalPool: ethers.formatEther(args.totalPool),
              });
            }
          }

          // Get BetCompleted events
          const betCompletedEvents = await chessBettingContract.queryFilter(
            chessBettingContract.filters.BetCompleted(),
            fromBlock,
            toBlock
          );

          for (const event of betCompletedEvents) {
            if ("args" in event && event.args) {
              const args = event.args as any;
              console.log(
                `📢 BetCompleted event: ${args.betId} won by ${args.winner}`
              );
              io.emit("betCompleted", {
                betId: Number(args.betId),
                winner: args.winner,
                payout: ethers.formatEther(args.payout),
                result: Number(args.result),
              });
            }
          }

          // Get DrawDeclared events
          const drawDeclaredEvents = await chessBettingContract.queryFilter(
            chessBettingContract.filters.DrawDeclared(),
            fromBlock,
            toBlock
          );

          for (const event of drawDeclaredEvents) {
            if ("args" in event && event.args) {
              const args = event.args as any;
              console.log(`📢 DrawDeclared event: ${args.betId}`);
              io.emit("drawDeclared", {
                betId: Number(args.betId),
                refundAmount: ethers.formatEther(args.refundAmount),
              });
            }
          }

          // Get BetCancelled events
          const betCancelledEvents = await chessBettingContract.queryFilter(
            chessBettingContract.filters.BetCancelled(),
            fromBlock,
            toBlock
          );

          for (const event of betCancelledEvents) {
            if ("args" in event && event.args) {
              const args = event.args as any;
              console.log(`📢 BetCancelled event: ${args.betId}`);
              io.emit("betCancelled", {
                betId: Number(args.betId),
                canceller: args.canceller,
                refundAmount: ethers.formatEther(args.refundAmount),
              });
            }
          }
        } catch (queryError) {
          console.error("Error querying events:", queryError);
        }

        lastProcessedBlock = currentBlock;
      }
    } catch (error) {
      console.error("Error polling events:", error);
    }
  };

  // Poll every 5 seconds (increased to reduce RPC load and avoid rate limits)
  const pollingInterval = setInterval(pollEvents, 5000);

  // Initial poll
  pollEvents();

  console.log("✅ Contract event polling set up successfully (5s interval)");

  // Return cleanup function
  return () => {
    clearInterval(pollingInterval);
    console.log("🛑 Contract event polling stopped");
  };
}

// Export blockchain status
export { isBlockchainEnabled };

// Export contract instance for advanced usage
export { chessBettingContract, provider, wallet };
