"use client";

import { useState } from "react";
import { useChessGameWithBetting } from "@/hooks/useChessGameWithBetting";
import { useChessBetting } from "@/hooks/useChessBetting";
import { GameHeader } from "@/components/game/GameHeader";
import { GameDashboard } from "@/components/game/GameDashboard";
import { BettingLobby } from "@/components/game/BettingLobby";
import { Crown, Activity } from "lucide-react";
import { toast } from "sonner";

export default function Home() {
  const {
    chess,
    playerRole,
    isGameStarted,
    isMyTurn,
    gameStatus,
    moveHistory,
    makeMove,
    resetGame,
    createGame,
    joinGame,
    walletAddress,
    gameId,
    betId,
  } = useChessGameWithBetting();

  const { joinBet, address, platformFeePercent } = useChessBetting();

  const [showBetting, setShowBetting] = useState(!isGameStarted);

  const handlePieceDrop = (
    sourceSquare: string,
    targetSquare: string
  ): boolean => {
    return makeMove(sourceSquare, targetSquare);
  };

  const getRoleDisplay = () => {
    if (playerRole === "w") {
      return {
        text: "White",
        icon: <Crown className="w-4 h-4" />,
        color: "bg-gray-200 text-black",
      };
    } else if (playerRole === "b") {
      return {
        text: "Black",
        icon: <Crown className="w-4 h-4" />,
        color: "bg-gray-800 text-white",
      };
    } else {
      return {
        text: "Spectator",
        icon: <Activity className="w-4 h-4" />,
        color: "bg-purple-600 text-white",
      };
    }
  };

  const roleDisplay = getRoleDisplay();

  const handleBetCreated = (newBetId: number) => {
    toast.success("Bet created! Creating game...");
    createGame(newBetId);
    setShowBetting(false);
  };

  const handleJoinBet = async (betId: number, amount: string) => {
    try {
      const hash = await joinBet(betId, amount);
      if (hash) {
        toast.success("Joined bet! Joining game...");
        joinGame(`game_${betId}`, betId);
        setShowBetting(false);
      }
    } catch (error) {
      console.error("Error joining bet:", error);
    }
  };

  const handleResetGame = () => {
    resetGame();
    setShowBetting(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <GameHeader />

      <main className="max-w-[1800px] mx-auto px-6 py-6">
        {showBetting ? (
          <BettingLobby
            onBetCreated={handleBetCreated}
            onJoinBet={handleJoinBet}
            currentAddress={address}
          />
        ) : (
          <GameDashboard
            chess={chess}
            playerRole={playerRole}
            isGameStarted={isGameStarted}
            isMyTurn={isMyTurn}
            gameStatus={gameStatus}
            moveHistory={moveHistory}
            gameId={gameId}
            betId={betId}
            walletAddress={walletAddress}
            platformFeePercent={platformFeePercent}
            roleDisplay={roleDisplay}
            onPieceDrop={handlePieceDrop}
            onResetGame={handleResetGame}
          />
        )}
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0a0a0a;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333333;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #444444;
        }
      `}</style>
    </div>
  );
}
