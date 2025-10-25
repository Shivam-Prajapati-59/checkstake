import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { GameService } from "./services/GameService";
import { SocketHandlers } from "./sockets/SocketHandlers";
import { createApiRoutes } from "./routes/api";
import { setupContractListeners } from "./contracts/chessBetting";
import { GameState, BetGameMapping } from "./types/game";

const PORT = 5000;

/**
 * Initialize Express app
 */
const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());

/**
 * Create HTTP server and Socket.IO instance
 */
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

/**
 * Game state management
 */
const games: Map<string, GameState> = new Map();
const betGameMappings: Map<number, BetGameMapping> = new Map();
const socketToGame: Map<string, string> = new Map();
const addressToSocket: Map<string, string> = new Map();

/**
 * Initialize services
 */
const gameService = new GameService(io, games);
const socketHandlers = new SocketHandlers(
  io,
  gameService,
  socketToGame,
  addressToSocket,
  betGameMappings
);

/**
 * Setup routes
 */
app.use(createApiRoutes(gameService));

/**
 * Setup blockchain event listeners
 */
setupContractListeners(io);

/**
 * Socket.IO connection handler
 */
io.on("connection", (socket) => {
  socketHandlers.handleConnection(socket);
});

/**
 * Start server
 */
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready`);
  console.log(`🌐 API: http://localhost:${PORT}`);
  console.log(`⚡ WebSocket: ws://localhost:${PORT}`);
  console.log(`\n♟️  Chess Betting Server Online\n`);
});

/**
 * Graceful shutdown
 */
process.on("SIGTERM", () => {
  console.log("\n⚠️  SIGTERM signal received: closing HTTP server");
  httpServer.close(() => {
    console.log("✅ HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\n⚠️  SIGINT signal received: closing HTTP server");
  httpServer.close(() => {
    console.log("✅ HTTP server closed");
    process.exit(0);
  });
});
