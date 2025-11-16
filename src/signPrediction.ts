// signPrediction.js
import { ethers } from "ethers";
import "dotenv/config";

// -----------------------------------------
// CONFIG
// -----------------------------------------
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY; // safe in .env
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(ORACLE_PRIVATE_KEY!, provider);

// -----------------------------------------
// MAIN FUNCTION
// -----------------------------------------
export async function signPrediction(prediction:any) {
  // pack like in Solidity: abi.encode(prediction, msg.sender)
  // but off-chain we only sign the prediction, the contract adds msg.sender
  const messageHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [prediction])
  );

  const signature = await wallet.signMessage(ethers.getBytes(messageHash));

  return {
    prediction,
    signature,
    signer: wallet.address,
    messageHash,
  };
}

// -----------------------------------------
// Example CLI usage
// -----------------------------------------
async function main() {
  const prediction = process.argv[2];

  if (!prediction) {
    console.log("Usage: node signPrediction.js <prediction>");
    process.exit(1);
  }

  const result = await signPrediction(Number(prediction));
  console.log("\n--- Signed Prediction ---");
  console.log(result);
}

main();
