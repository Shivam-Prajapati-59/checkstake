import { ethers } from "ethers";

const ABI = [
  "function getBet(uint256 _betId) external view returns (address player1, address player2, uint256 amount, address winner, uint8 status, uint8 result, uint256 createdAt, uint256 completedAt, bytes32 gameHash)",
  "function betCounter() external view returns (uint256)",
];

const CONTRACT_ADDRESS = "0x4751Da03f8FC0A5DBBaf738B8BBCCd87694c11e3";
const RPC_URL = "https://testnet-rpc.monad.xyz/";

async function findActiveBets() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  console.log("🔍 Searching for active bets...\n");

  const betCounter = await contract.betCounter();
  console.log("Total bets created:", betCounter.toString(), "\n");

  let activeFound = false;

  for (let i = 1; i <= Number(betCounter); i++) {
    try {
      const bet = await contract.getBet(i);
      const status = Number(bet[4]);

      if (status === 1) {
        // Active
        activeFound = true;
        console.log(`✅ ACTIVE BET FOUND: Bet #${i}`);
        console.log("  Player 1:", bet[0]);
        console.log("  Player 2:", bet[1]);
        console.log("  Amount:", ethers.formatEther(bet[2]), "MON");
        console.log("  Total Pool:", ethers.formatEther(bet[2] * 2n), "MON");
        console.log();
      }
    } catch (error) {
      // Skip invalid bets
    }
  }

  if (!activeFound) {
    console.log("❌ No active bets found.");
    console.log("\n💡 To test winner functionality:");
    console.log("   1. Start the backend: cd backend && npm run dev");
    console.log("   2. Start the frontend: cd frontend && npm run dev");
    console.log("   3. Create a new bet with two different wallets");
    console.log("   4. Join the bet");
    console.log("   5. Then test winner declaration");
  }
}

findActiveBets()
  .then(() => process.exit(0))
  .catch(console.error);
