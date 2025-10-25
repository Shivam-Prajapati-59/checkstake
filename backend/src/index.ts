import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { Chess } from "chess.js";
import cors from "cors";
import { ethers } from "ethers";
import {
  getBetDetails,
  declareWinner,
  declareDraw,
  getPlayerStats,
  getAvailableBets,
  setupContractListeners,
  getBetCounter,
  getActiveBetsCount,
  isBlockchainEnabled,
} from "./contracts/chessBetting";
import { BetStatus, GameResult } from "./contracts/abi";
import {
  GameState,
  BetGameMapping,
  MoveData,
  CreateGamePayload,
  JoinGamePayload,
  GameOverPayload,
} from "./types/game";

const app = express();
const PORT = 5000;

// Enable CORS for Next.js frontend
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

// Create HTTP server and Socket.io instance
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Game state management - Support multiple concurrent games
const games: Map<string, GameState> = new Map();
const betGameMappings: Map<number, BetGameMapping> = new Map();
const socketToGame: Map<string, string> = new Map();
const addressToSocket: Map<string, string> = new Map();

// Setup contract event listeners
setupContractListeners(io);

// Helper function for consistent error messaging
const emitError = (socket: Socket, message: string) => {
  socket.emit("error", { message });
};

// HTTP Routes
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "♟️ Chess Game Server with Blockchain Betting",
    endpoints: {
      socket: "ws://localhost:5000",
      health: "/health",
      bet: "/api/bet/:betId",
      stats: "/api/stats/:address",
      games: "/api/games",
      blockchain: "/api/blockchain/status",
    },
    blockchainEnabled: isBlockchainEnabled,
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    activeGames: games.size,
    activeBets: betGameMappings.size,
    blockchainEnabled: isBlockchainEnabled,
  });
});

