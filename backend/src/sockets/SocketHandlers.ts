import { Server, Socket } from "socket.io";
import { Chess } from "chess.js";
import { GameService } from "../services/GameService";
import {
  GameState,
  BetGameMapping,
  CreateGamePayload,
  JoinGamePayload,
  MoveData,
} from "../types/game";

/**
 * Socket Event Handlers
 */
export class SocketHandlers {
  private io: Server;
  private gameService: GameService;
  private socketToGame: Map<string, string>;
  private addressToSocket: Map<string, string>;
  private betGameMappings: Map<number, BetGameMapping>;

  constructor(
    io: Server,
    gameService: GameService,
    socketToGame: Map<string, string>,
    addressToSocket: Map<string, string>,
    betGameMappings: Map<number, BetGameMapping>
  ) {
    this.io = io;
    this.gameService = gameService;
    this.socketToGame = socketToGame;
    this.addressToSocket = addressToSocket;
    this.betGameMappings = betGameMappings;
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket: Socket): void {
    console.log(`🔌 New connection: ${socket.id}`);

    // Register event listeners
    socket.on("createGame", (data: CreateGamePayload) =>
      this.handleCreateGame(socket, data)
    );
    socket.on("joinGame", (data: JoinGamePayload) =>
      this.handleJoinGame(socket, data)
    );
    socket.on("move", (move: MoveData) => this.handleMove(socket, move));
    socket.on("disconnect", () => this.handleDisconnect(socket));
    socket.on("resignGame", () => this.handleResign(socket));
  }

