// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {ChessBetting} from "../src/Counter.sol";

// Legacy test file - see ChessBetting.t.sol for comprehensive tests
contract CounterTest is Test {
    ChessBetting public chessBetting;

    function setUp() public {
        chessBetting = new ChessBetting(250, 0.01 ether, 10 ether);
    }

    function test_Deployment() public {
        assertEq(chessBetting.owner(), address(this));
        assertEq(chessBetting.platformFeePercent(), 250);
        assertEq(chessBetting.minBetAmount(), 0.01 ether);
        assertEq(chessBetting.maxBetAmount(), 10 ether);
    }
}
