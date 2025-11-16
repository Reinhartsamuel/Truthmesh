// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PredictionOracle.sol";

contract PredictionOracleTest is Test {
    PredictionOracle oracle;
    address signer = vm.addr(1);
    uint256 signerKey = 1;

    function setUp() public {
        oracle = new PredictionOracle(signer);
    }

    function testSignatureFlow() public {
        uint256 id = 100;
        uint256 prediction = 1_234_567;
        uint256 confidence = 85;

        bytes32 msgHash = oracle.getMessageHash(id, prediction, confidence);
        bytes32 ethHash = oracle.getEthSignedMessageHash(msgHash);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, ethHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // should emit the event
        vm.expectEmit(true, true, true, true);
        emit PredictionOracle.PredictionSubmitted(id, prediction, confidence, signer);

        oracle.submitPrediction(id, prediction, confidence, signature);
    }

    function testPredictionStorageAndQuery() public {
        uint256 id = 42;
        uint256 prediction = 987_654;
        uint256 confidence = 92;

        bytes32 msgHash = oracle.getMessageHash(id, prediction, confidence);
        bytes32 ethHash = oracle.getEthSignedMessageHash(msgHash);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, ethHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // Submit prediction
        oracle.submitPrediction(id, prediction, confidence, signature);

        // Test that prediction was stored
        assertTrue(oracle.predictionExists(id), "Prediction should exist");
        
        // Test getPrediction function
        PredictionOracle.Prediction memory storedPrediction = oracle.getPrediction(id);
        assertEq(storedPrediction.id, id, "ID should match");
        assertEq(storedPrediction.prediction, prediction, "Prediction value should match");
        assertEq(storedPrediction.confidence, confidence, "Confidence should match");
        assertEq(storedPrediction.signer, signer, "Signer should match");
        assertGt(storedPrediction.timestamp, 0, "Timestamp should be set");

        // Test latestPredictionId was updated
        assertEq(oracle.latestPredictionId(), id, "Latest prediction ID should be updated");

        // Test prediction count
        assertEq(oracle.getPredictionCount(), id, "Prediction count should match latest ID");
    }

    function testMultiplePredictions() public {
        uint256[] memory ids = new uint256[](3);
        uint256[] memory predictions = new uint256[](3);
        uint256[] memory confidences = new uint256[](3);

        ids[0] = 1; predictions[0] = 100; confidences[0] = 80;
        ids[1] = 2; predictions[1] = 200; confidences[1] = 85;
        ids[2] = 3; predictions[2] = 300; confidences[2] = 90;

        // Submit multiple predictions
        for (uint256 i = 0; i < ids.length; i++) {
            bytes32 msgHash = oracle.getMessageHash(ids[i], predictions[i], confidences[i]);
            bytes32 ethHash = oracle.getEthSignedMessageHash(msgHash);
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, ethHash);
            bytes memory signature = abi.encodePacked(r, s, v);
            
            oracle.submitPrediction(ids[i], predictions[i], confidences[i], signature);
        }

        // Test getLatestPrediction
        PredictionOracle.Prediction memory latest = oracle.getLatestPrediction();
        assertEq(latest.id, ids[2], "Latest prediction should be the last one submitted");

        // Test getPredictions with array
        uint256[] memory queryIds = new uint256[](2);
        queryIds[0] = 1;
        queryIds[1] = 3;
        
        PredictionOracle.Prediction[] memory results = oracle.getPredictions(queryIds);
        assertEq(results.length, 2, "Should return 2 predictions");
        assertEq(results[0].id, 1, "First result ID should match");
        assertEq(results[1].id, 3, "Second result ID should match");
    }

    function testDuplicateSubmissionPrevention() public {
        uint256 id = 99;
        uint256 prediction = 555_555;
        uint256 confidence = 75;

        bytes32 msgHash = oracle.getMessageHash(id, prediction, confidence);
        bytes32 ethHash = oracle.getEthSignedMessageHash(msgHash);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerKey, ethHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        // First submission should work
        oracle.submitPrediction(id, prediction, confidence, signature);

        // Second submission with same ID should fail
        vm.expectRevert("Prediction already submitted");
        oracle.submitPrediction(id, prediction, confidence, signature);
    }

    function testInvalidSigner() public {
        uint256 id = 50;
        uint256 prediction = 111_111;
        uint256 confidence = 60;

        bytes32 msgHash = oracle.getMessageHash(id, prediction, confidence);
        bytes32 ethHash = oracle.getEthSignedMessageHash(msgHash);

        // Sign with different private key (not the authorized signer)
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(2, ethHash); // Using key 2 instead of 1
        bytes memory signature = abi.encodePacked(r, s, v);

        // Should revert with invalid signer
        vm.expectRevert("Invalid signer");
        oracle.submitPrediction(id, prediction, confidence, signature);
    }

    function testNonExistentPrediction() public {
        // Query for non-existent prediction should revert
        vm.expectRevert("Prediction does not exist");
        oracle.getPrediction(999);

        // Get latest prediction when none exist should revert
        vm.expectRevert("No predictions available");
        oracle.getLatestPrediction();
    }
}
