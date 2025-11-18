// scripts/syncMarkets.ts
import { connectDB, pg } from "../src/store";
import { ethers } from "ethers";

// ABI for PredictionMarket contract
const PREDICTION_MARKET_ABI = [
  "function markets(uint256) public view returns (uint256 id, string question, uint256 lockTimestamp, uint256 resolveTimestamp, uint8 state, uint8 provisionalOutcome, uint8 finalOutcome, uint256 totalYes, uint256 totalNo, uint256 disputeDeadline, address disputeStaker, uint256 disputeBondAmount)",
  "function nextMarketId() public view returns (uint256)",
  "function getMarketState(uint256) public view returns (uint8)",
  "event MarketCreated(uint256 indexed id, string question, uint256 lockTimestamp)"
];

// Market states from contract
const MARKET_STATES = [
  "Open",      // 0
  "Closed",    // 1
  "Provisional", // 2
  "Disputed",  // 3
  "Finalized", // 4
  "Cancelled"  // 5
];

interface MarketData {
  id: bigint;
  question: string;
  lockTimestamp: bigint;
  resolveTimestamp: bigint;
  state: number;
  provisionalOutcome: number;
  finalOutcome: number;
  totalYes: bigint;
  totalNo: bigint;
  disputeDeadline: bigint;
  disputeStaker: string;
  disputeBondAmount: bigint;
}

