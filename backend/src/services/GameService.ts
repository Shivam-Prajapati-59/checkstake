import { Chess } from "chess.js";
import { Server } from "socket.io";
import { GameState, MoveData } from "../types/game";
import { declareWinner, declareDraw } from "../contracts/chessBetting";

/**
 * Game Service - Handles all game logic
 */
export class GameService {
  private games: Map<string, GameState>;
  private io: Server;

  constructor(io: Server, games: Map<string, GameState>) {
    this.io = io;
    this.games = games;
  }

  /**
   * Get game by ID
   */
  getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  /**
   * Create a new game
   */
  createGame(gameId: string, gameState: GameState): void {
    this.games.set(gameId, gameState);
    console.log(`🎮 Game created: ${gameId}`);
  }

  /**
   * Delete a game
   */
  deleteGame(gameId: string): void {
    this.games.delete(gameId);
    console.log(`🗑️  Game deleted: ${gameId}`);
  }

  /**
   * Get all active games
   */
  getActiveGames(): GameState[] {
    return Array.from(this.games.values());
  }

  /**
   * Get game by bet ID
   */
  getGameByBetId(betId: number): GameState | undefined {
    return Array.from(this.games.values()).find((game) => game.betId === betId);
  }

  /**
   * Process a chess move
   */
  async processMove(
    gameId: string,
    move: MoveData,
    socketId: string
  ): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
    const game = this.games.get(gameId);

    if (!game) {
      return { success: false, error: "Game not found" };
    }

    // Validate it's the player's turn
    const currentTurn = game.chess.turn();
    const isPlayer1Turn =
      currentTurn === "w" && socketId === game.player1.socketId;
    const isPlayer2Turn =
      currentTurn === "b" && socketId === game.player2.socketId;

    if (!isPlayer1Turn && !isPlayer2Turn) {
      return { success: false, error: "Not your turn" };
    }

    try {
      // Try move with promotion
      let result;
      try {
        result = game.chess.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion || "q",
        });
      } catch (err) {
        // Try without promotion
        result = game.chess.move({
          from: move.from,
          to: move.to,
        });
      }

      if (result) {
        game.moves.push(result.san);

        // Broadcast move to all players
        this.io.to(gameId).emit("move", result);
        this.io.to(gameId).emit("boardState", game.chess.fen());

        console.log(`♟️  Move in ${gameId}: ${result.from} -> ${result.to}`);

        // Check game end conditions
        await this.checkGameEnd(game, gameId);

        return { success: true, result };
      }

      return { success: false, error: "Invalid move" };
    } catch (error: any) {
      console.error(`❌ Error processing move in ${gameId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check for game end conditions (checkmate, draw, check)
   */
  private async checkGameEnd(game: GameState, gameId: string): Promise<void> {
    // Checkmate
    if (game.chess.isCheckmate()) {
      await this.handleCheckmate(game, gameId);
    }
    // Draw (stalemate, insufficient material, threefold repetition, 50-move rule)
    else if (game.chess.isDraw()) {
      await this.handleDraw(game, gameId);
    }
    // Check
    else if (game.chess.isCheck()) {
      this.io.to(gameId).emit("check");
      console.log(`⚠️  Check!`);
    }
  }

  /**
   * Handle checkmate scenario
   */
  private async handleCheckmate(
    game: GameState,
    gameId: string
  ): Promise<void> {
    // Determine winner (if it's white's turn and checkmate, black won)
    const winner = game.chess.turn() === "w" ? "black" : "white";
    game.status = "completed";
    game.winner = winner;
    game.reason = "checkmate";
    game.endTime = Date.now();

    // Emit game over event
    this.io.to(gameId).emit("gameOver", {
      gameId,
      winner,
      reason: "checkmate",
      betId: game.betId,
    });

    console.log(`🏁 Game Over: ${winner} wins by checkmate`);

    // Declare winner on blockchain if bet exists
    if (game.betId) {
      try {
        const winnerAddress =
          winner === "white" ? game.player1.address : game.player2.address;

        if (winnerAddress) {
          console.log(`🔗 Declaring winner on blockchain...`);
          await declareWinner(game.betId, winnerAddress);

          this.io
            .to(game.player1.socketId)
            .to(game.player2.socketId)
            .emit("betResolved", {
              betId: game.betId,
              winner: winnerAddress,
              result: "checkmate",
            });

          console.log(`✅ Winner declared on blockchain: ${winnerAddress}`);
        }
      } catch (error: any) {
        console.error(
          "❌ Error declaring winner on blockchain:",
          error.message
        );
        this.io.to(gameId).emit("blockchainError", {
          message: "Failed to declare winner on blockchain",
          error: error.message,
        });
      }
    }
  }

  /**
   * Handle draw scenario
   */
  private async handleDraw(game: GameState, gameId: string): Promise<void> {
    game.status = "completed";
    game.winner = "draw";
    game.reason = "draw";
    game.endTime = Date.now();

    // Emit game over event
    this.io.to(gameId).emit("gameOver", {
      gameId,
      winner: null,
      reason: "draw",
      betId: game.betId,
    });

    console.log(`🏁 Game Over: Draw`);

    // Declare draw on blockchain if bet exists
    if (game.betId) {
      try {
        console.log(`🔗 Declaring draw on blockchain...`);
        await declareDraw(game.betId);

        this.io.to(gameId).emit("betResolved", {
          betId: game.betId,
          result: "draw",
        });

        console.log(`✅ Draw declared on blockchain`);
      } catch (error: any) {
        console.error("❌ Error declaring draw on blockchain:", error.message);
        this.io.to(gameId).emit("blockchainError", {
          message: "Failed to declare draw on blockchain",
          error: error.message,
        });
      }
    }
  }

  /**
   * Get game statistics
   */
  getGameStats() {
    return {
      totalGames: this.games.size,
      activeGames: Array.from(this.games.values()).filter(
        (g) => g.status === "active"
      ).length,
      completedGames: Array.from(this.games.values()).filter(
        (g) => g.status === "completed"
      ).length,
    };
  }
}
