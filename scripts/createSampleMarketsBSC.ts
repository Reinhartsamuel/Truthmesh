// scripts/createSampleMarketsBSC.ts
import { ethers } from "ethers";

// ABI for PredictionMarket contract
const PREDICTION_MARKET_ABI = [
  "function createMarket(string question, uint256 lockTimestamp, uint256 resolveTimestamp) external returns (uint256)",
  "function markets(uint256) public view returns (uint256 id, string question, uint256 lockTimestamp, uint256 resolveTimestamp, uint8 state, uint8 provisionalOutcome, uint8 finalOutcome, uint256 totalYes, uint256 totalNo, uint256 disputeDeadline, address disputeStaker, uint256 disputeBondAmount)",
  "function nextMarketId() external view returns (uint256)",
  "function owner() external view returns (address)",
  "event MarketCreated(uint256 indexed id, string question, uint256 lockTimestamp)"
];

interface SampleMarket {
  question: string;
  lockDays: number; // Days from now until betting closes
  resolveDays: number; // Days from now until resolution
}

const SAMPLE_MARKETS: SampleMarket[] = [
  {
    question: "Will Bitcoin (BTC) price drop below $100,000 by end of November 2025?",
    lockDays: 15,
    resolveDays: 15
  },
  {
    question: "Will Ethereum (ETH) successfully complete the next major protocol upgrade?",
    lockDays: 60,
    resolveDays: 90
  },
  {
    question: "Will the SEC approve a spot Ethereum ETF in the next 6 months?",
    lockDays: 90,
    resolveDays: 180
  },
  {
    question: "Will total value locked (TVL) in DeFi protocols exceed $150 billion by Q4 2025?",
    lockDays: 120,
    resolveDays: 150
  },
  {
    question: "The Fed decision to decrease 25 bps by December 2025?",
    lockDays: 20,
    resolveDays: 30
  },
  {
    question: "Will Bitcoin mining difficulty reach 100T by end of 2025?",
    lockDays: 45,
    resolveDays: 60
  },
];

// Correct contract address for BSC Testnet (chain 97)
const BSC_TESTNET_CONTRACT_ADDRESS = "0xa2cca5a07bbed0d25543e7ef1e8a0b29e8bd4a6e";

