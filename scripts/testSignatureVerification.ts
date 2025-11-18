// scripts/testSignatureVerification.ts
import { ethers } from "ethers";

// ABI for PredictionOracle contract
const PREDICTION_ORACLE_ABI = [
  "function oracleSigner() public view returns (address)",
  "function getMessageHash(uint256 id, uint256 prediction, uint256 confidence) public pure returns (bytes32)",
  "function getEthSignedMessageHash(bytes32 messageHash) public pure returns (bytes32)",
  "function recoverSigner(bytes32 _ethSignedMessageHash, bytes memory _sig) public pure returns (address)",
  "function submitPrediction(uint256 id, uint256 prediction, uint256 confidence, bytes memory signature) external"
];

async function testSignatureVerification() {
  console.log("🔍 Testing Signature Verification");
  console.log("=================================\n");

  // Check environment variables
  const requiredEnvVars = [
    'ORACLE_PRIVATE_KEY',
    'RPC_URL', 
    'PREDICTION_ORACLE_ADDRESS'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ ${envVar} environment variable is required`);
      process.exit(1);
    }
  }

  try {
    // Connect to blockchain
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    
    // Create wallet from private key
    const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY!, provider);
    
    console.log("👤 Wallet Details:");
    console.log(`   Address: ${wallet.address}`);
    
    // Connect to oracle contract
    const oracleContract = new ethers.Contract(
      process.env.PREDICTION_ORACLE_ADDRESS!,
      PREDICTION_ORACLE_ABI,
      provider
    );

    console.log("📡 Contract Details:");
    console.log(`   Oracle Address: ${process.env.PREDICTION_ORACLE_ADDRESS}`);
    
    // Check current oracle signer
    const currentOracleSigner = await oracleContract.oracleSigner();
    console.log(`   Contract Oracle Signer: ${currentOracleSigner}`);
    console.log(`   Addresses Match: ${currentOracleSigner.toLowerCase() === wallet.address.toLowerCase() ? '✅ YES' : '❌ NO'}`);

    // Test data
    const testId = 999;
    const testPrediction = 750000; // 0.75 scaled
    const testConfidence = 820000; // 0.82 scaled

    console.log("\n🧪 Test Data:");
    console.log(`   ID: ${testId}`);
    console.log(`   Prediction: ${testPrediction}`);
    console.log(`   Confidence: ${testConfidence}`);

    // Step 1: Get message hash from contract
    console.log("\n📝 Step 1: Message Hash");
    const messageHash = await oracleContract.getMessageHash(testId, testPrediction, testConfidence);
    console.log(`   Contract Message Hash: ${messageHash}`);

    // Step 2: Get Ethereum signed message hash from contract
    console.log("\n📝 Step 2: Ethereum Signed Message Hash");
    const ethSignedMessageHash = await oracleContract.getEthSignedMessageHash(messageHash);
    console.log(`   Contract Eth Signed Hash: ${ethSignedMessageHash}`);

    // Step 3: Sign the message using wallet
    console.log("\n📝 Step 3: Signing");
    console.log("   Method 1: Using wallet.signMessage()");
    const signature1 = await wallet.signMessage(ethers.getBytes(ethSignedMessageHash));
    console.log(`   Signature: ${signature1}`);
    console.log(`   Signature Length: ${signature1.length}`);

    // Step 4: Verify signature using contract's recoverSigner function
    console.log("\n📝 Step 4: Signature Recovery (Contract)");
    try {
      const recoveredAddress1 = await oracleContract.recoverSigner(ethSignedMessageHash, signature1);
      console.log(`   Recovered Address: ${recoveredAddress1}`);
      console.log(`   Recovery Matches: ${recoveredAddress1.toLowerCase() === wallet.address.toLowerCase() ? '✅ YES' : '❌ NO'}`);
    } catch (error: any) {
      console.log(`   ❌ Contract recovery failed: ${error.message}`);
    }

    // Step 5: Alternative signing method - manual EIP-191
    console.log("\n📝 Step 5: Alternative Signing Methods");
    
    // Method 2: Manual EIP-191 signing
    console.log("   Method 2: Manual EIP-191 signing");
    const manualSignature = await wallet.signMessage(ethers.getBytes(messageHash));
    console.log(`   Manual Signature: ${manualSignature}`);
    
    try {
      const recoveredAddress2 = await oracleContract.recoverSigner(messageHash, manualSignature);
      console.log(`   Recovered Address: ${recoveredAddress2}`);
      console.log(`   Recovery Matches: ${recoveredAddress2.toLowerCase() === wallet.address.toLowerCase() ? '✅ YES' : '❌ NO'}`);
    } catch (error: any) {
      console.log(`   ❌ Contract recovery failed: ${error.message}`);
    }

    // Step 6: Test different signature formats
    console.log("\n📝 Step 6: Testing Different Signature Formats");
    
    // Convert signature to bytes
    const signatureBytes = ethers.getBytes(signature1);
    console.log(`   Signature Bytes Length: ${signatureBytes.length}`);
    
    // Check if signature has proper format (65 bytes)
    if (signatureBytes.length !== 65) {
      console.log(`   ❌ Signature should be 65 bytes, got ${signatureBytes.length}`);
    } else {
      console.log(`   ✅ Signature is 65 bytes (correct)`);
    }

    // Extract v, r, s components
    const r = signature1.slice(0, 66); // 32 bytes + 0x
    const s = signature1.slice(66, 130); // 32 bytes
    const v = signature1.slice(130, 132); // 1 byte
    
    console.log(`   r: ${r} (${r.length} chars)`);
    console.log(`   s: ${s} (${s.length} chars)`);
    console.log(`   v: ${v} (${v.length} chars)`);

    // Step 7: Test contract submission with estimateGas
    console.log("\n📝 Step 7: Contract Submission Test");
    const contractWithSigner = oracleContract.connect(wallet);
    
    try {
      console.log("   Testing with Method 1 signature...");
      const gasEstimate1 = await contractWithSigner.submitPrediction.estimateGas(
        testId,
        testPrediction,
        testConfidence,
        signature1
      );
      console.log(`   ✅ Gas Estimate: ${gasEstimate1.toString()}`);
    } catch (error: any) {
      console.log(`   ❌ Method 1 failed: ${error.reason || error.message}`);
    }

    try {
      console.log("   Testing with Method 2 signature...");
      const gasEstimate2 = await contractWithSigner.submitPrediction.estimateGas(
        testId,
        testPrediction,
        testConfidence,
        manualSignature
      );
      console.log(`   ✅ Gas Estimate: ${gasEstimate2.toString()}`);
    } catch (error: any) {
      console.log(`   ❌ Method 2 failed: ${error.reason || error.message}`);
    }

    // Step 8: Debug the exact signing process
    console.log("\n📝 Step 8: Debug Signing Process");
    
    // What the contract expects vs what we're sending
    console.log("   Contract expects EIP-191 signed message:");
    console.log(`     keccak256("\\x19Ethereum Signed Message:\\n32" + messageHash)`);
    
    // Let's manually create the EIP-191 message
    const eip191Prefix = "\x19Ethereum Signed Message:\n32";
    const manualEip191Message = ethers.concat([
      ethers.toUtf8Bytes(eip191Prefix),
      ethers.getBytes(messageHash)
    ]);
    const manualEip191Hash = ethers.keccak256(manualEip191Message);
    
    console.log(`   Manual EIP-191 Hash: ${manualEip191Hash}`);
    console.log(`   Matches Contract: ${manualEip191Hash === ethSignedMessageHash ? '✅ YES' : '❌ NO'}`);

    // Sign the manual EIP-191 message
    const manualEip191Signature = await wallet.signMessage(ethers.getBytes(messageHash));
    console.log(`   Manual EIP-191 Signature: ${manualEip191Signature}`);

    try {
      const recoveredAddress3 = await oracleContract.recoverSigner(messageHash, manualEip191Signature);
      console.log(`   Recovered Address: ${recoveredAddress3}`);
      console.log(`   Recovery Matches: ${recoveredAddress3.toLowerCase() === wallet.address.toLowerCase() ? '✅ YES' : '❌ NO'}`);
    } catch (error: any) {
      console.log(`   ❌ Contract recovery failed: ${error.message}`);
    }

    console.log("\n🔍 Summary:");
    console.log("   The issue appears to be in the signature verification process.");
    console.log("   The contract and wallet addresses match, but signature recovery fails.");
    console.log("   This suggests either:");
    console.log("   1. The contract's recoverSigner function has a bug");
    console.log("   2. The signing format differs from what the contract expects");
    console.log("   3. There's an issue with the EIP-191 implementation");

  } catch (error: any) {
    console.log(`\n❌ Test failed:`);
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the test
testSignatureVerification().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});