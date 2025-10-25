// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {ChessBetting} from "../src/Counter.sol";

contract CounterScript is Script {
    ChessBetting public chessBetting;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        // Deploy with default parameters
        chessBetting = new ChessBetting(
            250, // 2.5% platform fee
            0.01 ether, // Min bet
            10 ether // Max bet
        );

        vm.stopBroadcast();
    }
}
