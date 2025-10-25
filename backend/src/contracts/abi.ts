// Contract ABIs and interfaces
export const CHESS_BETTING_ABI = [
  "function getBet(uint256 _betId) external view returns (address player1, address player2, uint256 amount, address winner, uint8 status, uint8 result, uint256 createdAt, uint256 completedAt, bytes32 gameHash)",
  "function declareWinner(uint256 _betId, address _winner) external",
  "function declareDraw(uint256 _betId) external",
  "function getPlayerStats(address _player) external view returns (uint256 wins, uint256 losses, uint256 draws, uint256 totalGames)",
  "function betCounter() external view returns (uint256)",
  "function getActiveBetsCount() external view returns (uint256)",
  "function isBetExpired(uint256 _betId) external view returns (bool)",
  "event BetCreated(uint256 indexed betId, address indexed creator, uint256 amount, bytes32 gameHash)",
  "event BetJoined(uint256 indexed betId, address indexed joiner, uint256 totalPool)",
  "event BetCompleted(uint256 indexed betId, address indexed winner, uint256 payout, uint8 result)",
  "event DrawDeclared(uint256 indexed betId, uint256 refundAmount)",
  "event BetCancelled(uint256 indexed betId, address indexed canceller, uint256 refundAmount)",
] as const;

// Enum mappings
export enum BetStatus {
  Created = 0,
  Active = 1,
  Completed = 2,
  Cancelled = 3,
  Disputed = 4,
  Draw = 5,
}

export enum GameResult {
  Pending = 0,
  Player1Wins = 1,
  Player2Wins = 2,
  Draw = 3,
}

// Type definitions
export interface BetDetails {
  player1: string;
  player2: string;
  amount: string; // in ETH
  winner: string;
  status: BetStatus;
  result: GameResult;
  createdAt: number;
  completedAt: number;
  gameHash: string;
}

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
}
