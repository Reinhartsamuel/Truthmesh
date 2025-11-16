// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";
import {PredictionOracle} from "../src/PredictionOracle.sol";

contract PredictionMarketScript is Script {
    PredictionMarket public market;
    PredictionOracle public oracle;

    function run() public {
        // Read environment variables
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address oracleSigner = vm.envAddress("ORACLE_SIGNER");
        address arbitrator = vm.envAddress("ARBITRATOR");
        uint256 disputeBond = vm.envUint("DISPUTE_BOND");
        uint256 minBetAmount = vm.envUint("MIN_BET_AMOUNT");
        address existingOracle = vm.envAddress("EXISTING_ORACLE");

        // Set defaults if not provided
        if (oracleSigner == address(0)) {
            oracleSigner = vm.addr(deployerKey);
            console.log("ORACLE_SIGNER not set, using deployer address as oracle signer:");
        }

        if (arbitrator == address(0)) {
            arbitrator = vm.addr(deployerKey);
            console.log("ARBITRATOR not set, using deployer address as arbitrator:");
        }

        if (disputeBond == 0) {
            disputeBond = 1 ether;
            console.log("DISPUTE_BOND not set, using default:", disputeBond);
        }

        if (minBetAmount == 0) {
            minBetAmount = 0.1 ether;
            console.log("MIN_BET_AMOUNT not set, using default:", minBetAmount);
        }

        console.log("Oracle Signer:", oracleSigner);
        console.log("Arbitrator:", arbitrator);
        console.log("Dispute Bond:", disputeBond);
        console.log("Min Bet Amount:", minBetAmount);

        vm.startBroadcast(deployerKey);

        // Deploy or use existing oracle
        if (existingOracle == address(0)) {
            console.log("Deploying new PredictionOracle...");
            oracle = new PredictionOracle(oracleSigner);
            console.log("PredictionOracle deployed at:", address(oracle));
        } else {
            console.log("Using existing PredictionOracle at:", existingOracle);
            oracle = PredictionOracle(existingOracle);
        }

        // Deploy PredictionMarket with oracle reference
        console.log("Deploying PredictionMarket...");
        market = new PredictionMarket(
            oracleSigner,
            arbitrator,
            disputeBond,
            minBetAmount,
            address(oracle)
        );

        vm.stopBroadcast();

        console.log("PredictionMarket deployed at:", address(market));
        console.log("Full system deployed:");
        console.log("- PredictionOracle:", address(oracle));
        console.log("- PredictionMarket:", address(market));
        console.log("- Oracle Signer:", oracleSigner);
        console.log("- Arbitrator:", arbitrator);
    }
}