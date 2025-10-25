import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { Chess } from "chess.js";
import cors from "cors";

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

// Game state management
interface Players {
  white?: string;
  black?: string;
}

const chess = new Chess();
const players: Players = {};
let gameStarted = false;

// HTTP Routes
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "♟️ Chess Game Server Running",
    endpoints: {
      socket: "ws://localhost:5000",
      health: "/health",
    },
  });
});

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    players: Object.keys(players).length,
    gameStarted,
    turn: chess.turn(),
  });
});

// Socket.io Connection Handler
io.on("connection", (socket: Socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Assign player roles
  if (!players.white) {
    players.white = socket.id;
    socket.emit("playerRole", "w");
    console.log(`Assigned white to ${socket.id}`);
  } else if (!players.black) {
    players.black = socket.id;
    socket.emit("playerRole", "b");
    console.log(`Assigned black to ${socket.id}`);
  } else {
    socket.emit("spectatorRole");
    console.log(`${socket.id} is spectator`);
  }

  // Start game when both players connected
  if (players.white && players.black && !gameStarted) {
    gameStarted = true;
    io.emit("gameStarted");
    io.emit("boardState", chess.fen());
    console.log("Game started!");
  }

  // Send current board state to new connection
  socket.emit("boardState", chess.fen());

  // Handle player disconnection
  socket.on("disconnect", () => {
    console.log(`Player disconnected: ${socket.id}`);

    if (socket.id === players.white) {
      delete players.white;
      console.log("White player disconnected");
    } else if (socket.id === players.black) {
      delete players.black;
      console.log("Black player disconnected");
    }

    // Reset game if no players
    if (Object.keys(players).length === 0) {
      gameStarted = false;
      chess.reset();
      console.log("Game reset - no players");
    }

    // Notify remaining players
    io.emit("playerDisconnected");
  });

  // Handle chess moves
  socket.on(
    "move",
    (move: { from: string; to: string; promotion?: string }) => {
      try {
        if (!gameStarted) {
          socket.emit("error", "Game has not started yet");
          return;
        }

        // Validate it's the correct player's turn
        const currentTurn = chess.turn();
        if (currentTurn === "w" && socket.id !== players.white) {
          socket.emit("error", "Not your turn");
          return;
        }
        if (currentTurn === "b" && socket.id !== players.black) {
          socket.emit("error", "Not your turn");
          return;
        }

        // Attempt the move
        const result = chess.move(move);

        if (result) {
          console.log(`Move: ${result.from} -> ${result.to}`);

          // Broadcast move to all clients
          io.emit("move", result);
          io.emit("boardState", chess.fen());

          // Check game status
          if (chess.isCheckmate()) {
            const winner = chess.turn() === "w" ? "Black" : "White";
            io.emit("gameOver", { winner, reason: "checkmate" });
            console.log(`Game Over: ${winner} wins by checkmate`);
          } else if (chess.isDraw()) {
            io.emit("gameOver", { winner: null, reason: "draw" });
            console.log("Game Over: Draw");
          } else if (chess.isCheck()) {
            io.emit("check");
            console.log("Check!");
          }
        } else {
          socket.emit("invalidMove", move);
          console.log(`Invalid move attempted: ${JSON.stringify(move)}`);
        }
      } catch (error) {
        console.error("Move error:", error);
        socket.emit("error", "Invalid move");
      }
    }
  );

  // Handle game reset request
  socket.on("resetGame", () => {
    chess.reset();
    gameStarted = false;
    io.emit("gameReset");
    io.emit("boardState", chess.fen());
    console.log("Game reset by player");
  });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Chess Server running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server ready`);
});
