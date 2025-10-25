import { Chess } from "chess.js";

/**
 * Game state interface
 */
export interface GameState {
  gameId: string;
  betId?: number;
  gameHash?: string;
  player1: PlayerInfo;
  player2: PlayerInfo;
  chess: Chess;
  startTime: number;
  endTime?: number;
  moves: string[];
  status: GameStatus;
  winner?: "white" | "black" | "draw";
  reason?: string;
}

/**
 * Player information
 */
export interface PlayerInfo {
  socketId: string;
  address?: string;
  color?: "w" | "b";
}

/**
 * Game status enum
 */
export type GameStatus =
  | "waiting" // Waiting for second player
  | "active" // Game in progress
  | "completed" // Game finished
  | "abandoned" // Player disconnected
  | "cancelled"; // Game cancelled

/**
 * Bet-Game mapping for tracking
 */
export interface BetGameMapping {
  betId: number;
  gameId: string;
  gameHash: string;
  player1Address: string;
  player2Address: string;
  betAmount: string;
  status: "pending" | "active" | "completed";
  createdAt: number;
  completedAt?: number;
}

/**
 * Move data structure
 */
export interface MoveData {
  from: string;
  to: string;
  promotion?: string;
}

/**
 * Socket event payloads
 */
export interface CreateGamePayload {
  betId?: number;
  playerAddress?: string;
  gameHash?: string;
}

export interface JoinGamePayload {
  gameId: string;
  playerAddress?: string;
}

export interface GameOverPayload {
  gameId: string;
  winner: "white" | "black" | "draw";
  reason: string;
  betId?: number;
}

/**
 * API response types
 */
export interface GameResponse {
  success: boolean;
  gameId?: string;
  error?: string;
  data?: any;
}

export interface BetStatusResponse {
  betId: number;
  status: string;
  player1?: string;
  player2?: string;
  amount?: string;
  winner?: string;
  gameHash?: string;
}
