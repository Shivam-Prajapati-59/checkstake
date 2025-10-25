"use client";

import { useEffect, useState, useCallback } from "react";
import { Socket, io } from "socket.io-client";
import { Chess, Move } from "chess.js";
import { toast } from "sonner";

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
}

export function useChessGame() {
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
  });

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io("http://localhost:5000", {
      transports: ["websocket"],
    });

    newSocket.on("connect", () => {
      console.log("Connected to server");
      toast.success("Connected to server");
      setGameState((prev) => ({
        ...prev,
        gameStatus: "Waiting for opponent...",
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

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Handle player role assignment
  useEffect(() => {
    if (!socket) return;

    socket.on("playerRole", (role: "w" | "b") => {
      console.log("Assigned role:", role);
      const roleText = role === "w" ? "White" : "Black";
      toast.success(`You are playing as ${roleText}`);
      setGameState((prev) => ({
        ...prev,
        playerRole: role,
        isMyTurn: role === "w",
        gameStatus:
          role === "w"
            ? "You are White. Waiting for opponent..."
            : "You are Black. Waiting for game to start...",
      }));
    });

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

  // Handle game events
  useEffect(() => {
    if (!socket) return;

    socket.on("gameStarted", () => {
      console.log("Game started");
      toast.success("Game started! Good luck!");
      setGameState((prev) => ({
        ...prev,
        isGameStarted: true,
        gameStatus: prev.playerRole === "w" ? "Your turn" : "Opponent's turn",
      }));
    });

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

    socket.on("invalidMove", (move: any) => {
      console.log("Invalid move:", move);
      toast.error("Invalid Move!", {
        description: "That move is not legal. Try a different move.",
      });
      setGameState((prev) => ({
        ...prev,
        gameStatus: "Invalid move!",
      }));
      setTimeout(() => {
        setGameState((prev) => ({
          ...prev,
          gameStatus: prev.isMyTurn ? "Your turn" : "Opponent's turn",
        }));
      }, 2000);
    });

    socket.on("error", (message: string) => {
      console.error("Server error:", message);
      toast.error("Error", {
        description: message,
      });
      setGameState((prev) => ({
        ...prev,
        gameStatus: `Error: ${message}`,
      }));
    });

    socket.on("playerDisconnected", () => {
      toast.warning("Opponent Disconnected", {
        description: "Your opponent has left the game",
      });
      setGameState((prev) => ({
        ...prev,
        gameStatus: "Opponent disconnected",
        isGameStarted: false,
      }));
    });

    socket.on("gameReset", () => {
      toast.info("Game Reset", {
        description: "Starting a new game...",
      });
      setGameState((prev) => ({
        ...prev,
        chess: new Chess(),
        isGameStarted: false,
        moveHistory: [],
        lastMove: null,
        winner: null,
        gameStatus: "Game reset. Waiting for players...",
      }));
    });

    return () => {
      socket.off("gameStarted");
      socket.off("boardState");
      socket.off("move");
      socket.off("check");
      socket.off("gameOver");
      socket.off("invalidMove");
      socket.off("error");
      socket.off("playerDisconnected");
      socket.off("gameReset");
    };
  }, [socket]);

  // Make a move
  const makeMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      if (!socket) {
        toast.error("Not connected to server");
        return false;
      }

      if (gameState.playerRole === "spectator") {
        toast.warning("Spectators cannot make moves");
        return false;
      }

      if (!gameState.isMyTurn) {
        toast.warning("Not Your Turn", {
          description: "Please wait for your opponent to move",
        });
        return false;
      }

      if (!gameState.isGameStarted) {
        toast.info("Game not started", {
          description: "Waiting for opponent to join...",
        });
        return false;
      }

      const move = {
        from,
        to,
        promotion: promotion || "q",
      };

      socket.emit("move", move);
      return true;
    },
    [socket, gameState.isMyTurn, gameState.playerRole, gameState.isGameStarted]
  );

  // Reset game
  const resetGame = useCallback(() => {
    if (socket) {
      socket.emit("resetGame");
    }
  }, [socket]);

  return {
    ...gameState,
    makeMove,
    resetGame,
    isConnected: socket?.connected || false,
  };
}
