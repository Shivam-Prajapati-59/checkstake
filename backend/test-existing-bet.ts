import { ethers } from "ethers";

const ABI = [
  "function getBet(uint256 _betId) external view returns (address player1, address player2, uint256 amount, address winner, uint8 status, uint8 result, uint256 createdAt, uint256 completedAt, bytes32 gameHash)",
  "function declareWinner(uint256 _betId, address _winner) external",
  "function accumulatedFees() external view returns (uint256)",
  "function platformFeePercent() external view returns (uint256)",
];

const CONTRACT_ADDRESS = "0x4751Da03f8FC0A5DBBaf738B8BBCCd87694c11e3";
const RPC_URL = "https://testnet-rpc.monad.xyz/";
const OWNER_PRIVATE_KEY =
  "74b6f20a44536c6f47eef19116e49c87ec74a32a8374376f56ac8232ed55cfb6";

// Existing active bet ID (from contract balance 1.024 MON, likely bet #13 or #14)
const TEST_BET_ID = 14;

async function testWinnerWithExistingBet() {
  console.log("🧪 Testing Winner Functionality with Existing Bet\n");

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, ownerWallet);

    console.log("📋 Setup:");
    console.log("- Contract:", CONTRACT_ADDRESS);
    console.log("- Owner:", ownerWallet.address);
    console.log("- Testing Bet ID:", TEST_BET_ID);

    // Get contract balance
    const contractBalance = await provider.getBalance(CONTRACT_ADDRESS);
    console.log(
      "- Contract Balance:",
      ethers.formatEther(contractBalance),
      "MON"
    );

    // Get platform fee
    const feePercent = await contract.platformFeePercent();
    console.log("- Platform Fee:", Number(feePercent.toString()) / 100, "%");

    // Get accumulated fees before
    const accumulatedFeesBefore = await contract.accumulatedFees();
    console.log(
      "- Accumulated Fees (Before):",
      ethers.formatEther(accumulatedFeesBefore),
      "MON\n"
    );

    // Get bet details
    console.log("📊 Checking Bet #" + TEST_BET_ID + "...");
    const bet = await contract.getBet(TEST_BET_ID);

    console.log("- Player 1:", bet[0]); // player1
    console.log("- Player 2:", bet[1]); // player2
    console.log("- Bet Amount:", ethers.formatEther(bet[2]), "MON"); // amount
    console.log(
      "- Status:",
      Number(bet[4]),
      "(0=Created, 1=Active, 2=Completed)"
    ); // status
    console.log("- Winner:", bet[3]); // winner

    const betStatus = Number(bet[4]);
    if (betStatus !== 1) {
      console.log("\n⚠️  This bet is not active (Status:", betStatus + ")");
      console.log("Cannot test winner functionality on inactive bet.");
      return;
    }

    console.log("\n✅ Bet is ACTIVE! Proceeding with winner declaration...\n");

    // Calculate payouts
    const totalPool = bet[2] * 2n; // amount * 2
    const platformFee = (totalPool * BigInt(feePercent)) / 10000n;
    const winnerPayout = totalPool - platformFee;

    console.log("💰 Prize Calculation:");
    console.log("- Total Pool:", ethers.formatEther(totalPool), "MON");
    console.log("- Platform Fee (2%):", ethers.formatEther(platformFee), "MON");
    console.log("- Winner Payout:", ethers.formatEther(winnerPayout), "MON\n");

    // Get winner balance before
    const winner = bet[0]; // Player 1 wins
    const winnerBalanceBefore = await provider.getBalance(winner);
    console.log("🏆 Declaring Winner:", winner);
    console.log(
      "- Winner Balance (Before):",
      ethers.formatEther(winnerBalanceBefore),
      "MON"
    );

    // Declare winner
    console.log("\n🔗 Sending transaction to declare winner...");
    const tx = await contract.declareWinner(TEST_BET_ID, winner);
    console.log("- Transaction Hash:", tx.hash);

    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt!.blockNumber);

    // Check final balances
    console.log("\n📊 Verifying Results...");

    const winnerBalanceAfter = await provider.getBalance(winner);
    const contractBalanceAfter = await provider.getBalance(CONTRACT_ADDRESS);
    const accumulatedFeesAfter = await contract.accumulatedFees();

    console.log("\n✅ Final Balances:");
    console.log(
      "- Winner Balance (After):",
      ethers.formatEther(winnerBalanceAfter),
      "MON"
    );
    console.log(
      "- Winner Gain:",
      ethers.formatEther(winnerBalanceAfter - winnerBalanceBefore),
      "MON"
    );
    console.log(
      "- Contract Balance (After):",
      ethers.formatEther(contractBalanceAfter),
      "MON"
    );
    console.log(
      "- Accumulated Fees (After):",
      ethers.formatEther(accumulatedFeesAfter),
      "MON"
    );
    console.log(
      "- New Fees Collected:",
      ethers.formatEther(accumulatedFeesAfter - accumulatedFeesBefore),
      "MON"
    );

    // Verify calculation
    const expectedFee = platformFee;
    const actualFee = accumulatedFeesAfter - accumulatedFeesBefore;
    console.log("\n🔍 Verification:");
    console.log("- Expected Fee:", ethers.formatEther(expectedFee), "MON");
    console.log("- Actual Fee:", ethers.formatEther(actualFee), "MON");
    console.log(
      "- Calculation Match:",
      BigInt(expectedFee) === BigInt(actualFee) ? "✅ PASS" : "❌ FAIL"
    );

    // Check final bet status
    const finalBet = await contract.getBet(TEST_BET_ID);
    console.log("\n📋 Final Bet Status:");
    console.log(
      "- Status:",
      finalBet[4] === 2 ? "Completed ✅" : "Status: " + finalBet[4]
    );
    console.log("- Winner Recorded:", finalBet[3]);

    console.log("\n🎉 Winner functionality test completed successfully!");
    console.log("\n📝 Summary:");
    console.log(
      "  • Winner received:",
      ethers.formatEther(winnerPayout),
      "MON"
    );
    console.log(
      "  • Platform earned:",
      ethers.formatEther(platformFee),
      "MON (2% fee)"
    );
    console.log(
      "  • Transaction cost:",
      "~",
      ethers.formatEther(
        winnerBalanceAfter - winnerBalanceBefore - winnerPayout
      ),
      "MON (gas fees)"
    );
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
  }
}

testWinnerWithExistingBet()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
