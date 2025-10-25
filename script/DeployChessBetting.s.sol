// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {ChessBetting} from "../src/Counter.sol";

contract DeployChessBetting is Script {
    function run() external returns (ChessBetting) {
        // Configuration
        uint256 platformFeePercent = 250; // 2.5%
        uint256 minBetAmount = 0.01 ether;
        uint256 maxBetAmount = 10 ether;
        
        console2.log("Deploying ChessBetting contract...");
        console2.log("Platform Fee: 2.5%");
        console2.log("Min Bet:", minBetAmount);
        console2.log("Max Bet:", maxBetAmount);
        
        vm.startBroadcast();
        
        ChessBetting chessBetting = new ChessBetting(
            platformFeePercent,
            minBetAmount,
            maxBetAmount
        );
        
        vm.stopBroadcast();
        
        console2.log("ChessBetting deployed at:", address(chessBetting));
        console2.log("Owner:", chessBetting.owner());
        
        return chessBetting;
    }
}

// For testnet deployment with custom parameters
contract DeployTestnet is Script {
    function run() external returns (ChessBetting) {
        // Testnet configuration - more flexible limits
        uint256 platformFeePercent = 200; // 2%
        uint256 minBetAmount = 0.001 ether; // Lower for testing
        uint256 maxBetAmount = 100 ether; // Higher for testing
        
        console2.log("Deploying ChessBetting to TESTNET...");
        console2.log("Platform Fee: 2%");
        console2.log("Min Bet:", minBetAmount);
        console2.log("Max Bet:", maxBetAmount);
        
        vm.startBroadcast();
        
        ChessBetting chessBetting = new ChessBetting(
            platformFeePercent,
            minBetAmount,
            maxBetAmount
        );
        
        vm.stopBroadcast();
        
        console2.log("\n=== Deployment Successful ===");
        console2.log("Contract Address:", address(chessBetting));
        console2.log("Owner:", chessBetting.owner());
        
        return chessBetting;
    }
}