// Get bet details
app.get("/api/bet/:betId", async (req: Request, res: Response) => {
  try {
    const betId = parseInt(req.params.betId);
    if (isNaN(betId)) {
      return res.status(400).json({ success: false, error: "Invalid bet ID" });
    }

    const betDetails = await getBetDetails(betId);
    if (!betDetails) {
      return res.status(404).json({
        success: false,
        error: "Bet not found or blockchain disabled",
      });
    }

    res.json({ success: true, bet: betDetails });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get player stats
app.get("/api/stats/:address", async (req: Request, res: Response) => {
  try {
    const address = req.params.address;
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ success: false, error: "Invalid address" });
    }

    const stats = await getPlayerStats(address);
    if (!stats) {
      return res.status(404).json({
        success: false,
        error: "Stats not found or blockchain disabled",
      });
    }

    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all active games
app.get("/api/games", (req: Request, res: Response) => {
  const activeGames = Array.from(games.values()).map((game) => ({
    gameId: game.gameId,
    betId: game.betId,
    status: game.status,
    player1Address: game.player1.address,
    player2Address: game.player2.address,
    startTime: game.startTime,
    moves: game.moves.length,
  }));

  res.json({
    success: true,
    games: activeGames,
    count: activeGames.length,
  });
});

// Blockchain status
app.get("/api/blockchain/status", async (req: Request, res: Response) => {
  try {
    const betCounter = await getBetCounter();
    const activeBets = await getActiveBetsCount();

    res.json({
      success: true,
      enabled: isBlockchainEnabled,
      totalBets: betCounter,
      activeBets: activeBets,
      contractAddress: process.env.CONTRACT_ADDRESS,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get available bets (Created status - waiting for second player)
app.get("/api/bets/available", async (req: Request, res: Response) => {
  try {
    const availableBets = await getAvailableBets();

    res.json({
      success: true,
      bets: availableBets,
      count: availableBets.length,
    });
  } catch (error: any) {
    console.error("Error fetching available bets:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      bets: [],
    });
  }
});

// Socket.io Connection Handler
io.on("connection", (socket: Socket) => {
  console.log(`🔌 Player connected: ${socket.id}`);

  // Send connection confirmation
  socket.emit("connected", {
    socketId: socket.id,
    blockchainEnabled: isBlockchainEnabled,
  });

  // Create new game
  socket.on("createGame", async (data: CreateGamePayload) => {
    try {
      // Use betId as gameId for consistency - this ensures Player 2 can find the game
      const gameId = data.betId
        ? `game_${data.betId}`
        : `game_${Date.now()}_${socket.id.slice(0, 6)}`;
      const chess = new Chess();

      const gameState: GameState = {
        gameId,
        betId: data.betId,
        gameHash: data.gameHash,
        player1: {
          socketId: socket.id,
          address: data.playerAddress,
          color: "w",
        },
        player2: {
          socketId: "",
          address: undefined,
          color: "b",
        },
        chess,
        startTime: Date.now(),
        moves: [],
        status: "waiting",
      };

      // If betId provided, verify and link
      if (data.betId && isBlockchainEnabled) {
        const betDetails = await getBetDetails(data.betId);

        if (!betDetails) {
          emitError(socket, "Bet not found");
          return;
        }

        if (
          betDetails.status !== BetStatus.Active &&
          betDetails.status !== BetStatus.Created
        ) {
          emitError(socket, "Bet is not active");
          return;
        }

        // Verify player address matches
        if (
          data.playerAddress &&
          betDetails.player1.toLowerCase() !==
            data.playerAddress.toLowerCase() &&
          betDetails.player2.toLowerCase() !== data.playerAddress.toLowerCase()
        ) {
          emitError(socket, "You are not part of this bet");
          return;
        }

        gameState.gameHash = betDetails.gameHash;
      }

      games.set(gameId, gameState);
      socketToGame.set(socket.id, gameId);
      if (data.playerAddress) {
        addressToSocket.set(data.playerAddress.toLowerCase(), socket.id);
      }

      // Join the game room
      socket.join(gameId);

      socket.emit("gameCreated", {
        gameId,
        color: "w",
        fen: chess.fen(),
        betId: data.betId,
        blockchainEnabled: isBlockchainEnabled,
      });

      console.log(
        `✅ Game created: ${gameId}${
          data.betId ? `, BetId: ${data.betId}` : ""
        }`
      );
      console.log(`   Player 1 (White) socketId: ${socket.id}`);
      console.log(`   Player 1 joined room: ${gameId}`);
    } catch (error: any) {
      console.error("❌ Error creating game:", error);
      emitError(socket, error.message || "Failed to create game");
    }
  });

  // Join existing game
  socket.on("joinGame", async (data: JoinGamePayload) => {
    try {
      console.log(`🎮 Player attempting to join game: ${data.gameId}`);
      console.log(`   Player address: ${data.playerAddress}`);

      const game = games.get(data.gameId);

      if (!game) {
        console.error(`❌ Game not found: ${data.gameId}`);
        console.log(`   Available games:`, Array.from(games.keys()));
        emitError(socket, "Game not found");
        return;
      }

      if (game.player2.socketId) {
        emitError(socket, "Game is full");
        return;
      }

      if (game.status !== "waiting") {
        emitError(socket, "Game is not accepting players");
        return;
      }

      // Verify bet participant if bet exists
      if (game.betId && data.playerAddress && isBlockchainEnabled) {
        const betDetails = await getBetDetails(game.betId);

        if (!betDetails) {
          emitError(socket, "Bet not found");
          return;
        }

        console.log(`🔍 Verifying player for bet ${game.betId}:`);
        console.log(`   Player address: ${data.playerAddress.toLowerCase()}`);
        console.log(`   Bet player1: ${betDetails.player1.toLowerCase()}`);
        console.log(`   Bet player2: ${betDetails.player2.toLowerCase()}`);
        console.log(`   Bet status: ${betDetails.status}`);

        const isPlayer1 =
          betDetails.player1.toLowerCase() === data.playerAddress.toLowerCase();
        const isPlayer2 =
          betDetails.player2.toLowerCase() === data.playerAddress.toLowerCase();

        // Player must be either player1 or player2 (transaction is now confirmed)
        if (!isPlayer1 && !isPlayer2) {
          emitError(socket, "You are not part of this bet");
          return;
        }
      }

      game.player2.socketId = socket.id;
      game.player2.address = data.playerAddress;
      game.status = "active";

      socketToGame.set(socket.id, data.gameId);
      if (data.playerAddress) {
        addressToSocket.set(data.playerAddress.toLowerCase(), socket.id);
      }

      // Join the game room
      socket.join(data.gameId);

      // Notify player who joined
      socket.emit("gameJoined", {
        gameId: data.gameId,
        color: "b",
        fen: game.chess.fen(),
        betId: game.betId,
      });

      // Notify opponent (player1)
      io.to(game.player1.socketId).emit("opponentJoined", {
        opponentSocketId: socket.id,
        opponentAddress: data.playerAddress,
      });

      console.log(
        `   🔔 Sent opponentJoined to Player 1 (${game.player1.socketId})`
      );

      // Broadcast game started to both players in the room
      io.to(data.gameId).emit("gameStarted", {
        gameId: data.gameId,
        betId: game.betId,
      });

      console.log(
        `✅ Player joined game: ${data.gameId} - Game is now active!`
      );
      console.log(`   Player 1 (White) socketId: ${game.player1.socketId}`);
      console.log(`   Player 2 (Black) socketId: ${socket.id}`);
      console.log(`   Both players in room: ${data.gameId}`);
    } catch (error: any) {
      console.error("❌ Error joining game:", error);
      emitError(socket, error.message || "Failed to join game");
    }
  });

  // Handle chess moves
  socket.on("move", async (move: MoveData) => {
    try {
      const gameId = socketToGame.get(socket.id);

      if (!gameId) {
        socket.emit("error", "Not in a game");
        return;
      }

      const game = games.get(gameId);
      if (!game || game.status !== "active") {
        socket.emit("error", "Game not active");
        return;
      }

      // Validate it's the correct player's turn
      const currentTurn = game.chess.turn();
      const isPlayer1 = socket.id === game.player1.socketId;
      const isPlayer2 = socket.id === game.player2.socketId;

      if (
        (currentTurn === "w" && !isPlayer1) ||
        (currentTurn === "b" && !isPlayer2)
      ) {
        socket.emit("error", "Not your turn");
        return;
      }

      // Attempt the move
      const result = game.chess.move(move);

      if (result) {
        game.moves.push(result.san);

        // Broadcast move to all players in the game room
        io.to(gameId).emit("move", result);
        io.to(gameId).emit("boardState", game.chess.fen());

        console.log(`♟️  Move in ${gameId}: ${result.from} -> ${result.to}`);

        // Check game end conditions
        if (game.chess.isCheckmate()) {
          const winner = game.chess.turn() === "w" ? "black" : "white";
          game.status = "completed";
          game.winner = winner;
          game.reason = "checkmate";
          game.endTime = Date.now();

          io.to(gameId).emit("gameOver", {
            gameId,
            winner,
            reason: "checkmate",
            betId: game.betId,
          });

          console.log(`🏁 Game Over: ${winner} wins by checkmate`);

          // Declare winner on blockchain if bet exists
          if (game.betId && isBlockchainEnabled) {
            try {
              const winnerAddress =
                winner === "white"
                  ? game.player1.address
                  : game.player2.address;

              if (winnerAddress) {
                console.log(`🔗 Declaring winner on blockchain...`);
                await declareWinner(game.betId, winnerAddress);

                io.to(game.player1.socketId)
                  .to(game.player2.socketId)
                  .emit("betResolved", {
                    betId: game.betId,
                    winner: winnerAddress,
                    result: "checkmate",
                  });

                console.log(
                  `✅ Winner declared on blockchain: ${winnerAddress}`
                );
              }
            } catch (error: any) {
              console.error(
                "❌ Error declaring winner on blockchain:",
                error.message
              );
              io.to(gameId).emit("blockchainError", {
                message: "Failed to declare winner on blockchain",
                error: error.message,
              });
            }
          }
        } else if (game.chess.isDraw()) {
          game.status = "completed";
          game.winner = "draw";
          game.reason = "draw";
          game.endTime = Date.now();

          io.to(gameId).emit("gameOver", {
            gameId,
            winner: null,
            reason: "draw",
            betId: game.betId,
          });

          console.log(`🏁 Game Over: Draw`);

          // Declare draw on blockchain if bet exists
          if (game.betId && isBlockchainEnabled) {
            try {
              console.log(`🔗 Declaring draw on blockchain...`);
              await declareDraw(game.betId);

              io.to(gameId).emit("betResolved", {
                betId: game.betId,
                result: "draw",
              });

              console.log(`✅ Draw declared on blockchain`);
            } catch (error: any) {
              console.error(
                "❌ Error declaring draw on blockchain:",
                error.message
              );
              io.to(gameId).emit("blockchainError", {
                message: "Failed to declare draw on blockchain",
                error: error.message,
              });
            }
          }
        } else if (game.chess.isCheck()) {
          io.to(gameId).emit("check");
          console.log(`⚠️  Check!`);
        }
      } else {
        socket.emit("invalidMove", move);
        console.log(`❌ Invalid move attempted: ${JSON.stringify(move)}`);
      }
    } catch (error: any) {
      console.error("❌ Move error:", error);
      socket.emit("error", "Invalid move");
    }
  });

  // Handle game reset request
  socket.on("resetGame", () => {
    const gameId = socketToGame.get(socket.id);
    if (!gameId) return;

    const game = games.get(gameId);
    if (!game) return;

    game.chess.reset();
    game.moves = [];
    game.status = "active";
    game.winner = undefined;
    game.reason = undefined;

    io.to(gameId).emit("gameReset");
    io.to(gameId).emit("boardState", game.chess.fen());

    console.log(`🔄 Game reset: ${gameId}`);
  });

  // Handle player disconnection
  socket.on("disconnect", () => {
    console.log(`🔌 Player disconnected: ${socket.id}`);

    const gameId = socketToGame.get(socket.id);
    if (gameId) {
      const game = games.get(gameId);
      if (game) {
        game.status = "abandoned";

        // Notify other player
        const otherSocketId =
          socket.id === game.player1.socketId
            ? game.player2.socketId
            : game.player1.socketId;

        if (otherSocketId) {
          io.to(otherSocketId).emit("playerDisconnected", {
            gameId,
            message: "Your opponent has disconnected",
          });
        }

        console.log(`⚠️  Game abandoned: ${gameId}`);

        // Clean up after 5 minutes
        setTimeout(() => {
          games.delete(gameId);
          console.log(`🗑️  Cleaned up abandoned game: ${gameId}`);
        }, 5 * 60 * 1000);
      }

      socketToGame.delete(socket.id);

      // Clean up address mapping
      for (const [address, sockId] of addressToSocket.entries()) {
        if (sockId === socket.id) {
          addressToSocket.delete(address);
          break;
        }
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(
    `🚀 Chess Server with Blockchain running on http://localhost:${PORT}`
  );
  console.log(`🔌 WebSocket server ready`);
  console.log(
    `⛓️  Blockchain integration: ${
      isBlockchainEnabled ? "ENABLED" : "DISABLED"
    }`
  );
  if (isBlockchainEnabled) {
    console.log(`📜 Contract: ${process.env.CONTRACT_ADDRESS}`);
  }
});
