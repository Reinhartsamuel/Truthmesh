// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {PredictionOracle} from "../src/PredictionOracle.sol";

contract PredictionOracleScript is Script {
    PredictionOracle public oracle;

    function run() public {
        // Read deployer private key from environment (PRIVATE_KEY)
        // and the intended oracle signer address (ORACLE_SIGNER).
        // If ORACLE_SIGNER is not provided, fall back to the deployer address.
        uint256 deployerKey = vm.envUint("ORACLE_PRIVATE_KEY");
        address oracleSigner = vm.envAddress("ORACLE_SIGNER");

        if (oracleSigner == address(0)) {
            oracleSigner = vm.addr(deployerKey);
            console.log("ORACLE_SIGNER not set, using deployer address as oracle signer:");
        } else {
            console.log("Using ORACLE_SIGNER from env:");
        }

        vm.deal(oracleSigner, 100 ether);

        console.log(address(oracleSigner));

        // Broadcast using the deployer key
        vm.startBroadcast(deployerKey);

        oracle = new PredictionOracle(oracleSigner);

        vm.stopBroadcast();

        console.log("PredictionOracle deployed at:", address(oracle));
    }
}
