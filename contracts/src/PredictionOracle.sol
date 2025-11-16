// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PredictionOracle {
    address public oracleSigner;

    struct Prediction {
        uint256 id;
        uint256 prediction;
        uint256 confidence;
        uint256 timestamp;
        address signer;
    }

    // Storage for predictions
    mapping(uint256 => Prediction) public predictions;
    uint256 public latestPredictionId;

    // Track which prediction IDs have been submitted to prevent duplicates
    mapping(uint256 => bool) public predictionSubmitted;

    event PredictionSubmitted(
        uint256 indexed id,
        uint256 prediction,
        uint256 confidence,
        address indexed signer
    );

    constructor(address _signer) {
        oracleSigner = _signer;
    }

    function setOracleSigner(address newSigner) external {
        oracleSigner = newSigner;
    }

    function getMessageHash(
        uint256 id,
        uint256 prediction,
        uint256 confidence
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(id, prediction, confidence));
    }

    function getEthSignedMessageHash(bytes32 messageHash)
        public
        pure
        returns (bytes32)
    {
        // EIP-191 prefix
        return keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );
    }

    function submitPrediction(
        uint256 id,
        uint256 prediction,
        uint256 confidence,
        bytes memory signature
    ) external {
        // Prevent duplicate submissions
        require(!predictionSubmitted[id], "Prediction already submitted");

        bytes32 messageHash = getMessageHash(id, prediction, confidence);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        address signer = recoverSigner(ethSignedMessageHash, signature);
        require(signer == oracleSigner, "Invalid signer");

        // Store the prediction
        predictions[id] = Prediction({
            id: id,
            prediction: prediction,
            confidence: confidence,
            timestamp: block.timestamp,
            signer: signer
        });

        predictionSubmitted[id] = true;
        latestPredictionId = id;

        emit PredictionSubmitted(id, prediction, confidence, signer);
    }

    // Get prediction by ID
    function getPrediction(uint256 id) public view returns (Prediction memory) {
        require(predictionSubmitted[id], "Prediction does not exist");
        return predictions[id];
    }

    // Get the latest prediction
    function getLatestPrediction() public view returns (Prediction memory) {
        require(latestPredictionId > 0, "No predictions available");
        return predictions[latestPredictionId];
    }

    // Get multiple predictions by IDs
    function getPredictions(uint256[] calldata ids) public view returns (Prediction[] memory) {
        Prediction[] memory result = new Prediction[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) {
            if (predictionSubmitted[ids[i]]) {
                result[i] = predictions[ids[i]];
            }
        }
        return result;
    }

    // Check if a prediction exists
    function predictionExists(uint256 id) public view returns (bool) {
        return predictionSubmitted[id];
    }

    // Get prediction count (approximate - tracks highest ID used)
    function getPredictionCount() public view returns (uint256) {
        return latestPredictionId; // This gives the highest ID used, not exact count
    }

    function recoverSigner(bytes32 _ethSignedMessageHash, bytes memory _sig)
        public
        pure
        returns (address)
    {
        require(_sig.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(_sig, 32))
            s := mload(add(_sig, 64))
            v := byte(0, mload(add(_sig, 96)))
        }

        return ecrecover(_ethSignedMessageHash, v, r, s);
    }
}