  /**
   * Handle game creation
   */
  private handleCreateGame(socket: Socket, data: CreateGamePayload): void {
    try {
      const { betId, playerAddress } = data;
      const gameId = betId ? `game_${betId}` : `game_${Date.now()}`;

      // Check if game already exists
      if (this.gameService.getGame(gameId)) {
        socket.emit("error", { message: "Game already exists" });
        return;
      }

      // Create new chess instance
      const chess = new Chess();

      // Create game state
      const gameState: GameState = {
        gameId,
        betId,
        player1: {
          socketId: socket.id,
          address: playerAddress,
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

      // Store game
      this.gameService.createGame(gameId, gameState);
      this.socketToGame.set(socket.id, gameId);

      if (playerAddress) {
        this.addressToSocket.set(playerAddress, socket.id);
      }

      if (betId && playerAddress) {
        this.betGameMappings.set(betId, {
          betId,
          gameId,
          gameHash: "",
          player1Address: playerAddress,
          player2Address: "",
          betAmount: "0",
          status: "pending",
          createdAt: Date.now(),
        });
      }

      // Join socket room
      socket.join(gameId);

      // Emit success
      socket.emit("gameCreated", {
        gameId,
        color: "white",
        fen: chess.fen(),
      });

      console.log(
        `🎮 Game created: ${gameId} by ${playerAddress || socket.id}`
      );
    } catch (error: any) {
      console.error("❌ Error creating game:", error.message);
      socket.emit("error", { message: "Failed to create game" });
    }
  }

  /**
   * Handle player joining game
   */
  private handleJoinGame(socket: Socket, data: JoinGamePayload): void {
    try {
      const { gameId, playerAddress } = data;
      const game = this.gameService.getGame(gameId);

      if (!game) {
        socket.emit("error", { message: "Game not found" });
        return;
      }

      if (game.status !== "waiting") {
        socket.emit("error", { message: "Game already started or completed" });
        return;
      }

      if (game.player1.address === playerAddress) {
        socket.emit("error", {
          message: "Cannot play against yourself",
        });
        return;
      }

      // Add player 2
      game.player2 = {
        socketId: socket.id,
        address: playerAddress,
        color: "b",
      };
      game.status = "active";

      this.socketToGame.set(socket.id, gameId);

      if (playerAddress) {
        this.addressToSocket.set(playerAddress, socket.id);
      }

      // Update bet mapping
      if (game.betId && playerAddress) {
        const mapping = this.betGameMappings.get(game.betId);
        if (mapping) {
          mapping.player2Address = playerAddress;
          mapping.status = "active";
        }
      }

      // Join socket room
      socket.join(gameId);

      // Notify both players
      this.io.to(gameId).emit("gameStarted", {
        gameId,
        player1: game.player1.address,
        player2: game.player2.address,
        fen: game.chess.fen(),
      });

      // Send individual color assignments
      this.io.to(game.player1.socketId).emit("colorAssignment", {
        color: "white",
      });
      this.io.to(game.player2.socketId).emit("colorAssignment", {
        color: "black",
      });

      console.log(
        `👥 Player 2 joined: ${gameId} - ${playerAddress || socket.id}`
      );
    } catch (error: any) {
      console.error("❌ Error joining game:", error.message);
      socket.emit("error", { message: "Failed to join game" });
    }
  }

  /**
   * Handle chess move
   */
  private async handleMove(socket: Socket, move: MoveData): Promise<void> {
    try {
      const gameId = this.socketToGame.get(socket.id);

      if (!gameId) {
        socket.emit("error", { message: "You are not in a game" });
        return;
      }

      const result = await this.gameService.processMove(
        gameId,
        move,
        socket.id
      );

      if (!result.success) {
        socket.emit("invalidMove", move);
        console.log(
          `❌ Invalid move attempted in ${gameId}: ${JSON.stringify(move)}`
        );
      }
    } catch (error: any) {
      console.error("❌ Error handling move:", error.message);
      socket.emit("error", { message: "Failed to process move" });
    }
  }

  /**
   * Handle player resignation
   */
  private handleResign(socket: Socket): void {
    try {
      const gameId = this.socketToGame.get(socket.id);

      if (!gameId) {
        socket.emit("error", { message: "You are not in a game" });
        return;
      }

      const game = this.gameService.getGame(gameId);

      if (!game) {
        return;
      }

      // Determine winner (opponent of resigning player)
      const resigningPlayer =
        socket.id === game.player1.socketId ? "white" : "black";
      const winner = resigningPlayer === "white" ? "black" : "white";

      game.status = "completed";
      game.winner = winner;
      game.reason = "resignation";
      game.endTime = Date.now();

      // Emit game over
      this.io.to(gameId).emit("gameOver", {
        gameId,
        winner,
        reason: "resignation",
        betId: game.betId,
      });

      console.log(`🏳️  ${resigningPlayer} resigned in ${gameId}`);

      // Clean up
      this.cleanupGame(gameId, game);
    } catch (error: any) {
      console.error("❌ Error handling resignation:", error.message);
    }
  }

  /**
   * Handle disconnection
   */
  private handleDisconnect(socket: Socket): void {
    console.log(`🔌 Disconnected: ${socket.id}`);

    const gameId = this.socketToGame.get(socket.id);

    if (gameId) {
      const game = this.gameService.getGame(gameId);

      if (game && game.status === "active") {
        // Notify opponent
        this.io.to(gameId).emit("playerDisconnected", {
          message: "Opponent disconnected",
        });

        console.log(`⚠️  Player disconnected from active game: ${gameId}`);
      }

      // Clean up mappings
      this.socketToGame.delete(socket.id);

      // Remove from address mapping
      const addressEntries = Array.from(this.addressToSocket.entries());
      for (const [address, sid] of addressEntries) {
        if (sid === socket.id) {
          this.addressToSocket.delete(address);
        }
      }
    }
  }

  /**
   * Clean up game data
   */
  private cleanupGame(gameId: string, game: GameState): void {
    // Remove socket mappings
    this.socketToGame.delete(game.player1.socketId);
    this.socketToGame.delete(game.player2.socketId);

    // Remove address mappings
    if (game.player1.address) {
      this.addressToSocket.delete(game.player1.address);
    }
    if (game.player2.address) {
      this.addressToSocket.delete(game.player2.address);
    }

    // Remove bet mapping
    if (game.betId) {
      this.betGameMappings.delete(game.betId);
    }

    // Can optionally delete game after some time
    // For now, keep for history
  }
}
