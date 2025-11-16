// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PredictionOracle.sol";
import "../src/PredictionMarket.sol";

contract PredictionMarketOracleIntegrationTest is Test {
    PredictionOracle public oracle;
    PredictionMarket public market;
    
    address signer = vm.addr(1);
    uint256 signerKey = 1;
    address owner = vm.addr(2);
    address arbitrator = vm.addr(3);
    
    uint256 constant DISPUTE_BOND = 1 ether;
    uint256 constant MIN_BET = 0.1 ether;
    uint256 constant SCALE = 1_000_000;

    function setUp() public {
        // Deploy PredictionOracle first
        oracle = new PredictionOracle(signer);
        
        // Deploy PredictionMarket with reference to the oracle
        vm.prank(owner);
        market = new PredictionMarket(
            signer,        // oracleSigner
            arbitrator,    // arbitrator
            DISPUTE_BOND,  // disputeBond
            MIN_BET,       // minBet
            address(oracle) // predictionOracle
        );
    }

    function testMarketResolutionWithOraclePrediction() public {
        // Create a market
        vm.prank(owner);
        uint256 marketId = market.createMarket(
            "Will BTC price exceed $50,000 in the next week?",
            block.timestamp + 1 days,
            block.timestamp + 8 days
        );
        
        // Close the market (simulate betting period ending)
        vm.warp(block.timestamp + 2 days);
        vm.prank(owner);
        market.closeMarket(marketId);
        
        // Submit a prediction to the oracle (simulate AI pipeline)
        uint256 predictionId = 42;
        uint256 predictionValue = 750_000; // Above threshold = "Yes"
        uint256 confidence = 85;
        
        bytes32 msgHash = oracle.getMessageHash(predictionId, predictionValue, confidence);
        bytes32 ethHash = oracle.getEthSignedMessageHash(msgHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, ethHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        oracle.submitPrediction(predictionId, predictionValue, confidence, signature);
        
        // Resolve market using oracle prediction
        market.resolveMarketWithOracle(marketId, predictionId);
        
        // Verify market state using individual field access
        (,,,, PredictionMarket.MarketState state, PredictionMarket.Outcome provisional,,,, uint256 disputeDeadline,,) = market.markets(marketId);
        
        assertEq(uint256(state), uint256(PredictionMarket.MarketState.Provisional), "Market should be provisional");
        assertEq(uint256(provisional), uint256(PredictionMarket.Outcome.Yes), "Outcome should be Yes");
        assertGt(disputeDeadline, block.timestamp, "Dispute deadline should be in the future");
    }

    function testMarketResolutionWithLatestOraclePrediction() public {
        // Create a market
        vm.prank(owner);
        uint256 marketId = market.createMarket(
            "Will ETH price drop below $2,000 in the next 24 hours?",
            block.timestamp + 1 hours,
            block.timestamp + 25 hours
        );
        
        // Close the market
        vm.warp(block.timestamp + 2 hours);
        vm.prank(owner);
        market.closeMarket(marketId);
        
        // Submit multiple predictions to the oracle
        uint256[] memory predictionIds = new uint256[](3);
        uint256[] memory predictionValues = new uint256[](3);
        uint256[] memory confidences = new uint256[](3);
        
        predictionIds[0] = 1; predictionValues[0] = 250_000; confidences[0] = 70; // Below threshold = "No"
        predictionIds[1] = 2; predictionValues[1] = 600_000; confidences[1] = 80; // Above threshold = "Yes"  
        predictionIds[2] = 3; predictionValues[2] = 450_000; confidences[2] = 65; // Below threshold = "No"
        
        for (uint256 i = 0; i < predictionIds.length; i++) {
            bytes32 msgHash = oracle.getMessageHash(predictionIds[i], predictionValues[i], confidences[i]);
            bytes32 ethHash = oracle.getEthSignedMessageHash(msgHash);
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, ethHash);
            bytes memory signature = abi.encodePacked(r, s, v);
            
            oracle.submitPrediction(predictionIds[i], predictionValues[i], confidences[i], signature);
        }
        
        // Resolve market using latest oracle prediction (should use predictionId 3)
        market.resolveMarketWithLatestOracle(marketId);
        
        // Verify market state - latest prediction (450,000) is below threshold = "No"
        (,,,, PredictionMarket.MarketState state, PredictionMarket.Outcome provisional,,,, uint256 disputeDeadline,,) = market.markets(marketId);
        
        assertEq(uint256(state), uint256(PredictionMarket.MarketState.Provisional), "Market should be provisional");
        assertEq(uint256(provisional), uint256(PredictionMarket.Outcome.No), "Outcome should be No");
        assertGt(disputeDeadline, block.timestamp, "Dispute deadline should be in the future");
    }

    function testMarketResolutionWithCustomThreshold() public {
        // Create a market with specific threshold question
        vm.prank(owner);
        uint256 marketId = market.createMarket(
            "Will BTC dominance exceed 55%?",
            block.timestamp + 1 days,
            block.timestamp + 8 days
        );
        
        // Close the market
        vm.warp(block.timestamp + 2 days);
        vm.prank(owner);
        market.closeMarket(marketId);
        
        // Submit prediction that's exactly at threshold (550,000 = 55% with SCALE=1,000,000)
        uint256 predictionId = 100;
        uint256 predictionValue = 550_000; // Exactly at 55% threshold
        uint256 confidence = 90;
        
        bytes32 msgHash = oracle.getMessageHash(predictionId, predictionValue, confidence);
        bytes32 ethHash = oracle.getEthSignedMessageHash(msgHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, ethHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        oracle.submitPrediction(predictionId, predictionValue, confidence, signature);
        
        // Resolve market using oracle prediction
        market.resolveMarketWithOracle(marketId, predictionId);
        
        // Verify outcome - exactly at threshold should be "Yes" (> threshold)
        (,,,, PredictionMarket.MarketState state, PredictionMarket.Outcome provisional,,,, uint256 disputeDeadline,,) = market.markets(marketId);
        
        assertEq(uint256(state), uint256(PredictionMarket.MarketState.Provisional), "Market should be provisional");
        assertEq(uint256(provisional), uint256(PredictionMarket.Outcome.Yes), "Outcome should be Yes (above threshold)");
        assertGt(disputeDeadline, block.timestamp, "Dispute deadline should be in the future");
    }

    function testCannotResolveWithNonExistentOraclePrediction() public {
        // Create and close a market
        vm.prank(owner);
        uint256 marketId = market.createMarket(
            "Test market",
            block.timestamp + 1 days,
            block.timestamp + 8 days
        );
        
        vm.warp(block.timestamp + 2 days);
        vm.prank(owner);
        market.closeMarket(marketId);
        
        // Try to resolve with non-existent oracle prediction
        vm.expectRevert("Oracle prediction does not exist");
        market.resolveMarketWithOracle(marketId, 999);
    }

    function testCannotResolveWithLatestWhenNoPredictionsExist() public {
        // Create and close a market
        vm.prank(owner);
        uint256 marketId = market.createMarket(
            "Test market",
            block.timestamp + 1 days,
            block.timestamp + 8 days
        );
        
        vm.warp(block.timestamp + 2 days);
        vm.prank(owner);
        market.closeMarket(marketId);
        
        // Try to resolve with latest when no predictions exist
        vm.expectRevert("No predictions available");
        market.resolveMarketWithLatestOracle(marketId);
    }

    function testOracleContractAddressUpdate() public {
        // Verify initial oracle address
        assertEq(address(market.predictionOracle()), address(oracle), "Initial oracle address should match");
        
        // Deploy a new oracle
        PredictionOracle newOracle = new PredictionOracle(signer);
        
        // Update oracle address
        vm.prank(owner);
        market.setPredictionOracle(address(newOracle));
        
        // Verify update
        assertEq(address(market.predictionOracle()), address(newOracle), "Oracle address should be updated");
    }

    function testIntegrationWithBettingAndPayout() public {
        // Create a market
        vm.prank(owner);
        uint256 marketId = market.createMarket(
            "Will the AI predict a positive outcome?",
            block.timestamp + 1 days,
            block.timestamp + 8 days
        );
        
        // Place bets
        address bettor1 = vm.addr(100);
        address bettor2 = vm.addr(101);
        
        vm.deal(bettor1, 1 ether);
        vm.deal(bettor2, 1 ether);
        
        // Bettor1 bets "Yes"
        vm.prank(bettor1);
        market.placeBet{value: 0.5 ether}(marketId, true);
        
        // Bettor2 bets "No"  
        vm.prank(bettor2);
        market.placeBet{value: 0.5 ether}(marketId, false);
        
        // Close market
        vm.warp(block.timestamp + 2 days);
        vm.prank(owner);
        market.closeMarket(marketId);
        
        // Submit oracle prediction that favors "Yes"
        uint256 predictionId = 200;
        uint256 predictionValue = 800_000; // Strong "Yes" signal
        uint256 confidence = 95;
        
        bytes32 msgHash = oracle.getMessageHash(predictionId, predictionValue, confidence);
        bytes32 ethHash = oracle.getEthSignedMessageHash(msgHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, ethHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        
        oracle.submitPrediction(predictionId, predictionValue, confidence, signature);
        
        // Resolve market using oracle prediction
        market.resolveMarketWithOracle(marketId, predictionId);
        
        // Finalize market (no dispute)
        vm.warp(block.timestamp + 2 hours);
        vm.prank(arbitrator);
        market.finalizeMarket(marketId, 1, false); // Accept provisional outcome
        
        // Bettor1 should be able to claim payout
        uint256 initialBalance = bettor1.balance;
        vm.prank(bettor1);
        market.claimPayout(marketId);
        
        // Verify payout (should get back bet + share of loser's pool)
        assertGt(bettor1.balance, initialBalance, "Bettor1 should receive payout");
    }
}