"use client";

import { ChessBoard } from "@/components/custom/ChessBoard";
import { useChessGame } from "@/hooks/useChessGame";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Crown, User, Eye, RotateCcw } from "lucide-react";

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
    isConnected,
  } = useChessGame();

  const handlePieceDrop = (
    sourceSquare: string,
    targetSquare: string
  ): boolean => {
    return makeMove(sourceSquare, targetSquare);
  };

  const getRoleDisplay = () => {
    if (playerRole === "w") {
      return {
        text: "White Player",
        icon: <Crown className="w-4 h-4" />,
        color: "bg-white text-black",
      };
    } else if (playerRole === "b") {
      return {
        text: "Black Player",
        icon: <Crown className="w-4 h-4" />,
        color: "bg-zinc-900 text-white",
      };
    } else {
      return {
        text: "Spectator",
        icon: <Eye className="w-4 h-4" />,
        color: "bg-zinc-500 text-white",
      };
    }
  };

  const roleDisplay = getRoleDisplay();
  const whiteMoves = moveHistory.filter((_, index) => index % 2 === 0);
  const blackMoves = moveHistory.filter((_, index) => index % 2 === 1);

  return (
    <div className="min-h-screen bg-linear-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Crown className="w-12 h-12 text-amber-400" />
            Real-Time Chess
          </h1>
          <p className="text-zinc-400">
            Challenge your opponent in a live chess match
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Your Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge
                  className={`${roleDisplay.color} px-3 py-2 text-base flex items-center gap-2 w-full justify-center`}
                >
                  {roleDisplay.icon}
                  {roleDisplay.text}
                </Badge>
              </CardContent>
            </Card>

            <Card className="bg-zinc-800/50 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-white">Game Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isConnected ? "bg-green-500" : "bg-red-500"
                    }`}
                  />
                  <span className="text-sm text-zinc-400">
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>

                <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-700">
                  <p className="text-white font-medium">{gameStatus}</p>
                </div>

                {isMyTurn && isGameStarted && (
                  <Badge
                    variant="default"
                    className="w-full justify-center bg-green-600"
                  >
                    Your Turn
                  </Badge>
                )}

                {isGameStarted && playerRole !== "spectator" && (
                  <Button
                    onClick={resetGame}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Game
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-6 flex items-center justify-center">
            <div className="w-full max-w-[600px]">
              <ChessBoard
                fen={chess.fen()}
                onPieceDrop={handlePieceDrop}
                boardOrientation={playerRole === "b" ? "black" : "white"}
                allowDragging={isMyTurn && playerRole !== "spectator"}
              />
            </div>
          </div>

          <div className="lg:col-span-3">
            <Card className="bg-zinc-800/50 border-zinc-700 h-full">
              <CardHeader>
                <CardTitle className="text-white">Move History</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-white" />
                        White
                      </h3>
                      <div className="space-y-1">
                        {whiteMoves.length > 0 ? (
                          whiteMoves.map((move, index) => (
                            <div
                              key={`white-${index}`}
                              className="text-sm text-zinc-300 bg-zinc-900/30 px-3 py-2 rounded"
                            >
                              {index + 1}. {move.san}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-zinc-500 italic">
                            No moves yet
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-zinc-900 border border-zinc-600" />
                        Black
                      </h3>
                      <div className="space-y-1">
                        {blackMoves.length > 0 ? (
                          blackMoves.map((move, index) => (
                            <div
                              key={`black-${index}`}
                              className="text-sm text-zinc-300 bg-zinc-900/30 px-3 py-2 rounded"
                            >
                              {index + 1}. {move.san}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-zinc-500 italic">
                            No moves yet
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-zinc-500 text-sm">
            Built with Next.js, TypeScript, Socket.io & Chess.js
          </p>
        </div>
      </div>
    </div>
  );
}
