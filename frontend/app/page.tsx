"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ChessBoard } from "@/components/custom/ChessBoard";
import { useChessGameWithBetting } from "@/hooks/useChessGameWithBetting";
import { useChessBetting } from "@/hooks/useChessBetting";
import { CreateBet } from "@/components/betting/CreateBet";
import { AvailableBets } from "@/components/betting/AvailableBets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Crown,
  User,
  Swords,
  Coins,
  Trophy,
  Timer,
  Activity,
} from "lucide-react";
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
    isConnected,
    walletAddress,
    gameId,
    betId,
  } = useChessGameWithBetting();

  const { joinBet, address, minBetAmount, maxBetAmount, platformFeePercent } =
    useChessBetting();

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
        color: "bg-linear-to-r from-slate-200 to-slate-300 text-black",
      };
    } else if (playerRole === "b") {
      return {
        text: "Black",
        icon: <Crown className="w-4 h-4" />,
        color: "bg-linear-to-r from-zinc-800 to-zinc-900 text-white",
      };
    } else {
      return {
        text: "Spectator",
        icon: <Activity className="w-4 h-4" />,
        color: "bg-linear-to-r from-purple-600 to-purple-700 text-white",
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
      {/* Header */}
      <header className="border-b border-gray-800 bg-[#111111] sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Swords className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Chess Battle Arena
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  Blockchain Chess Betting
                </p>
              </div>
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-6 py-6">
        {showBetting ? (
          /* Betting Lobby */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
            <CreateBet onBetCreated={handleBetCreated} />
            <AvailableBets onJoinBet={handleJoinBet} currentAddress={address} />
          </div>
        ) : (
          /* Game Dashboard */
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[calc(100vh-140px)]">
            {/* Left Sidebar - Game Info */}
            <div className="xl:col-span-3 space-y-4 overflow-auto custom-scrollbar pr-2">
              {/* Game Status Card */}
              <Card className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 border-gray-700/50 backdrop-blur-xl shadow-xl">
                <CardHeader className="pb-3 border-b border-gray-800/50">
                  <CardTitle className="text-lg flex items-center gap-2 text-gray-100">
                    <div className="p-1.5 bg-purple-500/20 rounded-lg">
                      <Activity className="w-4 h-4 text-purple-400" />
                    </div>
                    Game Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <span className="text-sm font-medium text-gray-300">
                      Your Role
                    </span>
                    <Badge className={roleDisplay.color}>
                      {roleDisplay.icon}
                      <span className="ml-1">{roleDisplay.text}</span>
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <span className="text-sm font-medium text-gray-300">
                      Status
                    </span>
                    <Badge
                      variant={isMyTurn ? "default" : "secondary"}
                      className={
                        isMyTurn
                          ? "bg-purple-600 hover:bg-purple-700"
                          : "bg-gray-700"
                      }
                    >
                      {gameStatus}
                    </Badge>
                  </div>

                  {gameId && (
                    <div className="pt-3 mt-3 border-t border-gray-800/50">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Game ID
                      </span>
                      <p className="text-xs font-mono text-gray-300 mt-2 bg-gray-800/50 p-2 rounded border border-gray-700/30">
                        {gameId}
                      </p>
                    </div>
                  )}

                  {betId && (
                    <div className="flex items-center gap-2 p-3 mt-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-yellow-200">
                        Bet #{betId}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Move History */}
              <Card className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 border-gray-700/50 backdrop-blur-xl shadow-xl flex-1">
                <CardHeader className="pb-3 border-b border-gray-800/50">
                  <CardTitle className="text-lg flex items-center gap-2 text-gray-100">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg">
                      <Timer className="w-4 h-4 text-blue-400" />
                    </div>
                    Move History
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {moveHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Timer className="w-6 h-6 text-gray-600" />
                        </div>
                        <p className="text-sm text-gray-500">
                          No moves yet. Game is starting...
                        </p>
                      </div>
                    ) : (
                      moveHistory.map((move, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/40 hover:bg-gray-800/60 transition-all duration-200 border border-gray-700/30 hover:border-purple-500/30"
                        >
                          <Badge
                            variant="outline"
                            className="w-12 justify-center border-gray-600 bg-gray-900/50 text-gray-300"
                          >
                            {index + 1}
                          </Badge>
                          <span className="font-mono text-sm flex-1 text-gray-200 font-semibold">
                            {move.san}
                          </span>
                          <span className="text-xs text-gray-500 bg-gray-900/50 px-2 py-1 rounded">
                            {move.from} → {move.to}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              {isGameStarted && (
                <Button
                  onClick={handleResetGame}
                  variant="outline"
                  className="w-full border-gray-600 hover:bg-gray-800 hover:border-purple-500 text-gray-200 hover:text-white transition-all duration-200"
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
                  onPieceDrop={handlePieceDrop}
                  boardOrientation={playerRole === "b" ? "black" : "white"}
                />
              </div>
            </div>

            {/* Right Sidebar - Player Info */}
            <div className="xl:col-span-3 space-y-4 overflow-auto custom-scrollbar pr-2">
              {/* Players Card */}
              <Card className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 border-gray-700/50 backdrop-blur-xl shadow-xl">
                <CardHeader className="pb-3 border-b border-gray-800/50">
                  <CardTitle className="text-lg flex items-center gap-2 text-gray-100">
                    <div className="p-1.5 bg-green-500/20 rounded-lg">
                      <User className="w-4 h-4 text-green-400" />
                    </div>
                    Players
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* White Player */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-slate-700/30 to-slate-800/50 border border-slate-600/40 shadow-lg hover:shadow-slate-500/20 transition-all duration-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-white/20 rounded-lg">
                        <Crown className="w-4 h-4 text-slate-200" />
                      </div>
                      <span className="font-bold text-slate-100 text-base">
                        White
                      </span>
                      {playerRole === "w" && (
                        <Badge
                          variant="secondary"
                          className="ml-auto bg-gradient-to-r from-green-600 to-green-700 text-white text-xs border-0 shadow-lg"
                        >
                          You
                        </Badge>
                      )}
                    </div>
                    {walletAddress && playerRole === "w" && (
                      <p className="text-xs font-mono text-slate-300 bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-700/50">
                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                      </p>
                    )}
                    {(!walletAddress || playerRole !== "w") && (
                      <p className="text-xs text-slate-500 italic">
                        Waiting for player...
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-center py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
                      <Swords className="w-4 h-4 text-purple-400" />
                      <div className="w-8 h-0.5 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full"></div>
                    </div>
                  </div>

                  {/* Black Player */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-700/30 to-zinc-800/50 border border-zinc-600/40 shadow-lg hover:shadow-zinc-500/20 transition-all duration-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-black/40 rounded-lg border border-zinc-600">
                        <Crown className="w-4 h-4 text-zinc-200" />
                      </div>
                      <span className="font-bold text-zinc-100 text-base">
                        Black
                      </span>
                      {playerRole === "b" && (
                        <Badge
                          variant="secondary"
                          className="ml-auto bg-gradient-to-r from-green-600 to-green-700 text-white text-xs border-0 shadow-lg"
                        >
                          You
                        </Badge>
                      )}
                    </div>
                    {walletAddress && playerRole === "b" && (
                      <p className="text-xs font-mono text-zinc-300 bg-zinc-900/50 px-3 py-2 rounded-lg border border-zinc-700/50">
                        {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                      </p>
                    )}
                    {(!walletAddress || playerRole !== "b") && (
                      <p className="text-xs text-zinc-500 italic">
                        Waiting for player...
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Game Info */}
              <Card className="bg-gradient-to-br from-gray-900/90 to-gray-950/90 border-gray-700/50 backdrop-blur-xl shadow-xl">
                <CardHeader className="pb-3 border-b border-gray-800/50">
                  <CardTitle className="text-lg flex items-center gap-2 text-gray-100">
                    <div className="p-1.5 bg-yellow-500/20 rounded-lg">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                    </div>
                    Match Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <span className="text-sm font-medium text-gray-300">
                      Total Moves
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-2xl text-purple-400">
                        {moveHistory.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                    <span className="text-sm font-medium text-gray-300">
                      Game Mode
                    </span>
                    <Badge
                      variant="outline"
                      className="border-purple-500/50 text-purple-300 bg-purple-500/10"
                    >
                      Betting Match
                    </Badge>
                  </div>

                  {isGameStarted && (
                    <div className="pt-3 mt-3 border-t border-gray-800/50">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                        Connection Status
                      </p>
                      <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                        <div className="relative">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                        </div>
                        <span className="text-sm font-semibold text-green-400">
                          Live Connected
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-purple-600/50 backdrop-blur-xl shadow-xl">
                <CardContent className="pt-6 pb-6">
                  <div className="text-center space-y-3">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-purple-500/30">
                      <Coins className="w-7 h-7 text-white" />
                    </div>
                    <p className="text-sm font-medium text-gray-300">
                      Platform Fee
                    </p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      {platformFeePercent}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(17, 24, 39, 0.4);
          border-radius: 10px;
          margin: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(
            to bottom,
            rgba(139, 92, 246, 0.6),
            rgba(168, 85, 247, 0.6)
          );
          border-radius: 10px;
          border: 2px solid rgba(17, 24, 39, 0.4);
          transition: all 0.3s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(
            to bottom,
            rgba(139, 92, 246, 0.9),
            rgba(168, 85, 247, 0.9)
          );
          border: 2px solid rgba(17, 24, 39, 0.2);
        }

        /* Smooth scrolling */
        .custom-scrollbar {
          scroll-behavior: smooth;
        }
      `}</style>
    </div>
  );
}
