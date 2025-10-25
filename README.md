# ♟️ Chess Betting DApp

A decentralized peer-to-peer chess betting platform built on **Monad Testnet** with real-time gameplay and blockchain-based prize distribution.

## 🎯 Features

- **Real-time Chess Gameplay** - Play live games using Socket.IO
- **Smart Contract Betting** - Create and join bets with cryptocurrency
- **Automated Prize Distribution** - Winners receive 98% of the pool automatically
- **Fair Fee Structure** - 2% platform fee on winnings
- **Multi-wallet Support** - RainbowKit integration for easy wallet connection
- **Secure & Audited** - Reentrancy protection and custom error handling

## 🏗️ Tech Stack

### Smart Contracts

- **Solidity 0.8.13** - Chess betting contract
- **Foundry** - Development & testing framework
- **Monad Testnet** - Blockchain deployment

### Backend

- **Node.js + Express** - REST API server
- **Socket.IO** - Real-time game communication
- **Ethers.js v6** - Blockchain interactions
- **Chess.js** - Chess logic validation

### Frontend

- **Next.js 15** - React framework
- **RainbowKit** - Wallet connection UI
- **Wagmi v2** - Blockchain hooks
- **Tailwind CSS** - Styling

## 🚀 Quick Start

### Prerequisites

```bash
node >= 18.x
npm or yarn
```

### 1. Clone Repository

```bash
git clone https://github.com/Shivam-Prajapati-59/monad_hack.git
cd monad_hack
```

### 2. Backend Setup

```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Add your OWNER_PRIVATE_KEY and RPC_URL

# Start server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install

# Start development server
npm run dev
```

### 4. Access Application

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

## 📝 Smart Contract

**Deployed on Monad Testnet**

- Address: `0x4751Da03f8FC0A5DBBaf738B8BBCCd87694c11e3`
- Network: Monad Testnet (Chain ID: 10143)

### Contract Features

- Create bets (0.001 - 100 MON)
- Join existing bets
- Automatic winner declaration
- Draw handling with refunds
- Platform fee accumulation
- Player statistics tracking

## 🎮 How to Play

1. **Connect Wallet** - Use RainbowKit to connect your wallet
2. **Create Bet** - Set your bet amount and wait for opponent
3. **Play Chess** - Make moves in real-time
4. **Win Prize** - Winner receives prize automatically on checkmate

## 💰 Prize Distribution

- **Total Pool**: Bet Amount × 2
- **Winner**: 98% of pool
- **Platform**: 2% fee
- **Loser**: Loses their bet

**Example**: 0.5 MON bet

- Total Pool: 1.0 MON
- Winner Gets: 0.98 MON
- Platform Fee: 0.02 MON

## 🧪 Testing

### Smart Contract Tests

```bash
forge test
```

### Winner Functionality Test

```bash
cd backend
npx ts-node test-winner-flexible.ts
```

## 🔧 Environment Variables

### Backend (.env)

```env
RPC_URL=https://testnet-rpc.monad.xyz/
CONTRACT_ADDRESS=0x4751Da03f8FC0A5DBBaf738B8BBCCd87694c11e3
```

## 🌟 Key Features Implemented

✅ Real-time multiplayer chess  
✅ Blockchain bet management  
✅ Automated winner payouts  
✅ Both players can win (based on game outcome)  
✅ Draw handling with refunds  
✅ Platform fee accumulation  
✅ Clean, modular code architecture  
✅ Comprehensive testing

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🔗 Links

- [GitHub Repository](https://github.com/Shivam-Prajapati-59/monad_hack)
- [Monad Documentation](https://docs.monad.xyz/)
- [Deployed Contract](https://testnet-explorer.monad.xyz/address/0x4751Da03f8FC0A5DBBaf738B8BBCCd87694c11e3)

---

Built with ❤️ for the Blitz Monad Hackathon
