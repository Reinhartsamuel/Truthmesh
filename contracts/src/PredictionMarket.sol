// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PredictionOracle.sol";

contract PredictionMarket {

    address public owner;
    address public oracleSigner; // authorized oracle signer
    address public arbitrator; // can finalize disputes
    uint256 public disputeBond; // amount required to start dispute (wei)
    uint256 public minBetAmount; // minimum bet size
    PredictionOracle public predictionOracle; // reference to the AI oracle contract

    enum MarketState {
        Open,
        Closed,
        Provisional,
        Disputed,
        Finalized,
        Cancelled
    }
    enum Outcome {
        None,
        Yes,
        No
    } // binary markets

    struct Market {
        uint256 id;
        string question;
        uint256 lockTimestamp; // betting cutoff (unix)
        uint256 resolveTimestamp; // optional resolution time
        MarketState state;
        Outcome provisionalOutcome; // set when oracle posts
        Outcome finalOutcome; // finalized outcome
        uint256 totalYes;
        uint256 totalNo;
        uint256 disputeDeadline; // until when dispute can be created
        address disputeStaker; // who staked the bond
        uint256 disputeBondAmount;
    }

    struct Bet {
        uint256 yesAmount;
        uint256 noAmount;
        bool claimed;
    }

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => Bet)) public bets;
    uint256 public nextMarketId;

    // events
    event MarketCreated(
        uint256 indexed id,
        string question,
        uint256 lockTimestamp
    );
    event BetPlaced(
        uint256 indexed id,
        address indexed user,
        bool yes,
        uint256 amount
    );
    event MarketClosed(uint256 indexed id);
    event OracleSubmitted(
        uint256 indexed id,
        Outcome outcome,
        uint256 confidence,
        address signer
    );
    event DisputeStarted(
        uint256 indexed id,
        address indexed staker,
        uint256 bond
    );
    event MarketFinalized(uint256 indexed id, Outcome finalOutcome);
    event PayoutClaimed(
        uint256 indexed id,
        address indexed user,
        uint256 amount
    );
    event MarketCancelled(uint256 indexed id);

    constructor(
        address _oracleSigner,
        address _arbitrator,
        uint256 _disputeBond,
        uint256 _minBet,
        address _predictionOracle
    ) {
        owner = msg.sender;
        oracleSigner = _oracleSigner;
        arbitrator = _arbitrator;
        disputeBond = _disputeBond;
        minBetAmount = _minBet;
        predictionOracle = PredictionOracle(_predictionOracle);
        nextMarketId = 1;
    }

    // modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }
    modifier onlyArbitrator() {
        require(msg.sender == arbitrator, "only arbitrator");
        _;
    }

    // owner: create market
    function createMarket(
        string calldata question,
        uint256 lockTimestamp,
        uint256 resolveTimestamp
    ) external onlyOwner returns (uint256) {
        require(lockTimestamp > block.timestamp, "lock must be future");
        uint256 id = nextMarketId++;
        markets[id] = Market({
            id: id,
            question: question,
            lockTimestamp: lockTimestamp,
            resolveTimestamp: resolveTimestamp,
            state: MarketState.Open,
            provisionalOutcome: Outcome.None,
            finalOutcome: Outcome.None,
            totalYes: 0,
            totalNo: 0,
            disputeDeadline: 0,
            disputeStaker: address(0),
            disputeBondAmount: 0
        });
        emit MarketCreated(id, question, lockTimestamp);
        return id;
    }

    // users place bets (payable)
    function placeBet(uint256 marketId, bool yes) external payable {
        Market storage m = markets[marketId];
        require(m.id != 0, "no market");
        require(m.state == MarketState.Open, "not open");
        require(block.timestamp < m.lockTimestamp, "market locked");
        require(msg.value >= minBetAmount, "bet too small");

        Bet storage b = bets[marketId][msg.sender];
        if (yes) {
            b.yesAmount += msg.value;
            m.totalYes += msg.value;
        } else {
            b.noAmount += msg.value;
            m.totalNo += msg.value;
        }
        emit BetPlaced(marketId, msg.sender, yes, msg.value);
    }

    // owner can close market manually once lock passed
    function closeMarket(uint256 marketId) external onlyOwner {
        Market storage m = markets[marketId];
        require(m.id != 0, "no market");
        require(m.state == MarketState.Open, "invalid state");
        require(block.timestamp >= m.lockTimestamp, "cannot close before lock");
        m.state = MarketState.Closed;
        emit MarketClosed(marketId);
    }

    // Oracle submits provisional result (signed off-chain). confidence included for UI only.
    // signature must be ethSignedMessageHash(keccak256(abi.encodePacked(marketId, outcomeUint, confidence)))
    function submitOracleResult(
        uint256 marketId,
        uint8 outcomeUint,
        uint256 confidence,
        bytes memory signature
    ) external {
        Market storage m = markets[marketId];
        require(m.id != 0, "no market");
        require(m.state == MarketState.Closed, "market not closed");
        require(outcomeUint == 1 || outcomeUint == 2, "invalid outcome"); // 1=yes,2=no

        // reconstruct hash and recover signer
        bytes32 msgHash = keccak256(
            abi.encodePacked(marketId, outcomeUint, confidence)
        );
        bytes32 ethHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", msgHash)
        );
        address signer = recoverSigner(ethHash, signature);
        require(signer == oracleSigner, "invalid oracle signer");

        // set provisional
        m.provisionalOutcome = outcomeUint == 1 ? Outcome.Yes : Outcome.No;
        m.state = MarketState.Provisional;
        m.disputeDeadline = block.timestamp + 1 hours; // or configurable
        emit OracleSubmitted(
            marketId,
            m.provisionalOutcome,
            confidence,
            signer
        );
    }

    // Use AI oracle prediction to automatically resolve market
    // This function uses the latest prediction from the AI oracle to determine market outcome
    function resolveMarketWithOracle(uint256 marketId, uint256 oraclePredictionId) external {
        Market storage m = markets[marketId];
        require(m.id != 0, "no market");
        require(m.state == MarketState.Closed, "market not closed");

        // Get prediction from AI oracle
        require(predictionOracle.predictionExists(oraclePredictionId), "Oracle prediction does not exist");
        PredictionOracle.Prediction memory oraclePred = predictionOracle.getPrediction(oraclePredictionId);

        // Convert continuous prediction to binary outcome
        // For demo purposes: prediction > 500,000 means "Yes", otherwise "No"
        // In production, this would use more sophisticated logic based on market question
        uint256 threshold = 500_000; // Adjust based on your scaling factor
        Outcome outcome = oraclePred.prediction > threshold ? Outcome.Yes : Outcome.No;

        // Set provisional outcome based on AI oracle
        m.provisionalOutcome = outcome;
        m.state = MarketState.Provisional;
        m.disputeDeadline = block.timestamp + 1 hours;

        emit OracleSubmitted(
            marketId,
            m.provisionalOutcome,
            oraclePred.confidence,
            oraclePred.signer
        );
    }

    // Get the latest AI oracle prediction and use it to resolve market
    function resolveMarketWithLatestOracle(uint256 marketId) external {
        Market storage m = markets[marketId];
        require(m.id != 0, "no market");
        require(m.state == MarketState.Closed, "market not closed");

        // Get latest prediction from AI oracle
        PredictionOracle.Prediction memory oraclePred = predictionOracle.getLatestPrediction();

        // Convert continuous prediction to binary outcome
        uint256 threshold = 500_000; // Adjust based on your scaling factor
        Outcome outcome = oraclePred.prediction > threshold ? Outcome.Yes : Outcome.No;

        // Set provisional outcome based on AI oracle
        m.provisionalOutcome = outcome;
        m.state = MarketState.Provisional;
        m.disputeDeadline = block.timestamp + 1 hours;

        emit OracleSubmitted(
            marketId,
            m.provisionalOutcome,
            oraclePred.confidence,
            oraclePred.signer
        );
    }

    // anyone can stake bond to dispute during dispute window
    function startDispute(uint256 marketId) external payable {
        Market storage m = markets[marketId];
        require(m.id != 0, "no market");
        require(m.state == MarketState.Provisional, "not provisional");
        require(block.timestamp <= m.disputeDeadline, "dispute closed");
        require(m.disputeStaker == address(0), "already disputed");
        require(msg.value >= disputeBond, "insufficient bond");

        m.state = MarketState.Disputed;
        m.disputeStaker = msg.sender;
        m.disputeBondAmount = msg.value;
        emit DisputeStarted(marketId, msg.sender, msg.value);
    }

    // arbitrator finalizes market (either accept provisional or overturn)
    // if overturned, finalOutcome is provided by arbitrator.
    // If not overturned, finalOutcome should equal provisionalOutcome.
    // Bond distribution: if overturn => bond goes to arbitrator/staker, else to oracleSigner (or to pot)
    function finalizeMarket(
        uint256 marketId,
        uint8 finalOutcomeUint,
        bool overturn
    ) external onlyArbitrator {
        Market storage m = markets[marketId];
        require(m.id != 0, "no market");
        require(
            m.state == MarketState.Provisional ||
                m.state == MarketState.Disputed,
            "not finalizable"
        );
        require(
            finalOutcomeUint == 1 || finalOutcomeUint == 2,
            "invalid outcome"
        );

        Outcome finalOutcome = finalOutcomeUint == 1 ? Outcome.Yes : Outcome.No;
        m.finalOutcome = finalOutcome;
        m.state = MarketState.Finalized;

        // handle bond distribution
        if (m.disputeStaker != address(0)) {
            if (overturn) {
                // staker wins the bond (arbitrator decision): send bond to staker (for hackathon it's simple)
                payable(m.disputeStaker).transfer(m.disputeBondAmount);
            } else {
                // staker loses; bond goes to owner/oracleSigner (we send to owner)
                payable(owner).transfer(m.disputeBondAmount);
            }
            m.disputeStaker = address(0);
            m.disputeBondAmount = 0;
        }

        emit MarketFinalized(marketId, finalOutcome);
    }

    // claim payout after finalization
    function claimPayout(uint256 marketId) external {
        Market storage m = markets[marketId];
        require(m.state == MarketState.Finalized, "not finalized");
        Bet storage b = bets[marketId][msg.sender];
        require(!b.claimed, "already claimed");

        uint256 payout = 0;
        // winners are the side matching finalOutcome
        if (m.finalOutcome == Outcome.Yes) {
            if (b.yesAmount == 0) revert("no winning bet");
            // proportional share of losers
            uint256 winnersTotal = m.totalYes;
            uint256 losersTotal = m.totalNo;
            payout = b.yesAmount + (b.yesAmount * losersTotal) / winnersTotal;
        } else {
            if (b.noAmount == 0) revert("no winning bet");
            uint256 winnersTotal = m.totalNo;
            uint256 losersTotal = m.totalYes;
            payout = b.noAmount + (b.noAmount * losersTotal) / winnersTotal;
        }

        b.claimed = true;
        (bool ok, ) = msg.sender.call{value: payout}("");
        require(ok, "transfer failed");
        emit PayoutClaimed(marketId, msg.sender, payout);
    }

    // cancel market (owner)
    function cancelMarket(uint256 marketId) external onlyOwner {
        Market storage m = markets[marketId];
        require(
            m.state == MarketState.Open || m.state == MarketState.Closed,
            "cannot cancel"
        );
        m.state = MarketState.Cancelled;
        emit MarketCancelled(marketId);
    }

    // if market cancelled, refund bets
    function refund(uint256 marketId) external {
        Market storage m = markets[marketId];
        require(m.state == MarketState.Cancelled, "not cancelled");
        Bet storage b = bets[marketId][msg.sender];
        uint256 refundAmt = b.yesAmount + b.noAmount;
        require(refundAmt > 0, "nothing to refund");
        b.yesAmount = 0;
        b.noAmount = 0;
        (bool ok, ) = msg.sender.call{value: refundAmt}("");
        require(ok, "transfer failed");
    }

    // admin setters
    function setOracleSigner(address s) external onlyOwner {
        oracleSigner = s;
    }

    function setArbitrator(address a) external onlyOwner {
        arbitrator = a;
    }

    function setPredictionOracle(address _predictionOracle) external onlyOwner {
        predictionOracle = PredictionOracle(_predictionOracle);
    }

    function setDisputeBond(uint256 b) external onlyOwner {
        disputeBond = b;
    }

    function setMinBet(uint256 m) external onlyOwner {
        minBetAmount = m;
    }

    // receive fallback
    receive() external payable {}

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
