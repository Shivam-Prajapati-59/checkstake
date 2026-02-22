# Merkle Subscription on Monad Testnet

A complete full-stack demonstration of on-chain subscriptions using Merkle Trees, deployed on the [Monad Testnet](https://testnet.monadexplorer.com/).

Instead of storing every subscriber on-chain (which is expensive), the backend database only publishes a single 32-byte Merkle root to the smart contract. Users can then prove their subscription status natively on the Monad testnet using off-chain generated proofs.

## Architecture

- **Backend (Rust)**: Manages subscriptions in PostgreSQL, builds an OpenZeppelin-compatible Merkle Tree, and periodically syncs the 32-byte root to the smart contract via RPC (`https://testnet-rpc.monad.xyz`).
- **Smart Contracts (Solidity)**: Maintains the current Merkle root and verifies user proofs on-chain. Deployed on Monad Testnet.
- **Database**: PostgreSQL server storing user addresses and expiration timestamps.

## Quick Start

### 1. Smart Contracts

Deployed address on Monad Testnet: `0x89DAa2E0c89C3EFc612A51dE83510d97d798fAe5`
Network Chain ID: `10143`

Compile and deploy using Hardhat:

```bash
cd smart-contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.js --network monadTestnet
```

### 2. Backend Server

Run the Rust backend to mock some data and push the root to Monad Testnet:

```bash
cd backend
cargo run
```

This script will:

1. Seed the DB with mock subscribers.
2. Build the Merkle Tree.
3. Call `updateMerkleRoot` on the contract.
4. Perform an off-chain sanity check.
5. Provide a copy-paste valid proof format for frontend UI prototyping and call `verifySubscription` on-chain.

## Verification

You can view the latest transactions and confirm that the proofs are valid by viewing the backend operations on the [Monad Testnet Explorer](https://testnet.monadexplorer.com/address/0x89DAa2E0c89C3EFc612A51dE83510d97d798fAe5).
