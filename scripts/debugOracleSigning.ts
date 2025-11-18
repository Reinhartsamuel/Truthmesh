// scripts/debugOracleSigning.ts
import { ethers } from "ethers";

// ABI for PredictionOracle contract
const PREDICTION_ORACLE_ABI = [
  "function oracleSigner() public view returns (address)",
  "function getMessageHash(uint256 id, uint256 prediction, uint256 confidence) public pure returns (bytes32)",
  "function getEthSignedMessageHash(bytes32 messageHash) public pure returns (bytes32)",
  "function submitPrediction(uint256 id, uint256 prediction, uint256 confidence, bytes signature) external"
];

async function debugOracleSigning() {
  console.log("🔧 Debugging Oracle Signing");
  console.log("===========================\n");

  // Check environment variables
  console.log("📋 Environment Variables:");
  console.log(`   ORACLE_PRIVATE_KEY: ${process.env.ORACLE_PRIVATE_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`   RPC_URL: ${process.env.RPC_URL ? 'SET' : 'NOT SET'}`);
  console.log(`   PREDICTION_ORACLE_ADDRESS: ${process.env.PREDICTION_ORACLE_ADDRESS ? 'SET' : 'NOT SET'}`);
  
  if (!process.env.ORACLE_PRIVATE_KEY) {
    console.log("\n❌ ORACLE_PRIVATE_KEY is not set");
    process.exit(1);
  }

  if (!process.env.RPC_URL) {
    console.log("\n❌ RPC_URL is not set");
    process.exit(1);
  }

  if (!process.env.PREDICTION_ORACLE_ADDRESS) {
    console.log("\n❌ PREDICTION_ORACLE_ADDRESS is not set");
    process.exit(1);
  }

  try {
    // Connect to blockchain
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    
    // Create wallet from private key
    const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);
    
    console.log(`\n👤 Wallet Details:`);
    console.log(`   Address: ${wallet.address}`);
    console.log(`   Private Key Length: ${process.env.ORACLE_PRIVATE_KEY.length} chars`);
    console.log(`   Private Key Starts With: ${process.env.ORACLE_PRIVATE_KEY.substring(0, 10)}...`);
    
    // Connect to oracle contract
    const oracleContract = new ethers.Contract(
      process.env.PREDICTION_ORACLE_ADDRESS,
      PREDICTION_ORACLE_ABI,
      provider
    );

    console.log(`\n📡 Contract Details:`);
    console.log(`   Oracle Address: ${process.env.PREDICTION_ORACLE_ADDRESS}`);
    
    // Check current oracle signer
    const currentOracleSigner = await oracleContract.oracleSigner();
    console.log(`   Contract Oracle Signer: ${currentOracleSigner}`);
    
    // Check if addresses match
    const addressesMatch = currentOracleSigner.toLowerCase() === wallet.address.toLowerCase();
    console.log(`   Addresses Match: ${addressesMatch ? '✅ YES' : '❌ NO'}`);
    
    if (!addressesMatch) {
      console.log(`\n❌ MISMATCH DETECTED:`);
      console.log(`   Wallet Address: ${wallet.address}`);
      console.log(`   Contract Expects: ${currentOracleSigner}`);
      console.log(`\n💡 Solution: Update ORACLE_PRIVATE_KEY to match the contract's expected signer`);
      process.exit(1);
    }

    console.log(`\n🧪 Testing Signature Process...`);
    
    // Test data
    const testId = 999;
    const testPrediction = 750000; // 0.75 scaled
    const testConfidence = 820000; // 0.82 scaled
    
    // Get message hash from contract
    const messageHash = await oracleContract.getMessageHash(testId, testPrediction, testConfidence);
    console.log(`   Message Hash: ${messageHash}`);
    
    // Get Ethereum signed message hash
    const ethSignedMessageHash = await oracleContract.getEthSignedMessageHash(messageHash);
    console.log(`   Eth Signed Message Hash: ${ethSignedMessageHash}`);
    
    // Sign the message
    const signature = await wallet.signMessage(ethers.getBytes(ethSignedMessageHash));
    console.log(`   Signature: ${signature}`);
    console.log(`   Signature Length: ${signature.length} chars`);
    
    // Verify the signature locally
    const recoveredAddress = ethers.verifyMessage(ethers.getBytes(ethSignedMessageHash), signature);
    console.log(`   Recovered Address: ${recoveredAddress}`);
    console.log(`   Recovery Matches: ${recoveredAddress.toLowerCase() === wallet.address.toLowerCase() ? '✅ YES' : '❌ NO'}`);
    
    // Test submission (estimate gas only)
    console.log(`\n🧪 Testing Contract Submission (estimateGas)...`);
    const contractWithSigner = oracleContract.connect(wallet);
    
    try {
      const gasEstimate = await contractWithSigner.submitPrediction.estimateGas(
        testId,
        testPrediction,
        testConfidence,
        signature
      );
      console.log(`   Gas Estimate: ${gasEstimate.toString()}`);
      console.log(`   ✅ Contract submission would succeed!`);
      
      console.log(`\n🎉 All checks passed! The oracle signing is working correctly.`);
      console.log(`\n🚀 You can now run the market-aware workflow.`);
      
    } catch (estimateError: any) {
      console.log(`   ❌ Contract submission failed:`);
      console.log(`      Error: ${estimateError.message}`);
      console.log(`      Reason: ${estimateError.reason || 'Unknown'}`);
      console.log(`      Data: ${estimateError.data || 'None'}`);
      
      if (estimateError.reason === "Invalid signer") {
        console.log(`\n🔍 Invalid Signer Analysis:`);
        console.log(`   - Wallet Address: ${wallet.address}`);
        console.log(`   - Contract Expects: ${currentOracleSigner}`);
        console.log(`   - Match: ${wallet.address.toLowerCase() === currentOracleSigner.toLowerCase() ? 'YES' : 'NO'}`);
        console.log(`\n💡 Possible causes:`);
        console.log(`   1. The contract was deployed with a different signer`);
        console.log(`   2. The signer was changed after deployment`);
        console.log(`   3. Wrong private key is being used`);
      }
    }

  } catch (error: any) {
    console.log(`\n❌ Debug failed:`);
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the debug
debugOracleSigning().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});