async function createSampleMarkets() {
  console.log("🚀 Creating sample prediction markets on BSC Testnet...");

  // Validate environment variables
  const requiredEnvVars = [
    'RPC_URL',
    'DEPLOYER_PRIVATE_KEY'
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
    const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);
    const contract = new ethers.Contract(
      BSC_TESTNET_CONTRACT_ADDRESS,
      PREDICTION_MARKET_ABI,
      wallet
    );

    console.log(`📡 Connected to contract at ${BSC_TESTNET_CONTRACT_ADDRESS}`);
    console.log(`👤 Using deployer: ${wallet.address}`);
    console.log(`📊 Creating ${SAMPLE_MARKETS.length} sample markets\n`);

    // Test contract connection first
    console.log(`🔍 Testing contract connection...`);
    try {
      // Check if contract is actually deployed at this address
      const code = await provider.getCode(BSC_TESTNET_CONTRACT_ADDRESS);
      if (code === '0x') {
        console.log(`❌ No contract code at address ${BSC_TESTNET_CONTRACT_ADDRESS}!`);
        console.log(`   The contract may not be deployed on BSC Testnet.`);
        process.exit(1);
      }
      
      // Test contract owner to verify ABI
      const owner = await contract.owner();
      console.log(`✅ Contract owner: ${owner}`);
      console.log(`   Is deployer the owner? ${owner.toLowerCase() === wallet.address.toLowerCase() ? 'Yes' : 'No'}`);
      
      // Get current market count
      const currentMarketId = await contract.nextMarketId();
      console.log(`📈 Current market count: ${currentMarketId}`);
      
      let createdCount = 0;
      const failedMarkets: { question: string; error: string }[] = [];

      // Create each sample market
      for (const market of SAMPLE_MARKETS) {
        try {
          console.log(`🔄 Creating market: "${market.question}"`);

          // Calculate timestamps
          const currentTime = Math.floor(Date.now() / 1000);
          const lockTimestamp = currentTime + (market.lockDays * 24 * 60 * 60);
          const resolveTimestamp = currentTime + (market.resolveDays * 24 * 60 * 60);

          // Create market on-chain
          const tx = await contract.createMarket(
            market.question,
            lockTimestamp,
            resolveTimestamp
          );

          console.log(`   📝 Transaction sent: ${tx.hash}`);

          // Wait for confirmation
          const receipt = await tx.wait();
          console.log(`   ✅ Market created! Block: ${receipt?.blockNumber}`);

          createdCount++;

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          console.error(`   ❌ Failed to create market:`, error.message);
          failedMarkets.push({
            question: market.question,
            error: error.message
          });
        }
      }

      // Summary
      console.log(`\n📊 Creation Summary:`);
      console.log(`   ✅ Successfully created: ${createdCount}/${SAMPLE_MARKETS.length}`);
      console.log(`   ❌ Failed: ${failedMarkets.length}`);

      if (failedMarkets.length > 0) {
        console.log(`\n📋 Failed markets:`);
        failedMarkets.forEach((failed, index) => {
          console.log(`   ${index + 1}. ${failed.question}`);
          console.log(`      Error: ${failed.error}`);
        });
      }

      // Get final market count
      const finalMarketId = await contract.nextMarketId();
      const totalCreated = Number(finalMarketId) - Number(currentMarketId);
      console.log(`\n📈 Final market count: ${final
      console.log(`❌ Contract connection test failed: ${error.message}`);
      console.log(`   This suggests the contract ABI doesn't match or the address is incorrect.`);
      process.exit(1);
    }

    let createdCount = 0;
    const failedMarkets: { question: string; error: string }[] = [];

    // Create each sample market
    for (const market of SAMPLE_MARKETS) {
      try {
        console.log(`🔄 Creating market: "${market.question}"`);

        // Calculate timestamps
        const currentTime = Math.floor(Date.now() / 1000);
        const lockTimestamp = currentTime + (market.lockDays * 24 * 60 * 60);
        const resolveTimestamp = currentTime + (market.resolveDays * 24 * 60 * 60);

        // Create market on-chain
        const tx = await contract.createMarket(
          market.question,
          lockTimestamp,
          resolveTimestamp
        );

        console.log(`   📝 Transaction sent: ${tx.hash}`);

        // Wait for confirmation
        const receipt = await tx.wait();
        console.log(`   ✅ Market created! Block: ${receipt?.blockNumber}`);

        createdCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`   ❌ Failed to create market:`, error.message);
        failedMarkets.push({
          question: market.question,
          error: error.message
        });
      }
    }

    // Summary
    console.log(`\n📊 Creation Summary:`);
    console.log(`   ✅ Successfully created: ${createdCount}/${SAMPLE_MARKETS.length}`);
    console.log(`   ❌ Failed: ${failedMarkets.length}`);

    if (failedMarkets.length > 0) {
      console.log(`\n📋 Failed markets:`);
      failedMarkets.forEach((failed, index) => {
        console.log(`   ${index + 1}. ${failed.question}`);
        console.log(`      Error: ${failed.error}`);
      });
    }

    // Get final market count
    const finalMarketId = await contract.nextMarketId();
    const totalCreated = Number(finalMarketId) - Number(currentMarketId);
    console.log(`\n📈 Final market count: ${finalMarketId} (${totalCreated} new markets)`);

    console.log("\n🎉 Sample market creation completed!");

  } catch (error) {
    console.error("❌ Error during market creation:", error);
    process.exit(1);
  }
}

// Helper function to format dates for display
function formatDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString();
}

// Display sample markets before creating
console.log("📋 Sample Markets to be Created:");
console.log("================================");
SAMPLE_MARKETS.forEach((market, index) => {
  console.log(`${index + 1}. ${market.question}`);
  console.log(`   🔒 Lock: ${formatDaysFromNow(market.lockDays)} (${market.lockDays} days)`);
  console.log(`   🎯 Resolve: ${formatDaysFromNow(market.resolveDays)} (${market.resolveDays} days)`);
  console.log();
});

// Run the creation
createSampleMarkets().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});