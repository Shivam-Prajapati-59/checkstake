"use client";

import { Button } from "@/components/ui/button";
import { ChessBoard } from "@/components/custom/ChessBoard";
import { GameStatusCard } from "./GameStatusCard";
import { MoveHistoryCard } from "./MoveHistoryCard";
import { PlayersCard } from "./PlayersCard";
import { MatchInfoCard } from "./MatchInfoCard";
import { PlatformFeeCard } from "./PlatformFeeCard";
import { Trophy } from "lucide-react";

interface GameDashboardProps {
  chess: any;
  playerRole: string | null;
  isGameStarted: boolean;
  isMyTurn: boolean;
  gameStatus: string;
  moveHistory: any[];
  gameId?: string | null;
  betId?: number | null;
  walletAddress: string | null | undefined;
  platformFeePercent: number;
  roleDisplay: {
    text: string;
    icon: React.ReactNode;
    color: string;
  };
  onPieceDrop: (sourceSquare: string, targetSquare: string) => boolean;
  onResetGame: () => void;
}

export function GameDashboard({
  chess,
  playerRole,
  isGameStarted,
  isMyTurn,
  gameStatus,
  moveHistory,
  gameId,
  betId,
  walletAddress,
  platformFeePercent,
  roleDisplay,
  onPieceDrop,
  onResetGame,
}: GameDashboardProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 h-[calc(100vh-140px)]">
      {/* Left Sidebar - Game Info */}
      <div className="xl:col-span-3 space-y-4 overflow-auto custom-scrollbar pr-2">
        <GameStatusCard
          roleDisplay={roleDisplay}
          isMyTurn={isMyTurn}
          gameStatus={gameStatus}
          gameId={gameId}
          betId={betId}
        />

        <MoveHistoryCard moveHistory={moveHistory} />

        {isGameStarted && (
          <Button
            onClick={onResetGame}
            variant="outline"
            className="w-full border-gray-700 hover:bg-[#1a1a1a] text-gray-300 hover:text-white"
          >
            <Trophy className="w-4 h-4 mr-2" />
            New Game
          </Button>
        )}
      </div>

      {/* Center - Chess Board */}
      <div className="xl:col-span-6 flex items-center justify-center">
        <div className="w-full max-w-[700px]">
          <ChessBoard
            fen={chess.fen()}
            onPieceDrop={onPieceDrop}
            boardOrientation={playerRole === "b" ? "black" : "white"}
          />
        </div>
      </div>

      {/* Right Sidebar - Player Info */}
      <div className="xl:col-span-3 space-y-4 overflow-auto custom-scrollbar pr-2">
        <PlayersCard playerRole={playerRole} walletAddress={walletAddress} />

        <MatchInfoCard
          moveCount={moveHistory.length}
          isGameStarted={isGameStarted}
        />

        <PlatformFeeCard feePercent={platformFeePercent} />
      </div>
    </div>
  );
}
