"use client";

import { useEffect, useState, useCallback } from "react";
import { Socket, io } from "socket.io-client";
import { Chess, Move } from "chess.js";
import { toast } from "sonner";
import { useAccount } from "wagmi";

type PlayerRole = "w" | "b" | "spectator";

interface GameState {
  chess: Chess;
  playerRole: PlayerRole | null;
  isGameStarted: boolean;
  isMyTurn: boolean;
  gameStatus: string;
  moveHistory: Move[];
  lastMove: Move | null;
  winner: string | null;
  gameId: string | null;
  betId: number | null;
}

export function useChessGameWithBetting() {
  const { address, isConnected } = useAccount();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    chess: new Chess(),
    playerRole: null,
    isGameStarted: false,
    isMyTurn: false,
    gameStatus: "Connecting...",
    moveHistory: [],
    lastMove: null,
    winner: null,
    gameId: null,
    betId: null,
  });

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000",
      {
        transports: ["websocket"],
      }
    );

    newSocket.on("connect", () => {
      console.log("Connected to server");
      toast.success("Connected to server");
      setGameState((prev) => ({
        ...prev,
        gameStatus: "Connected. Ready to play!",
      }));
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      toast.error("Disconnected from server");
      setGameState((prev) => ({
        ...prev,
        gameStatus: "Disconnected from server",
        isGameStarted: false,
      }));
    });

    newSocket.on("error", (error: { message: string }) => {
      console.error("Socket error:", error);
      toast.error(error.message || "An error occurred");
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Create a game with a bet
  const createGame = useCallback(
    (betId: number) => {
      if (!socket || !isConnected || !address) {
        toast.error("Please connect your wallet first");
        return;
      }

      socket.emit("createGame", {
        betId,
        playerAddress: address,
      });

      setGameState((prev) => ({
        ...prev,
        betId,
        gameStatus: "Waiting for opponent to join...",
      }));
    },
    [socket, isConnected, address]
  );

  // Join an existing game
  const joinGame = useCallback(
    (gameId: string, betId: number) => {
      if (!socket || !isConnected || !address) {
        toast.error("Please connect your wallet first");
        return;
      }

      socket.emit("joinGame", {
        gameId,
        betId,
        playerAddress: address,
      });
    },
    [socket, isConnected, address]
  );

  // Handle player role assignment
  useEffect(() => {
    if (!socket) return;

    socket.on(
      "playerRole",
      ({ role, gameId }: { role: "w" | "b"; gameId: string }) => {
        console.log("Assigned role:", role, "Game ID:", gameId);
        const roleText = role === "w" ? "White" : "Black";
        toast.success(`You are playing as ${roleText}`);
        setGameState((prev) => ({
          ...prev,
          playerRole: role,
          gameId,
          isMyTurn: role === "w",
          gameStatus:
            role === "w"
              ? "You are White. Waiting for opponent..."
              : "You are Black. Waiting for game to start...",
        }));
      }
    );

    socket.on("spectatorRole", () => {
      console.log("Assigned as spectator");
      toast.info("You are watching as a spectator");
      setGameState((prev) => ({
        ...prev,
        playerRole: "spectator",
        gameStatus: "You are spectating",
      }));
    });

    return () => {
      socket.off("playerRole");
      socket.off("spectatorRole");
    };
  }, [socket]);

  // Handle game creation and joining events
  useEffect(() => {
    if (!socket) return;

    // When Player 1 creates a game
    socket.on(
      "gameCreated",
      ({
        gameId,
        color,
        betId,
      }: {
        gameId: string;
        color: string;
        betId: number;
      }) => {
        console.log("Game created:", gameId, "Color:", color, "BetId:", betId);
        toast.success("Game created! Waiting for opponent...");
        setGameState((prev) => ({
          ...prev,
          gameId,
          betId,
          playerRole: color as PlayerRole,
          isMyTurn: color === "w",
          gameStatus: "Waiting for opponent to join...",
        }));
      }
    );

    // When Player 2 joins a game
    socket.on(
      "gameJoined",
      ({
        gameId,
        color,
        betId,
      }: {
        gameId: string;
        color: string;
        betId: number;
      }) => {
        console.log("Game joined:", gameId, "Color:", color, "BetId:", betId);
        toast.success("Joined game! Waiting for game to start...");
        setGameState((prev) => ({
          ...prev,
          gameId,
          betId,
          playerRole: color as PlayerRole,
          isMyTurn: color === "w",
          gameStatus: "Waiting for game to start...",
        }));
      }
    );

    // When opponent joins (for Player 1)
    socket.on(
      "opponentJoined",
      ({ opponentAddress }: { opponentAddress: string }) => {
        console.log("Opponent joined:", opponentAddress);
        toast.success("Opponent joined! Game starting...");
        setGameState((prev) => ({
          ...prev,
          gameStatus: "Opponent joined! Game starting...",
        }));
      }
    );

    return () => {
      socket.off("gameCreated");
      socket.off("gameJoined");
      socket.off("opponentJoined");
    };
  }, [socket]);

  // Handle game started
  useEffect(() => {
    if (!socket) return;

    socket.on("gameStarted", ({ gameId }: { gameId: string }) => {
      console.log("Game started:", gameId);
      toast.success("Game started! Good luck!");
      setGameState((prev) => ({
        ...prev,
        gameId,
        isGameStarted: true,
        gameStatus: prev.playerRole === "w" ? "Your turn" : "Opponent's turn",
      }));
    });

    return () => {
      socket.off("gameStarted");
    };
  }, [socket]);

  // Handle board state updates
  useEffect(() => {
    if (!socket) return;

    socket.on("boardState", (fen: string) => {
      console.log("Board state:", fen);
      setGameState((prev) => {
        const newChess = new Chess(fen);
        return {
          ...prev,
          chess: newChess,
          moveHistory: newChess.history({ verbose: true }),
        };
      });
    });

    return () => {
      socket.off("boardState");
    };
  }, [socket]);

  // Handle moves
  useEffect(() => {
    if (!socket) return;

    socket.on("move", (move: Move) => {
      console.log("Move received:", move);
      setGameState((prev) => {
        const newChess = new Chess(prev.chess.fen());
        try {
          newChess.move(move);
          const isMyTurn =
            prev.playerRole !== "spectator" &&
            newChess.turn() === prev.playerRole;

          return {
            ...prev,
            chess: newChess,
            lastMove: move,
            moveHistory: newChess.history({ verbose: true }),
            isMyTurn,
            gameStatus: isMyTurn ? "Your turn" : "Opponent's turn",
          };
        } catch (error) {
          console.error("Error applying move:", error);
          return prev;
        }
      });
    });

    socket.on("check", () => {
      toast.warning("Check!", {
        description: "Your king is under attack!",
      });
      setGameState((prev) => ({
        ...prev,
        gameStatus: "Check!",
      }));
    });

    socket.on("invalidMove", (move: any) => {
      console.log("Invalid move:", move);
      toast.error("Invalid Move!", {
        description: "That move is not legal. Try a different move.",
      });
    });

    return () => {
      socket.off("move");
      socket.off("check");
      socket.off("invalidMove");
    };
  }, [socket]);

  // Handle game over
  useEffect(() => {
    if (!socket) return;

    socket.on(
      "gameOver",
      ({ winner, reason }: { winner: string | null; reason: string }) => {
        console.log("Game over:", winner, reason);
        let status = "";

        if (reason === "checkmate") {
          status = winner ? `Checkmate! ${winner} wins!` : "Checkmate!";
          if (winner) {
            toast.success(`Game Over - ${winner} wins!`, {
              description: "Checkmate!",
            });
          }
        } else if (reason === "draw") {
          status = "Game drawn!";
          toast.info("Game drawn!", {
            description: "The game ended in a draw",
          });
        }

        setGameState((prev) => ({
          ...prev,
          gameStatus: status,
          winner,
          isGameStarted: false,
        }));
      }
    );

    return () => {
      socket.off("gameOver");
    };
  }, [socket]);

  // Make a move
  const makeMove = useCallback(
    (sourceSquare: string, targetSquare: string): boolean => {
      if (!socket || !gameState.isGameStarted) {
        toast.error("Game hasn't started yet");
        return false;
      }

      if (gameState.playerRole === "spectator") {
        toast.error("Spectators cannot make moves");
        return false;
      }

      if (!gameState.isMyTurn) {
        toast.error("It's not your turn!");
        return false;
      }

      const gameCopy = new Chess(gameState.chess.fen());

      try {
        // Try move without promotion first
        let move = gameCopy.move({
          from: sourceSquare,
          to: targetSquare,
        });

        // If move is null, it might be a pawn promotion - try with promotion
        if (!move) {
          move = gameCopy.move({
            from: sourceSquare,
            to: targetSquare,
            promotion: "q", // Auto-promote to queen
          });
        }

        if (move) {
          // Send the move to backend (include promotion only if it was used)
          const moveData: any = {
            from: sourceSquare,
            to: targetSquare,
          };

          if (move.promotion) {
            moveData.promotion = move.promotion;
          }

          socket.emit("move", moveData);
          return true;
        }
        return false;
      } catch (error) {
        console.error("Invalid move:", error);
        return false;
      }
    },
    [socket, gameState]
  );

  // Reset game
  const resetGame = useCallback(() => {
    setGameState({
      chess: new Chess(),
      playerRole: null,
      isGameStarted: false,
      isMyTurn: false,
      gameStatus: "Ready to play",
      moveHistory: [],
      lastMove: null,
      winner: null,
      gameId: null,
      betId: null,
    });
  }, []);

  return {
    ...gameState,
    makeMove,
    resetGame,
    createGame,
    joinGame,
    isConnected: isConnected && !!socket?.connected,
    walletAddress: address,
  };
}
