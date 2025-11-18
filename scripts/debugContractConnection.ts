// scripts/debugContractConnection.ts
import { ethers } from "ethers";

// ABI for PredictionMarket contract
const PREDICTION_MARKET_ABI = [
  "function createMarket(string question, uint256 lockTimestamp, uint256 resolveTimestamp) external returns (uint256)",
  "function markets(uint256) public view returns (uint256 id, string question, uint256 lockTimestamp, uint256 resolveTimestamp, uint8 state, uint8 provisionalOutcome, uint8 finalOutcome, uint256 totalYes, uint256 totalNo, uint256 disputeDeadline, address disputeStaker, uint256 disputeBondAmount)",
  "function nextMarketId() external view returns (uint256)",
  "event MarketCreated(uint256 indexed id, string question, uint256 lockTimestamp)"
];

async function debugContractConnection() {
  console.log("🔧 Debugging Contract Connection");
  console.log("===============================\n");

  // Validate environment variables
  const requiredEnvVars = [
    'RPC_URL',
    'PREDICTION_MARKET_ADDRESS',
    'DEPLOYER_PRIVATE_KEY'
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ ${envVar} environment variable is required`);
      process.exit(1);
    }
  }

  console.log("📋 Environment Variables:");
  console.log(`   RPC_URL: ${process.env.RPC_URL}`);
  console.log(`   PREDICTION_MARKET_ADDRESS: ${process.env.PREDICTION_MARKET_ADDRESS}`);
  console.log(`   DEPLOYER_PRIVATE_KEY: ${process.env.DEPLOYER_PRIVATE_KEY ? 'SET' : 'NOT SET'}`);
  console.log();

  try {
    // Connect to blockchain
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
    
    console.log("👤 Wallet Details:");
    console.log(`   Address: ${wallet.address}`);
    console.log(`   Network: ${(await provider.getNetwork()).name} (chainId: ${(await provider.getNetwork()).chainId})`);
    console.log();

    // Check provider connection
    console.log("🔗 Testing Provider Connection...");
    const blockNumber = await provider.getBlockNumber();
    console.log(`   ✅ Connected to blockchain at block: ${blockNumber}`);
    console.log();

    // Test contract connection
    console.log("📡 Testing Contract Connection...");
    const contract = new ethers.Contract(
      process.env.PREDICTION_MARKET_ADDRESS!,
      PREDICTION_MARKET_ABI,
      wallet
    );

    console.log(`   Contract address: ${process.env.PREDICTION_MARKET_ADDRESS}`);

    // Test different contract functions
    console.log("\n🧪 Testing Contract Functions:");

    // Test 1: Try to get nextMarketId
    try {
      console.log("   1. Testing nextMarketId()...");
      const currentMarketId = await contract.nextMarketId();
      console.log(`      ✅ Success! Current market count: ${currentMarketId}`);
    } catch (error) {
      console.log(`      ❌ Failed to call nextMarketId(): ${error.message}`);
    }

    // Test 2: Try to read a market (if any exist)
    try {
      console.log("   2. Testing markets(1)...");
      const market1 = await contract.markets(1);
      console.log(`      ✅ Success! Market 1 exists: ${market1.id ? 'Yes' : 'No'}`);
      if (market1.id) {
        console.log(`         Question: ${market1.question}`);
        console.log(`         State: ${market1.state}`);
      }
    } catch (error) {
      console.log(`      ❌ Failed to call markets(1): ${error.message}`);
    }

    // Test 3: Check owner
    try {
      console.log("   3. Testing owner()...");
      const owner = await contract.owner();
      console.log(`      ✅ Success! Contract owner: ${owner}`);
      console.log(`         Is deployer the owner? ${owner.toLowerCase() === wallet.address.toLowerCase() ? 'Yes' : 'No'}`);
    } catch (error) {
      console.log(`      ❌ Failed to call owner(): ${error.message}`);
    }

    // Test 4: Check contract code
    console.log("   4. Checking contract code...");
    const code = await provider.getCode(process.env.PREDICTION_MARKET_ADDRESS!);
    if (code === '0x') {
      console.log(`      ❌ No contract code at address! Contract may not be deployed.`);
    } else {
      console.log(`      ✅ Contract code exists (${code.length} bytes)`);
    }

    console.log("\n📊 Summary:");
    console.log("   The contract connection issue appears to be:");
    if (code === '0x') {
      console.log("   ❌ CONTRACT NOT DEPLOYED - No code at the specified address");
    } else {
      console.log("   ✅ Contract is deployed, but ABI/function calls may be incorrect");
    }

  } catch (error) {
    console.error("❌ Error during contract debugging:", error);
    process.exit(1);
  }
}

// Run the debug
debugContractConnection().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});