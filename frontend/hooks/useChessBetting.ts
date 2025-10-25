"use client";

import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWatchContractEvent,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { parseEther, formatEther } from "viem";
import { CHESS_BETTING_ABI, Bet, BetStatus } from "@/lib/contract";
import { toast } from "sonner";
import { useEffect } from "react";

const CONTRACT_ADDRESS = process.env
  .NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export function useChessBetting() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  // Read bet counter
  const { data: betCounter, refetch: refetchBetCounter } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CHESS_BETTING_ABI,
    functionName: "betCounter",
  });

  // Read min/max bet amounts
  const { data: minBetAmount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CHESS_BETTING_ABI,
    functionName: "minBetAmount",
  });

  const { data: maxBetAmount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CHESS_BETTING_ABI,
    functionName: "maxBetAmount",
  });

  const { data: platformFeePercent } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CHESS_BETTING_ABI,
    functionName: "platformFeePercent",
  });

  // Get bet details
  const getBet = async (betId: number): Promise<Bet | null> => {
    try {
      const data = (await useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CHESS_BETTING_ABI,
        functionName: "bets",
        args: [BigInt(betId)],
      }).data) as any;

      if (!data) return null;

      return {
        betId: data[0],
        player1: data[1],
        player2: data[2],
        amount: data[3],
        winner: data[4],
        status: data[5] as BetStatus,
        result: data[6],
        createdAt: data[7],
        completedAt: data[8],
        gameHash: data[9],
        player1Disputed: data[10],
        player2Disputed: data[11],
      };
    } catch (error) {
      console.error("Error fetching bet:", error);
      return null;
    }
  };

  // Get player stats
  const getPlayerStats = async (playerAddress: string) => {
    try {
      const [wins, losses, draws] = await Promise.all([
        useReadContract({
          address: CONTRACT_ADDRESS,
          abi: CHESS_BETTING_ABI,
          functionName: "playerWins",
          args: [playerAddress as `0x${string}`],
        }).data,
        useReadContract({
          address: CONTRACT_ADDRESS,
          abi: CHESS_BETTING_ABI,
          functionName: "playerLosses",
          args: [playerAddress as `0x${string}`],
        }).data,
        useReadContract({
          address: CONTRACT_ADDRESS,
          abi: CHESS_BETTING_ABI,
          functionName: "playerDraws",
          args: [playerAddress as `0x${string}`],
        }).data,
      ]);

      return {
        wins: Number(wins || 0),
        losses: Number(losses || 0),
        draws: Number(draws || 0),
        totalGames:
          Number(wins || 0) + Number(losses || 0) + Number(draws || 0),
      };
    } catch (error) {
      console.error("Error fetching player stats:", error);
      return { wins: 0, losses: 0, draws: 0, totalGames: 0 };
    }
  };

  // Create a bet
  const createBet = async (
    amount: string,
    gameHash: string = "0x0000000000000000000000000000000000000000000000000000000000000000"
  ) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return null;
    }

    try {
      toast.info("Submitting transaction...");

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CHESS_BETTING_ABI,
        functionName: "createBet",
        args: [gameHash as `0x${string}`],
        value: parseEther(amount),
      });

      toast.info("Waiting for confirmation...");

      // Wait for transaction confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      toast.success("Bet created and confirmed on blockchain!");
      refetchBetCounter();
      return hash;
    } catch (error: any) {
      console.error("Error creating bet:", error);
      toast.error(error.message || "Failed to create bet");
      return null;
    }
  };

  // Join a bet
  const joinBet = async (betId: number, amount: string) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return null;
    }

    try {
      toast.info("Submitting transaction...");

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CHESS_BETTING_ABI,
        functionName: "joinBet",
        args: [BigInt(betId)],
        value: parseEther(amount),
      });

      toast.info("Waiting for confirmation...");

      // Wait for transaction confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      toast.success("Joined bet and confirmed on blockchain!");
      return hash;
    } catch (error: any) {
      console.error("Error joining bet:", error);
      toast.error(error.message || "Failed to join bet");
      return null;
    }
  };

  // Cancel a bet
  const cancelBet = async (betId: number) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return null;
    }

    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CHESS_BETTING_ABI,
        functionName: "cancelBet",
        args: [BigInt(betId)],
      });

      toast.success("Bet cancelled successfully!");
      return hash;
    } catch (error: any) {
      console.error("Error cancelling bet:", error);
      toast.error(error.message || "Failed to cancel bet");
      return null;
    }
  };

  // Watch for BetCreated events
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CHESS_BETTING_ABI,
    eventName: "BetCreated",
    onLogs(logs) {
      logs.forEach((log: any) => {
        const { betId, creator, amount } = log.args;
        if (creator?.toLowerCase() === address?.toLowerCase()) {
          toast.success(
            `Your bet #${betId} was created with ${formatEther(amount)} MON`
          );
        }
      });
    },
  });

  // Watch for BetJoined events
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CHESS_BETTING_ABI,
    eventName: "BetJoined",
    onLogs(logs) {
      logs.forEach((log: any) => {
        const { betId, joiner } = log.args;
        toast.info(
          `Bet #${betId} was joined by ${joiner?.slice(0, 6)}...${joiner?.slice(
            -4
          )}`
        );
      });
    },
  });

  // Watch for BetCompleted events
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CHESS_BETTING_ABI,
    eventName: "BetCompleted",
    onLogs(logs) {
      logs.forEach((log: any) => {
        const { betId, winner, payout } = log.args;
        if (winner?.toLowerCase() === address?.toLowerCase()) {
          toast.success(
            `🎉 You won bet #${betId}! Payout: ${formatEther(payout)} MON`
          );
        }
      });
    },
  });

  return {
    // State
    address,
    isConnected,
    betCounter: Number(betCounter || 0),
    minBetAmount: minBetAmount ? formatEther(minBetAmount) : "0.001",
    maxBetAmount: maxBetAmount ? formatEther(maxBetAmount) : "100",
    platformFeePercent: Number(platformFeePercent || 0) / 100, // Convert basis points to percentage

    // Functions
    createBet,
    joinBet,
    cancelBet,
    getBet,
    getPlayerStats,
    refetchBetCounter,
  };
}