// scripts/syncMarkets.ts  — corrected parts only (replace original syncMarkets body)
async function syncMarkets() {
  console.log("🔄 Starting market sync from smart contract...");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
  }
  if (!process.env.RPC_URL) {
    console.error("❌ RPC_URL environment variable is required");
    process.exit(1);
  }
  if (!process.env.PREDICTION_MARKET_ADDRESS) {
    console.error("❌ PREDICTION_MARKET_ADDRESS environment variable is required");
    process.exit(1);
  }

  try {
    await connectDB();
    console.log("✅ Connected to database");

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const contract = new ethers.Contract(
      process.env.PREDICTION_MARKET_ADDRESS,
      PREDICTION_MARKET_ABI,
      provider
    );

    console.log(`📡 Connected to contract at ${process.env.PREDICTION_MARKET_ADDRESS}`);

    // nextMarketId is a BigInt (ethers v6)
    const nextMarketIdBig: bigint = await contract.nextMarketId();
    // If nextMarketId is 0n, there are no markets
    if (nextMarketIdBig === 0n) {
      console.log("ℹ️  No markets found in contract");
      return;
    }

    // Try to convert safely to Number for looping & printing
    let nextMarketIdNum: number;
    if (nextMarketIdBig > BigInt(Number.MAX_SAFE_INTEGER)) {
      console.warn("⚠️ nextMarketId is larger than Number.MAX_SAFE_INTEGER — using BigInt loop (slow).");
      // BigInt fallback loop version below will be used
      nextMarketIdNum = -1;
    } else {
      nextMarketIdNum = Number(nextMarketIdBig);
      console.log(`📊 Found ${nextMarketIdNum} total markets (ID range: 1-${nextMarketIdNum - 1})`);
    }

    let syncedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;

    // Choose loop strategy depending on conversion success
    if (nextMarketIdNum !== -1) {
      // Safe Number loop
      for (let i = 1; i < nextMarketIdNum; i++) {
        const marketId = BigInt(i); // pass BigInt to contract call
        try {
          const marketData: MarketData = await contract.markets(marketId);

          // skip if market doesn't exist (id === 0)
          if (marketData.id === 0n) continue;

          const stateName = MARKET_STATES[marketData.state] || "Unknown";
          const lockTime = new Date(Number(marketData.lockTimestamp) * 1000);
          const resolveTime = marketData.resolveTimestamp > 0n
            ? new Date(Number(marketData.resolveTimestamp) * 1000)
            : null;

          const existingMarket = await pg.query(
            "SELECT id FROM markets WHERE contract_market_id = $1",
            [marketData.id.toString()]
          );

          if (existingMarket.rows.length > 0) {
            await pg.query(
              `UPDATE markets
               SET question = $1, lock_timestamp = $2, resolve_timestamp = $3,
                   state = $4, updated_at = NOW()
               WHERE contract_market_id = $5`,
              [
                marketData.question,
                lockTime,
                resolveTime,
                stateName,
                marketData.id.toString()
              ]
            );
            updatedCount++;
          } else {
            await pg.query(
              `INSERT INTO markets
               (contract_market_id, question, lock_timestamp, resolve_timestamp, state)
               VALUES ($1, $2, $3, $4, $5)`,
              [
                marketData.id.toString(),
                marketData.question,
                lockTime,
                resolveTime,
                stateName
              ]
            );
            createdCount++;
          }

          syncedCount++;
          console.log(`✅ Synced market ${marketData.id.toString()}: "${String(marketData.question).slice(0,50)}..." (${stateName})`);
        } catch (error: any) {
          console.error(`❌ Error syncing market ${i}:`, error?.message ?? error);
        }
      }
    } else {
      // BigInt fallback loop (if nextMarketIdBig > Number.MAX_SAFE_INTEGER)
      console.log("🔁 Using BigInt loop over markets (handles huge counts).");
      for (let i = 1n; i < nextMarketIdBig; i++) {
        try {
          const marketData: MarketData = await contract.markets(i);
          if (marketData.id === 0n) continue;

          const stateName = MARKET_STATES[marketData.state] || "Unknown";
          const lockTime = new Date(Number(marketData.lockTimestamp) * 1000);
          const resolveTime = marketData.resolveTimestamp > 0n
            ? new Date(Number(marketData.resolveTimestamp) * 1000)
            : null;

          const existingMarket = await pg.query(
            "SELECT id FROM markets WHERE contract_market_id = $1",
            [marketData.id.toString()]
          );

          if (existingMarket.rows.length > 0) {
            await pg.query(
              `UPDATE markets
               SET question = $1, lock_timestamp = $2, resolve_timestamp = $3,
                   state = $4, updated_at = NOW()
               WHERE contract_market_id = $5`,
              [
                marketData.question,
                lockTime,
                resolveTime,
                stateName,
                marketData.id.toString()
              ]
            );
            updatedCount++;
          } else {
            await pg.query(
              `INSERT INTO markets
               (contract_market_id, question, lock_timestamp, resolve_timestamp, state)
               VALUES ($1, $2, $3, $4, $5)`,
              [
                marketData.id.toString(),
                marketData.question,
                lockTime,
                resolveTime,
                stateName
              ]
            );
            createdCount++;
          }

          syncedCount++;
          console.log(`✅ Synced market ${marketData.id.toString()}: "${String(marketData.question).slice(0,50)}..." (${stateName})`);
        } catch (error: any) {
          console.error(`❌ Error syncing market ${i.toString()}:`, error?.message ?? error);
        }
      }
    }

    console.log(`\n📈 Sync Summary:`);
    console.log(`   Total markets in contract: ${nextMarketIdBig.toString()}`);
    console.log(`   Successfully synced: ${syncedCount}`);
    console.log(`   New markets created: ${createdCount}`);
    console.log(`   Existing markets updated: ${updatedCount}`);

    const marketStats = await pg.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN state = 'Open' THEN 1 END) as open,
        COUNT(CASE WHEN state = 'Closed' THEN 1 END) as closed,
        COUNT(CASE WHEN state = 'Finalized' THEN 1 END) as finalized
      FROM markets
    `);

    const stats = marketStats.rows[0];
    console.log(`\n📊 Database Market Stats:`);
    console.log(`   Total: ${stats.total}`);
    console.log(`   Open: ${stats.open}`);
    console.log(`   Closed: ${stats.closed}`);
    console.log(`   Finalized: ${stats.finalized}`);

    console.log("\n✅ Market sync completed successfully!");
  } catch (error) {
    console.error("❌ Error during market sync:", error);
    process.exit(1);
  } finally {
    try {
      await pg.end();
      console.log("🔌 Database connection closed");
    } catch (e) {}
  }
}


// Run the sync
syncMarkets().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
