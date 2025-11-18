// scripts/setupOracleSigner.ts
import { ethers } from "ethers";
import { connectDB, pg } from "../src/store";

// ABI for PredictionOracle contract
const PREDICTION_ORACLE_ABI = [
  "function oracleSigner() public view returns (address)",
  "function setOracleSigner(address newSigner) external",
  "function getMessageHash(uint256 id, uint256 prediction, uint256 confidence) public pure returns (bytes32)",
  "function getEthSignedMessageHash(bytes32 messageHash) public pure returns (bytes32)"
];

// ABI for PredictionMarket contract
const PREDICTION_MARKET_ABI = [
  "function oracleSigner() public view returns (address)",
  "function setOracleSigner(address s) external"
];

async function setupOracleSigner() {
  console.log("🔧 Setting up Oracle Signer");
  console.log("===========================\n");

  // Check required environment variables
  const requiredEnvVars = [
    'RPC_URL',
    'PREDICTION_ORACLE_ADDRESS',
    'PREDICTION_MARKET_ADDRESS'
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
    
    // Check if we have a private key
    let oraclePrivateKey = process.env.ORACLE_PRIVATE_KEY;
    let wallet: ethers.Wallet;

    if (oraclePrivateKey) {
      wallet = new ethers.Wallet(oraclePrivateKey, provider);
      console.log(`✅ Using existing private key`);
      console.log(`   Oracle address: ${wallet.address}`);
    } else {
      // Generate new private key
      wallet = ethers.Wallet.createRandom().connect(provider);
      oraclePrivateKey = wallet.privateKey;
      console.log(`🔑 Generated new private key`);
      console.log(`   Oracle address: ${wallet.address}`);
      console.log(`   Private key: ${oraclePrivateKey}`);
      console.log(`\n⚠️  IMPORTANT: Save this private key securely!`);
    }

    // Connect to contracts
    const oracleContract = new ethers.Contract(
      process.env.PREDICTION_ORACLE_ADDRESS!,
      PREDICTION_ORACLE_ABI,
      provider
    );

    const marketContract = new ethers.Contract(
      process.env.PREDICTION_MARKET_ADDRESS!,
      PREDICTION_MARKET_ABI,
      provider
    );

    console.log(`\n📡 Connected to contracts:`);
    console.log(`   Oracle: ${process.env.PREDICTION_ORACLE_ADDRESS}`);
    console.log(`   Market: ${process.env.PREDICTION_MARKET_ADDRESS}`);

    // Check current oracle signer
    const currentOracleSigner = await oracleContract.oracleSigner();
    const currentMarketSigner = await marketContract.oracleSigner();

    console.log(`\n📋 Current Configuration:`);
    console.log(`   Oracle Contract Signer: ${currentOracleSigner}`);
    console.log(`   Market Contract Signer: ${currentMarketSigner}`);
    console.log(`   Your Wallet Address: ${wallet.address}`);

    // Check if signer needs to be updated
    const oracleNeedsUpdate = currentOracleSigner.toLowerCase() !== wallet.address.toLowerCase();
    const marketNeedsUpdate = currentMarketSigner.toLowerCase() !== wallet.address.toLowerCase();

    if (!oracleNeedsUpdate && !marketNeedsUpdate) {
      console.log(`\n✅ Oracle signer is already correctly configured!`);
      console.log(`   Your private key matches the contract signers.`);
      
      // Test signature
      console.log(`\n🧪 Testing signature...`);
      const testMessageHash = await oracleContract.getMessageHash(1, 500000, 800000);
      const testEthHash = await oracleContract.getEthSignedMessageHash(testMessageHash);
      const testSignature = await wallet.signMessage(ethers.getBytes(testEthHash));
      
      console.log(`   Signature test successful!`);
      console.log(`\n🎉 Setup complete! You can now run the market-aware workflow.`);
      return;
    }

    console.log(`\n⚠️  Signer configuration needed:`);
    if (oracleNeedsUpdate) {
      console.log(`   ❌ Oracle contract signer mismatch`);
    }
    if (marketNeedsUpdate) {
      console.log(`   ❌ Market contract signer mismatch`);
    }

    // Check if we have deployer private key to update contracts
    const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
    if (!deployerPrivateKey) {
      console.log(`\n❌ DEPLOYER_PRIVATE_KEY not set`);
      console.log(`   To update contract signers, you need the deployer's private key`);
      console.log(`   Alternatively, deploy new contracts with the correct oracle signer`);
      console.log(`\n📝 Next steps:`);
      console.log(`   1. Set ORACLE_PRIVATE_KEY=${oraclePrivateKey}`);
      console.log(`   2. Update contracts with oracle signer: ${wallet.address}`);
      process.exit(1);
    }

    // Update contract signers
    const deployerWallet = new ethers.Wallet(deployerPrivateKey, provider);
    console.log(`\n🔄 Updating contract signers with deployer: ${deployerWallet.address}`);

    if (oracleNeedsUpdate) {
      console.log(`   Updating Oracle contract signer...`);
      const oracleWithSigner = oracleContract.connect(deployerWallet);
      const tx = await oracleWithSigner.setOracleSigner(wallet.address);
      console.log(`      Transaction: ${tx.hash}`);
      await tx.wait();
      console.log(`      ✅ Oracle signer updated`);
    }

    if (marketNeedsUpdate) {
      console.log(`   Updating Market contract signer...`);
      const marketWithSigner = marketContract.connect(deployerWallet);
      const tx = await marketWithSigner.setOracleSigner(wallet.address);
      console.log(`      Transaction: ${tx.hash}`);
      await tx.wait();
      console.log(`      ✅ Market signer updated`);
    }

    // Verify updates
    const newOracleSigner = await oracleContract.oracleSigner();
    const newMarketSigner = await marketContract.oracleSigner();

    console.log(`\n✅ Verification:`);
    console.log(`   New Oracle Signer: ${newOracleSigner}`);
    console.log(`   New Market Signer: ${newMarketSigner}`);
    console.log(`   Your Wallet: ${wallet.address}`);

    if (newOracleSigner.toLowerCase() === wallet.address.toLowerCase() && 
        newMarketSigner.toLowerCase() === wallet.address.toLowerCase()) {
      console.log(`\n🎉 Setup completed successfully!`);
      
      // Save private key to .env format
      console.log(`\n📝 Add to your .env file:`);
      console.log(`ORACLE_PRIVATE_KEY=${oraclePrivateKey}`);
      
      console.log(`\n🚀 You can now run the market-aware workflow!`);
    } else {
      console.log(`\n❌ Setup failed - signers don't match`);
    }

  } catch (error) {
    console.error("❌ Error during setup:", error);
    process.exit(1);
  }
}

// Helper function to validate Ethereum address
function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Run the setup
setupOracleSigner().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});