import { ethers } from "ethers";

// Contract ABI (only the functions we need)
const ABI = [
  "function createBet(uint256 _betAmount, address _player2) external payable returns (uint256)",
  "function joinBet(uint256 _betId) external payable",
  "function declareWinner(uint256 _betId, address _winner) external",
  "function getBetDetails(uint256 _betId) external view returns (tuple(uint256 betId, address player1, address player2, uint256 betAmount, uint8 status, uint256 createdAt, uint256 expiresAt, address winner, uint256 totalPayout, uint256 platformFee))",
  "function owner() external view returns (address)",
  "function platformFeePercent() external view returns (uint256)",
  "function accumulatedFees() external view returns (uint256)",
];

const CONTRACT_ADDRESS = "0x4751Da03f8FC0A5DBBaf738B8BBCCd87694c11e3";
const RPC_URL = "https://testnet-rpc.monad.xyz/";

// Owner private key (has 3.67 MON)
const OWNER_PRIVATE_KEY =
  "74b6f20a44536c6f47eef19116e49c87ec74a32a8374376f56ac8232ed55cfb6";

async function testWinnerFunctionality() {
  console.log(
    "🧪 Testing Winner Functionality with Prize Money Distribution\n"
  );

  try {
    // Setup provider and wallets
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, ownerWallet);

    console.log("📋 Initial Setup:");
    console.log("- Contract:", CONTRACT_ADDRESS);
    console.log("- Owner:", ownerWallet.address);

    // Get owner balance
    const ownerBalanceBefore = await provider.getBalance(ownerWallet.address);
    console.log(
      "- Owner Balance:",
      ethers.formatEther(ownerBalanceBefore),
      "MON"
    );

    // Get contract balance
    const contractBalanceBefore = await provider.getBalance(CONTRACT_ADDRESS);
    console.log(
      "- Contract Balance:",
      ethers.formatEther(contractBalanceBefore),
      "MON"
    );

    // Get platform fee percent
    const feePercent = await contract.platformFeePercent();
    console.log("- Platform Fee:", Number(feePercent.toString()) / 100, "%");

    // Get accumulated fees
    const accumulatedFeesBefore = await contract.accumulatedFees();
    console.log(
      "- Accumulated Fees:",
      ethers.formatEther(accumulatedFeesBefore),
      "MON\n"
    );

    // Create a test bet
    console.log("📝 Step 1: Creating a test bet...");
    const betAmount = ethers.parseEther("0.01"); // 0.01 MON

    const createTx = await contract.createBet(
      betAmount,
      "0x0000000000000000000000000000000000000000", // Anyone can join
      { value: betAmount }
    );

    console.log("- Transaction sent:", createTx.hash);
    const createReceipt = await createTx.wait();
    console.log(
      "- Transaction confirmed in block:",
      createReceipt!.blockNumber
    );

    // Extract betId from events
    const betCreatedEvent = createReceipt!.logs.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed && parsed.name === "BetCreated";
      } catch {
        return false;
      }
    });

    let betId = 1; // Default if we can't parse
    if (betCreatedEvent) {
      const parsed = contract.interface.parseLog(betCreatedEvent);
      betId = Number(parsed!.args[0]);
    }
    console.log("- Bet ID:", betId, "\n");

    // Get bet details
    console.log("📊 Step 2: Checking bet details...");
    const betDetails = await contract.getBetDetails(betId);
    console.log("- Player 1:", betDetails[1]);
    console.log("- Player 2:", betDetails[2]);
    console.log("- Bet Amount:", ethers.formatEther(betDetails[3]), "MON");
    console.log("- Status:", betDetails[4]); // 0=Active, 1=Completed, 2=Cancelled
    console.log(
      "- Total Pool:",
      ethers.formatEther(betAmount * 2n),
      "MON (when joined)\n"
    );

    // Simulate player 2 joining (using owner wallet for demo)
    console.log("👥 Step 3: Simulating player 2 joining bet...");
    const joinTx = await contract.joinBet(betId, { value: betAmount });
    console.log("- Transaction sent:", joinTx.hash);
    const joinReceipt = await joinTx.wait();
    console.log(
      "- Transaction confirmed in block:",
      joinReceipt!.blockNumber,
      "\n"
    );

    // Check updated contract balance
    const contractBalanceAfterJoin = await provider.getBalance(
      CONTRACT_ADDRESS
    );
    console.log(
      "- Contract Balance After Join:",
      ethers.formatEther(contractBalanceAfterJoin),
      "MON\n"
    );

    // Calculate expected payouts
    const totalPool = betAmount * 2n;
    const platformFee = (totalPool * BigInt(feePercent)) / 10000n;
    const winnerPayout = totalPool - platformFee;

    console.log("💰 Step 4: Prize Calculation:");
    console.log("- Total Pool:", ethers.formatEther(totalPool), "MON");
    console.log("- Platform Fee (2%):", ethers.formatEther(platformFee), "MON");
    console.log("- Winner Payout:", ethers.formatEther(winnerPayout), "MON\n");

    // Declare winner (Player 1 wins)
    console.log("🏆 Step 5: Declaring winner...");
    const winner = ownerWallet.address; // Player 1 wins

    const winnerBalanceBefore = await provider.getBalance(winner);
    console.log(
      "- Winner balance before:",
      ethers.formatEther(winnerBalanceBefore),
      "MON"
    );

    const declareTx = await contract.declareWinner(betId, winner);
    console.log("- Transaction sent:", declareTx.hash);
    const declareReceipt = await declareTx.wait();
    console.log(
      "- Transaction confirmed in block:",
      declareReceipt!.blockNumber
    );

    // Check final balances
    console.log("\n✅ Step 6: Verifying results...");

    const winnerBalanceAfter = await provider.getBalance(winner);
    const contractBalanceAfter = await provider.getBalance(CONTRACT_ADDRESS);
    const accumulatedFeesAfter = await contract.accumulatedFees();

    console.log("\n📊 Final Balances:");
    console.log(
      "- Winner Balance:",
      ethers.formatEther(winnerBalanceAfter),
      "MON"
    );
    console.log(
      "- Winner Gain:",
      ethers.formatEther(winnerBalanceAfter - winnerBalanceBefore),
      "MON (minus gas)"
    );
    console.log(
      "- Contract Balance:",
      ethers.formatEther(contractBalanceAfter),
      "MON"
    );
    console.log(
      "- Accumulated Fees:",
      ethers.formatEther(accumulatedFeesAfter),
      "MON"
    );
    console.log(
      "- New Fees Accumulated:",
      ethers.formatEther(accumulatedFeesAfter - accumulatedFeesBefore),
      "MON"
    );

    // Verify calculations
    console.log("\n🔍 Verification:");
    const expectedFeeIncrease = platformFee;
    const actualFeeIncrease = accumulatedFeesAfter - accumulatedFeesBefore;
    console.log(
      "- Expected Fee:",
      ethers.formatEther(expectedFeeIncrease),
      "MON"
    );
    console.log("- Actual Fee:", ethers.formatEther(actualFeeIncrease), "MON");
    console.log(
      "- Match:",
      BigInt(expectedFeeIncrease) === BigInt(actualFeeIncrease) ? "✅" : "❌"
    );

    // Get final bet details
    const finalBetDetails = await contract.getBetDetails(betId);
    console.log("\n📋 Final Bet Status:");
    console.log(
      "- Status:",
      finalBetDetails[4] === 1 ? "Completed ✅" : "Unknown"
    );
    console.log("- Winner:", finalBetDetails[7]);
    console.log(
      "- Total Payout:",
      ethers.formatEther(finalBetDetails[8]),
      "MON"
    );
    console.log(
      "- Platform Fee:",
      ethers.formatEther(finalBetDetails[9]),
      "MON"
    );

    console.log("\n🎉 Test completed successfully!");
  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

// Run the test
testWinnerFunctionality()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
