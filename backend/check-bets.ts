import { ethers } from "ethers";

const ABI = [
  "function getBetDetails(uint256 _betId) external view returns (tuple(uint256 betId, address player1, address player2, uint256 betAmount, uint8 status, uint256 createdAt, uint256 expiresAt, address winner, uint256 totalPayout, uint256 platformFee))",
  "function betCounter() external view returns (uint256)",
  "function accumulatedFees() external view returns (uint256)",
];

const CONTRACT_ADDRESS = "0x4751Da03f8FC0A5DBBaf738B8BBCCd87694c11e3";
const RPC_URL = "https://testnet-rpc.monad.xyz/";

async function checkExistingBets() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

  console.log("🔍 Checking existing bets...\n");

  // Get total number of bets
  const betCounter = await contract.betCounter();
  console.log("Total bets created:", betCounter.toString());
  console.log(
    "Contract balance:",
    ethers.formatEther(await provider.getBalance(CONTRACT_ADDRESS)),
    "MON"
  );
  console.log(
    "Accumulated fees:",
    ethers.formatEther(await contract.accumulatedFees()),
    "MON\n"
  );

  // Check each bet
  for (let i = 1; i <= Number(betCounter); i++) {
    try {
      const bet = await contract.getBetDetails(i);
      console.log(`Bet #${i}:`);
      console.log("  Player 1:", bet[1]);
      console.log("  Player 2:", bet[2]);
      console.log("  Amount:", ethers.formatEther(bet[3]), "MON");
      console.log(
        "  Status:",
        bet[4] === 0 ? "Active" : bet[4] === 1 ? "Completed" : "Cancelled"
      );

      if (bet[4] === 0) {
        // Active bet
        console.log("  ✅ This bet is ACTIVE and ready for testing!");
        const totalPool = bet[3] * 2n;
        const fee = (totalPool * 200n) / 10000n; // 2% fee
        const winnerPayout = totalPool - fee;
        console.log("  Potential Pool:", ethers.formatEther(totalPool), "MON");
        console.log("  Platform Fee:", ethers.formatEther(fee), "MON");
        console.log(
          "  Winner Payout:",
          ethers.formatEther(winnerPayout),
          "MON"
        );
      } else if (bet[4] === 1) {
        console.log("  Winner:", bet[7]);
        console.log("  Total Payout:", ethers.formatEther(bet[8]), "MON");
        console.log("  Platform Fee:", ethers.formatEther(bet[9]), "MON");
      }
      console.log();
    } catch (error: any) {
      console.log(`  Error reading bet #${i}:`, error.message);
    }
  }
}

checkExistingBets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
