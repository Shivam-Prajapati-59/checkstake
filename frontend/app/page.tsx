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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Crown, User, Eye, RotateCcw, Coins, Trophy } from "lucide-react";
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
        // Wait a bit for blockchain confirmation
        setTimeout(() => {
          // Try to join the game - backend will verify the bet
          joinGame(`game_${betId}`, betId);
          setShowBetting(false);
        }, 2000);
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
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Chess Betting DApp
            </h1>
            <p className="text-muted-foreground">
              Play chess and win MON tokens on Monad Testnet
            </p>
          </div>
          <ConnectButton />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {!isConnected ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Welcome to Chess Betting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Connect your wallet to start playing chess with real stakes on
                Monad Testnet.
              </p>
              <div className="flex items-center justify-center">
                <ConnectButton />
              </div>
              <div className="pt-4 border-t border-border">
                <h3 className="font-semibold mb-2">How it works:</h3>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Connect your wallet</li>
                  <li>Create or join a bet</li>
                  <li>Play chess against your opponent</li>
                  <li>
                    Winner takes the pot (minus {platformFeePercent}% fee)
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>
        ) : showBetting ? (
          <div className="grid lg:grid-cols-2 gap-6">
            <CreateBet onBetCreated={handleBetCreated} />
            <AvailableBets onJoinBet={handleJoinBet} currentAddress={address} />
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr,400px] gap-6">
            {/* Chess Board */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Game Board</CardTitle>
                    {betId && (
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        <Coins className="w-3 h-3" />
                        Bet #{betId}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ChessBoard
                    fen={chess.fen()}
                    onPieceDrop={handlePieceDrop}
                    boardOrientation={playerRole === "b" ? "black" : "white"}
                    allowDragging={
                      isGameStarted && isMyTurn && playerRole !== "spectator"
                    }
                  />
                </CardContent>
              </Card>

              {isGameStarted && (
                <div className="flex gap-4">
                  <Button
                    onClick={handleResetGame}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Leave Game
                  </Button>
                </div>
              )}
            </div>

            {/* Game Info Sidebar */}
            <div className="space-y-4">
              {/* Status Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Game Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm font-medium">Status:</span>
                    <Badge variant={isGameStarted ? "default" : "secondary"}>
                      {gameStatus}
                    </Badge>
                  </div>

                  {playerRole && playerRole !== "spectator" && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Your Role:</span>
                      <Badge className={roleDisplay.color}>
                        {roleDisplay.icon}
                        {roleDisplay.text}
                      </Badge>
                    </div>
                  )}

                  {isGameStarted && (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Turn:</span>
                      <Badge variant={isMyTurn ? "default" : "secondary"}>
                        {isMyTurn ? "Your Turn" : "Opponent's Turn"}
                      </Badge>
                    </div>
                  )}

                  {gameId && (
                    <div className="p-3 bg-muted rounded-lg">
                      <span className="text-sm font-medium">Game ID:</span>
                      <p className="text-xs font-mono mt-1 text-muted-foreground">
                        {gameId}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Move History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Move History
                    <Badge variant="outline">{moveHistory.length} moves</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {moveHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No moves yet
                    </p>
                  ) : (
                    <ScrollArea className="h-[300px] pr-4">
                      <div className="space-y-2">
                        {moveHistory.map((move, index) => {
                          const moveNumber = Math.floor(index / 2) + 1;
                          const isWhiteMove = index % 2 === 0;
                          return (
                            <div
                              key={index}
                              className="flex items-center gap-2 p-2 hover:bg-muted rounded-md transition-colors"
                            >
                              {isWhiteMove && (
                                <span className="text-sm font-semibold w-8">
                                  {moveNumber}.
                                </span>
                              )}
                              {!isWhiteMove && <div className="w-8" />}
                              <Badge
                                variant={isWhiteMove ? "default" : "secondary"}
                                className="w-16 justify-center"
                              >
                                {isWhiteMove ? (
                                  <Crown className="w-3 h-3 mr-1" />
                                ) : (
                                  <User className="w-3 h-3 mr-1" />
                                )}
                                {move.san}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {move.from} → {move.to}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Betting Info */}
              {betId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Coins className="w-5 h-5" />
                      Bet Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bet ID:</span>
                      <span className="font-semibold">#{betId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Platform Fee:
                      </span>
                      <span className="font-semibold">
                        {platformFeePercent}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bet Range:</span>
                      <span className="font-semibold">
                        {minBetAmount} - {maxBetAmount} MON
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
