import { Router } from "express";
import { GameService } from "../services/GameService";
import {
  getBetDetails,
  getPlayerStats,
  getAvailableBets,
  getBetCounter,
  getActiveBetsCount,
  isBlockchainEnabled,
} from "../contracts/chessBetting";

export function createApiRoutes(gameService: GameService): Router {
  const router = Router();

  /**
   * Root endpoint
   */
  router.get("/", (req, res) => {
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

  /**
   * Health check endpoint
   */
  router.get("/health", (req, res) => {
    const gameStats = gameService.getGameStats();
    res.json({
      status: "healthy",
      activeGames: gameStats.activeGames,
      totalGames: gameStats.totalGames,
      blockchainEnabled: isBlockchainEnabled,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Get bet details by ID
   */
  router.get("/api/bet/:betId", async (req, res) => {
    try {
      const betId = parseInt(req.params.betId);
      if (isNaN(betId)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid bet ID" });
      }

      const betDetails = await getBetDetails(betId);
      if (!betDetails) {
        return res.status(404).json({
          success: false,
          error: "Bet not found",
        });
      }

      res.json({
        success: true,
        bet: betDetails,
      });
    } catch (error: any) {
      console.error("Error fetching bet details:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch bet details",
      });
    }
  });

  /**
   * Get player statistics
   */
  router.get("/api/stats/:address", async (req, res) => {
    try {
      const address = req.params.address;

      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({
          success: false,
          error: "Invalid Ethereum address",
        });
      }

      const stats = await getPlayerStats(address);

      res.json({
        success: true,
        stats,
      });
    } catch (error: any) {
      console.error("Error fetching player stats:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch player statistics",
      });
    }
  });

  /**
   * Get all active games
   */
  router.get("/api/games", (req, res) => {
    try {
      const games = gameService.getActiveGames();

      const gamesList = games.map((game) => ({
        gameId: game.gameId,
        betId: game.betId,
        status: game.status,
        player1: game.player1.address,
        player2: game.player2.address,
        moves: game.moves.length,
        startTime: game.startTime,
      }));

      res.json({
        success: true,
        count: gamesList.length,
        games: gamesList,
      });
    } catch (error: any) {
      console.error("Error fetching games:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch games",
      });
    }
  });

  /**
   * Get game by ID
   */
  router.get("/api/game/:gameId", (req, res) => {
    try {
      const gameId = req.params.gameId;
      const game = gameService.getGame(gameId);

      if (!game) {
        return res.status(404).json({
          success: false,
          error: "Game not found",
        });
      }

      res.json({
        success: true,
        game: {
          gameId: game.gameId,
          betId: game.betId,
          status: game.status,
          player1: game.player1.address,
          player2: game.player2.address,
          moves: game.moves,
          fen: game.chess.fen(),
          winner: game.winner,
          reason: game.reason,
          startTime: game.startTime,
          endTime: game.endTime,
        },
      });
    } catch (error: any) {
      console.error("Error fetching game:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch game",
      });
    }
  });

  /**
   * Get available bets
   */
  router.get("/api/bets/available", async (req, res) => {
    try {
      const bets = await getAvailableBets();

      res.json({
        success: true,
        count: bets.length,
        bets,
      });
    } catch (error: any) {
      console.error("Error fetching available bets:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch available bets",
      });
    }
  });

  /**
   * Get blockchain status
   */
  router.get("/api/blockchain/status", async (req, res) => {
    try {
      const betCounter = await getBetCounter();
      const activeBets = await getActiveBetsCount();

      res.json({
        success: true,
        enabled: isBlockchainEnabled,
        totalBets: betCounter,
        activeBets: activeBets,
      });
    } catch (error: any) {
      console.error("Error fetching blockchain status:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch blockchain status",
      });
    }
  });

  return router;
}
