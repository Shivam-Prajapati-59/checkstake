// Contract ABIs and interfaces
export const CHESS_BETTING_ABI = [
  "function bets(uint256) view returns (uint256 betId, address player1, address player2, uint256 amount, address winner, uint8 status, uint8 result, uint256 createdAt, uint256 completedAt, bytes32 gameHash, bool player1Disputed, bool player2Disputed)",
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

export const CHESS_GAME_ABI_UPDATED = {
  abi: [
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_feePercent",
          type: "uint256",
        },
        { internalType: "uint256", name: "_minBet", type: "uint256" },
        { internalType: "uint256", name: "_maxBet", type: "uint256" },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    },
    { inputs: [], type: "error", name: "AlreadyDisputed" },
    { inputs: [], type: "error", name: "BetAmountOutOfRange" },
    { inputs: [], type: "error", name: "BetExpired" },
    { inputs: [], type: "error", name: "BetNotActive" },
    { inputs: [], type: "error", name: "BetNotAvailable" },
    { inputs: [], type: "error", name: "BetNotExpired" },
    { inputs: [], type: "error", name: "CanOnlyCancelPendingBets" },
    { inputs: [], type: "error", name: "CannotBetAgainstYourself" },
    { inputs: [], type: "error", name: "ContractPaused" },
    { inputs: [], type: "error", name: "DisputeWindowClosed" },
    { inputs: [], type: "error", name: "IncorrectBetAmount" },
    {
      inputs: [],
      type: "error",
      name: "InsufficientContractBalance",
    },
    { inputs: [], type: "error", name: "InvalidFeePercent" },
    { inputs: [], type: "error", name: "InvalidWinner" },
    { inputs: [], type: "error", name: "NoFeesToWithdraw" },
    { inputs: [], type: "error", name: "NotOwner" },
    { inputs: [], type: "error", name: "OnlyCreatorCanCancel" },
    { inputs: [], type: "error", name: "ReentrancyDetected" },
    { inputs: [], type: "error", name: "ZeroBetAmount" },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "betId",
          type: "uint256",
          indexed: true,
        },
        {
          internalType: "address",
          name: "canceller",
          type: "address",
          indexed: true,
        },
        {
          internalType: "uint256",
          name: "refundAmount",
          type: "uint256",
          indexed: false,
        },
      ],
      type: "event",
      name: "BetCancelled",
      anonymous: false,
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "betId",
          type: "uint256",
          indexed: true,
        },
        {
          internalType: "address",
          name: "winner",
          type: "address",
          indexed: true,
        },
        {
          internalType: "uint256",
          name: "payout",
          type: "uint256",
          indexed: false,
        },
        {
          internalType: "enum ChessBetting.GameResult",
          name: "result",
          type: "uint8",
          indexed: false,
        },
      ],
      type: "event",
      name: "BetCompleted",
      anonymous: false,
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "betId",
          type: "uint256",
          indexed: true,
        },
        {
          internalType: "address",
          name: "creator",
          type: "address",
          indexed: true,
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
          indexed: false,
        },
        {
          internalType: "bytes32",
          name: "gameHash",
          type: "bytes32",
          indexed: false,
        },
      ],
      type: "event",
      name: "BetCreated",
      anonymous: false,
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "betId",
          type: "uint256",
          indexed: true,
        },
        {
          internalType: "address",
          name: "disputer",
          type: "address",
          indexed: true,
        },
      ],
      type: "event",
      name: "BetDisputed",
      anonymous: false,
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "betId",
          type: "uint256",
          indexed: true,
        },
        {
          internalType: "address",
          name: "joiner",
          type: "address",
          indexed: true,
        },
        {
          internalType: "uint256",
          name: "totalPool",
          type: "uint256",
          indexed: false,
        },
      ],
      type: "event",
      name: "BetJoined",
      anonymous: false,
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "minAmount",
          type: "uint256",
          indexed: false,
        },
        {
          internalType: "uint256",
          name: "maxAmount",
          type: "uint256",
          indexed: false,
        },
      ],
      type: "event",
      name: "BetLimitsUpdated",
      anonymous: false,
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "betId",
          type: "uint256",
          indexed: true,
        },
        {
          internalType: "address",
          name: "winner",
          type: "address",
          indexed: true,
        },
        {
          internalType: "enum ChessBetting.GameResult",
          name: "finalResult",
          type: "uint8",
          indexed: false,
        },
      ],
      type: "event",
      name: "DisputeResolved",
      anonymous: false,
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "betId",
          type: "uint256",
          indexed: true,
        },
        {
          internalType: "uint256",
          name: "refundAmount",
          type: "uint256",
          indexed: false,
        },
      ],
      type: "event",
      name: "DrawDeclared",
      anonymous: false,
    },
    {
      inputs: [
        {
          internalType: "bool",
          name: "paused",
          type: "bool",
          indexed: false,
        },
      ],
      type: "event",
      name: "EmergencyPause",
      anonymous: false,
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "owner",
          type: "address",
          indexed: true,
        },
        {
          internalType: "uint256",
          name: "amount",
          type: "uint256",
          indexed: false,
        },
      ],
      type: "event",
      name: "FeeWithdrawn",
      anonymous: false,
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "previousOwner",
          type: "address",
          indexed: true,
        },
        {
          internalType: "address",
          name: "newOwner",
          type: "address",
          indexed: true,
        },
      ],
      type: "event",
      name: "OwnershipTransferred",
      anonymous: false,
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "oldFee",
          type: "uint256",
          indexed: false,
        },
        {
          internalType: "uint256",
          name: "newFee",
          type: "uint256",
          indexed: false,
        },
      ],
      type: "event",
      name: "PlatformFeeUpdated",
      anonymous: false,
    },
    {
      inputs: [],
      stateMutability: "view",
      type: "function",
      name: "accumulatedFees",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    },
    {
      inputs: [],
      stateMutability: "view",
      type: "function",
      name: "betCounter",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    },
    {
      inputs: [],
      stateMutability: "view",
      type: "function",
      name: "betExpiryTime",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    },
    {
      inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
      name: "bets",
      outputs: [
        { internalType: "uint256", name: "betId", type: "uint256" },
        { internalType: "address", name: "player1", type: "address" },
        { internalType: "address", name: "player2", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
        { internalType: "address", name: "winner", type: "address" },
        {
          internalType: "enum ChessBetting.BetStatus",
          name: "status",
          type: "uint8",
        },
        {
          internalType: "enum ChessBetting.GameResult",
          name: "result",
          type: "uint8",
        },
        {
          internalType: "uint256",
          name: "createdAt",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "completedAt",
          type: "uint256",
        },
        {
          internalType: "bytes32",
          name: "gameHash",
          type: "bytes32",
        },
        {
          internalType: "bool",
          name: "player1Disputed",
          type: "bool",
        },
        {
          internalType: "bool",
          name: "player2Disputed",
          type: "bool",
        },
      ],
    },
    {
      inputs: [{ internalType: "uint256", name: "_betId", type: "uint256" }],
      stateMutability: "nonpayable",
      type: "function",
      name: "cancelBet",
    },
    {
      inputs: [{ internalType: "uint256", name: "_betId", type: "uint256" }],
      stateMutability: "nonpayable",
      type: "function",
      name: "claimExpiredBet",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_gameHash",
          type: "bytes32",
        },
      ],
      stateMutability: "payable",
      type: "function",
      name: "createBet",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    },
    {
      inputs: [{ internalType: "uint256", name: "_betId", type: "uint256" }],
      stateMutability: "nonpayable",
      type: "function",
      name: "declareDraw",
    },
    {
      inputs: [
        { internalType: "uint256", name: "_betId", type: "uint256" },
        { internalType: "address", name: "_winner", type: "address" },
      ],
      stateMutability: "nonpayable",
      type: "function",
      name: "declareWinner",
    },
    {
      inputs: [{ internalType: "uint256", name: "_betId", type: "uint256" }],
      stateMutability: "nonpayable",
      type: "function",
      name: "disputeResult",
    },
    {
      inputs: [],
      stateMutability: "view",
      type: "function",
      name: "disputeWindow",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    },
    {
      inputs: [],
      stateMutability: "nonpayable",
      type: "function",
      name: "emergencyWithdraw",
    },
    {
      inputs: [],
      stateMutability: "view",
      type: "function",
      name: "getActiveBetsCount",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    },
    {
      inputs: [],
      stateMutability: "view",
      type: "function",
      name: "getAvailableBalance",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    },
    {
      inputs: [{ internalType: "uint256", name: "_betId", type: "uint256" }],
      stateMutability: "view",
      type: "function",
      name: "getBet",
      outputs: [
        { internalType: "address", name: "player1", type: "address" },
        { internalType: "address", name: "player2", type: "address" },
        { internalType: "uint256", name: "amount", type: "uint256" },
        { internalType: "address", name: "winner", type: "address" },
        {
          internalType: "enum ChessBetting.BetStatus",
          name: "status",
          type: "uint8",
        },
        {
          internalType: "enum ChessBetting.GameResult",
          name: "result",
          type: "uint8",
        },
        {
          internalType: "uint256",
          name: "createdAt",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "completedAt",
          type: "uint256",
        },
        { internalType: "bytes32", name: "gameHash", type: "bytes32" },
      ],
    },
    {
      inputs: [
        {
          internalType: "uint256[]",
          name: "_betIds",
          type: "uint256[]",
        },
      ],
      stateMutability: "view",
      type: "function",
      name: "getBets",
      outputs: [
        {
          internalType: "struct ChessBetting.Bet[]",
          name: "",
          type: "tuple[]",
          components: [
            {
              internalType: "uint256",
              name: "betId",
              type: "uint256",
            },
            {
              internalType: "address",
              name: "player1",
              type: "address",
            },
            {
              internalType: "address",
              name: "player2",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "amount",
              type: "uint256",
            },
            {
              internalType: "address",
              name: "winner",
              type: "address",
            },
            {
              internalType: "enum ChessBetting.BetStatus",
              name: "status",
              type: "uint8",
            },
            {
              internalType: "enum ChessBetting.GameResult",
              name: "result",
              type: "uint8",
            },
            {
              internalType: "uint256",
              name: "createdAt",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "completedAt",
              type: "uint256",
            },
            {
              internalType: "bytes32",
              name: "gameHash",
              type: "bytes32",
            },
            {
              internalType: "bool",
              name: "player1Disputed",
              type: "bool",
            },
            {
              internalType: "bool",
              name: "player2Disputed",
              type: "bool",
            },
          ],
        },
      ],
    },
    {
      inputs: [],
      stateMutability: "view",
      type: "function",
      name: "getContractBalance",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    },
    {
      inputs: [{ internalType: "uint256", name: "_betId", type: "uint256" }],
      stateMutability: "view",
      type: "function",
      name: "getDisputeStatus",
      outputs: [
        {
          internalType: "bool",
          name: "player1Disputed",
          type: "bool",
        },
        {
          internalType: "bool",
          name: "player2Disputed",
          type: "bool",
        },
        { internalType: "bool", name: "canDispute", type: "bool" },
      ],
    },
    {
      inputs: [{ internalType: "address", name: "_player", type: "address" }],
      stateMutability: "view",
      type: "function",
      name: "getPlayerStats",
      outputs: [
        { internalType: "uint256", name: "wins", type: "uint256" },
        { internalType: "uint256", name: "losses", type: "uint256" },
        { internalType: "uint256", name: "draws", type: "uint256" },
        {
          internalType: "uint256",
          name: "totalGames",
          type: "uint256",
        },
      ],
    },
    {
      inputs: [{ internalType: "uint256", name: "_betId", type: "uint256" }],
      stateMutability: "view",
      type: "function",
      name: "isBetExpired",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
    },
    {
      inputs: [{ internalType: "uint256", name: "_betId", type: "uint256" }],
      stateMutability: "payable",
      type: "function",
      name: "joinBet",
    },
    {
      inputs: [],
      stateMutability: "view",
      type: "function",
      name: "maxBetAmount",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    },
    {
      inputs: [],
      stateMutability: "view",
      type: "function",
      name: "minBetAmount",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    },
    {
      inputs: [],
      stateMutability: "view",
      type: "function",
      name: "owner",
      outputs: [{ internalType: "address", name: "", type: "address" }],
    },
    {
      inputs: [],
      stateMutability: "view",
      type: "function",
      name: "paused",
      outputs: [{ internalType: "bool", name: "", type: "bool" }],
    },
    {
      inputs: [],
      stateMutability: "view",
      type: "function",
      name: "platformFeePercent",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    },
    {
      inputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
      name: "playerDraws",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    },
    {
      inputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
      name: "playerLosses",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    },
    {
      inputs: [{ internalType: "address", name: "", type: "address" }],
      stateMutability: "view",
      type: "function",
      name: "playerWins",
      outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    },
    {
      inputs: [
        { internalType: "uint256", name: "_betId", type: "uint256" },
        {
          internalType: "enum ChessBetting.GameResult",
          name: "_finalResult",
          type: "uint8",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
      name: "resolveDispute",
    },
    {
      inputs: [],
      stateMutability: "nonpayable",
      type: "function",
      name: "togglePause",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_newOwner",
          type: "address",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
      name: "transferOwnership",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_minAmount",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_maxAmount",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
      name: "updateBetLimits",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_newFeePercent",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
      name: "updatePlatformFee",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_betExpiryTime",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_disputeWindow",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
      name: "updateTimeWindows",
    },
    {
      inputs: [],
      stateMutability: "nonpayable",
      type: "function",
      name: "withdrawFees",
    },
  ],
};
