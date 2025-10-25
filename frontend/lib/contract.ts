// ChessBetting Contract ABI
export const CHESS_BETTING_ABI = [
  // Read functions
  {
    inputs: [{ name: "_betId", type: "uint256" }],
    name: "bets",
    outputs: [
      { name: "betId", type: "uint256" },
      { name: "player1", type: "address" },
      { name: "player2", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "winner", type: "address" },
      { name: "status", type: "uint8" },
      { name: "result", type: "uint8" },
      { name: "createdAt", type: "uint256" },
      { name: "completedAt", type: "uint256" },
      { name: "gameHash", type: "bytes32" },
      { name: "player1Disputed", type: "bool" },
      { name: "player2Disputed", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "betCounter",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_player", type: "address" }],
    name: "playerWins",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_player", type: "address" }],
    name: "playerLosses",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_player", type: "address" }],
    name: "playerDraws",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "minBetAmount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxBetAmount",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "platformFeePercent",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // Write functions
  {
    inputs: [{ name: "_gameHash", type: "bytes32" }],
    name: "createBet",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "_betId", type: "uint256" }],
    name: "joinBet",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "_betId", type: "uint256" }],
    name: "cancelBet",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "betId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "gameHash", type: "bytes32" },
    ],
    name: "BetCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "betId", type: "uint256" },
      { indexed: true, name: "joiner", type: "address" },
      { indexed: false, name: "totalPool", type: "uint256" },
    ],
    name: "BetJoined",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "betId", type: "uint256" },
      { indexed: true, name: "winner", type: "address" },
      { indexed: false, name: "payout", type: "uint256" },
      { indexed: false, name: "result", type: "uint8" },
    ],
    name: "BetCompleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "betId", type: "uint256" },
      { indexed: true, name: "canceller", type: "address" },
      { indexed: false, name: "refundAmount", type: "uint256" },
    ],
    name: "BetCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "betId", type: "uint256" },
      { indexed: false, name: "refundAmount", type: "uint256" },
    ],
    name: "DrawDeclared",
    type: "event",
  },
] as const;

// Enums
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
export interface Bet {
  betId: bigint;
  player1: string;
  player2: string;
  amount: bigint;
  winner: string;
  status: BetStatus;
  result: GameResult;
  createdAt: bigint;
  completedAt: bigint;
  gameHash: string;
  player1Disputed: boolean;
  player2Disputed: boolean;
}

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
}
