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

// Configuration
const TEST_BET_ID = 4; // Using active bet
const WINNER_CHOICE = "player1"; // Change to "player1" or "player2" to test different scenarios

async function testWinnerFlexible() {
  console.log("🧪 Testing Winner Functionality - Flexible Winner Selection\n");

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, ownerWallet);

    console.log("📋 Setup:");
    console.log("- Contract:", CONTRACT_ADDRESS);
    console.log("- Owner:", ownerWallet.address);
    console.log("- Testing Bet ID:", TEST_BET_ID);
    console.log("- Winner Choice:", WINNER_CHOICE.toUpperCase(), "\n");

    // Get bet details
    console.log("📊 Checking Bet #" + TEST_BET_ID + "...");
    const bet = await contract.getBet(TEST_BET_ID);

    const player1 = bet[0];
    const player2 = bet[1];
    const betAmount = bet[2];
    const betStatus = Number(bet[4]);

    console.log("- Player 1 (White):", player1);
    console.log("- Player 2 (Black):", player2);
    console.log("- Bet Amount:", ethers.formatEther(betAmount), "MON");
    console.log("- Status:", betStatus, "(0=Created, 1=Active, 2=Completed)");
    console.log("- Current Winner:", bet[3]);

    if (betStatus !== 1) {
      console.log("\n⚠️  This bet is not active (Status:", betStatus + ")");
      console.log("Cannot test winner functionality on inactive bet.");
      console.log("\n💡 Tip: Change TEST_BET_ID to an active bet.");
      return;
    }

    console.log("\n✅ Bet is ACTIVE!\n");

    // Select winner based on configuration
    let winnerAddress: string;
    let winnerName: string;

    if (WINNER_CHOICE.toLowerCase() === "player1") {
      winnerAddress = player1;
      winnerName = "Player 1 (White)";
    } else if (WINNER_CHOICE.toLowerCase() === "player2") {
      winnerAddress = player2;
      winnerName = "Player 2 (Black)";
    } else {
      console.log("❌ Invalid WINNER_CHOICE. Use 'player1' or 'player2'");
      return;
    }

    // Get platform fee
    const feePercent = await contract.platformFeePercent();
    const accumulatedFeesBefore = await contract.accumulatedFees();

    // Calculate payouts
    const totalPool = betAmount * 2n;
    const platformFee = (totalPool * BigInt(feePercent)) / 10000n;
    const winnerPayout = totalPool - platformFee;

    console.log("💰 Prize Calculation:");
    console.log("- Total Pool:", ethers.formatEther(totalPool), "MON");
    console.log("- Platform Fee (2%):", ethers.formatEther(platformFee), "MON");
    console.log("- Winner Payout:", ethers.formatEther(winnerPayout), "MON\n");

    // Get winner balance before
    const winnerBalanceBefore = await provider.getBalance(winnerAddress);
    console.log("🏆 Declaring Winner:", winnerName);
    console.log("   Address:", winnerAddress);
    console.log(
      "   Balance (Before):",
      ethers.formatEther(winnerBalanceBefore),
      "MON\n"
    );

    // Show the loser too
    const loserAddress = winnerAddress === player1 ? player2 : player1;
    const loserName =
      winnerAddress === player1 ? "Player 2 (Black)" : "Player 1 (White)";
    const loserBalanceBefore = await provider.getBalance(loserAddress);
    console.log("😞 Loser:", loserName);
    console.log("   Address:", loserAddress);
    console.log(
      "   Balance (Before):",
      ethers.formatEther(loserBalanceBefore),
      "MON\n"
    );

    // Declare winner
    console.log("🔗 Sending transaction to declare winner...");
    const tx = await contract.declareWinner(TEST_BET_ID, winnerAddress);
    console.log("- Transaction Hash:", tx.hash);

    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt!.blockNumber);

    // Check final balances
    console.log("\n📊 Verifying Results...\n");

    const winnerBalanceAfter = await provider.getBalance(winnerAddress);
    const loserBalanceAfter = await provider.getBalance(loserAddress);
    const contractBalanceAfter = await provider.getBalance(CONTRACT_ADDRESS);
    const accumulatedFeesAfter = await contract.accumulatedFees();

    console.log("✅ Final Balances:");
    console.log("\nWinner (" + winnerName + "):");
    console.log(
      "  - Balance (After):",
      ethers.formatEther(winnerBalanceAfter),
      "MON"
    );
    console.log(
      "  - Gain:",
      ethers.formatEther(winnerBalanceAfter - winnerBalanceBefore),
      "MON"
    );

    console.log("\nLoser (" + loserName + "):");
    console.log(
      "  - Balance (After):",
      ethers.formatEther(loserBalanceAfter),
      "MON"
    );
    console.log(
      "  - Change:",
      ethers.formatEther(loserBalanceAfter - loserBalanceBefore),
      "MON (should be 0)"
    );

    console.log("\nContract:");
    console.log(
      "  - Balance (After):",
      ethers.formatEther(contractBalanceAfter),
      "MON"
    );
    console.log(
      "  - Accumulated Fees (After):",
      ethers.formatEther(accumulatedFeesAfter),
      "MON"
    );
    console.log(
      "  - New Fees Collected:",
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
    console.log(
      "- Matches Expected:",
      finalBet[3].toLowerCase() === winnerAddress.toLowerCase()
        ? "✅ YES"
        : "❌ NO"
    );

    console.log("\n🎉 Winner functionality test completed successfully!");
    console.log("\n📝 Summary:");
    console.log("  • Winner:", winnerName);
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
      "  • Loser: Lost their bet (",
      ethers.formatEther(betAmount),
      "MON)"
    );

    console.log("\n💡 To test the other player winning:");
    const otherChoice =
      WINNER_CHOICE.toLowerCase() === "player1" ? "player2" : "player1";
    console.log(
      "   Change WINNER_CHOICE to '" +
        otherChoice +
        "' and use a different active bet."
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

testWinnerFlexible()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
