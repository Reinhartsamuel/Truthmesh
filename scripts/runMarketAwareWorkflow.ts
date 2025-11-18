// scripts/runMarketAwareWorkflow.ts
import { connectDB, pg } from "../src/store";
import { ethers } from "ethers";
import { classifyText } from "../src/llm/classifier";
import { refineSignal } from "../src/llm/reasoner";
import { createPrediction } from "../src/workers/ai/predictionEngine";

// ABI for PredictionMarket contract
const PREDICTION_MARKET_ABI = [
  "function markets(uint256) public view returns (uint256 id, string question, uint256 lockTimestamp, uint256 resolveTimestamp, uint8 state, uint8 provisionalOutcome, uint8 finalOutcome, uint256 totalYes, uint256 totalNo, uint256 disputeDeadline, address disputeStaker, uint256 disputeBondAmount)",
  "function nextMarketId() public view returns (uint256)",
  "function getMarketState(uint256) public view returns (uint8)",
  "function resolveMarketWithOracle(uint256 marketId, uint256 oraclePredictionId) external"
];

// ABI for PredictionOracle contract
const PREDICTION_ORACLE_ABI = [
  "function submitPrediction(uint256 id, uint256 prediction, uint256 confidence, bytes signature) external",
  "function getMessageHash(uint256 id, uint256 prediction, uint256 confidence) public pure returns (bytes32)",
  "function getEthSignedMessageHash(bytes32 messageHash) public pure returns (bytes32)"
];

interface Market {
  id: string;
  contract_market_id: string;
  question: string;
  lock_timestamp: Date;
  resolve_timestamp: Date | null;
  state: string;
}

interface MarketPrediction {
  marketId: string;
  question: string;
  predictionId: number;
  predictionValue: number;
  confidence: number;
  reasoning: string;
  marketOutcome: 'Yes' | 'No';
}

const SCALE = 1_000_000; // scale floats -> integer representation

async function ensureDatabaseConnection() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  await connectDB();
  console.log("✅ Connected to database");
}

async function ensureBlockchainConnection() {
  if (!process.env.RPC_URL) {
    throw new Error("RPC_URL environment variable is required");
  }
  if (!process.env.PREDICTION_MARKET_ADDRESS) {
    throw new Error("PREDICTION_MARKET_ADDRESS environment variable is required");
  }
  if (!process.env.PREDICTION_ORACLE_ADDRESS) {
    throw new Error("PREDICTION_ORACLE_ADDRESS environment variable is required");
  }

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const marketContract = new ethers.Contract(
    process.env.PREDICTION_MARKET_ADDRESS,
    PREDICTION_MARKET_ABI,
    provider
  );

  const oracleContract = new ethers.Contract(
    process.env.PREDICTION_ORACLE_ADDRESS,
    PREDICTION_ORACLE_ABI,
    provider
  );

  console.log("✅ Connected to blockchain");
  return { provider, marketContract, oracleContract };
}

async function getActiveMarkets(): Promise<Market[]> {
  console.log("📊 Fetching active markets from database...");

  const result = await pg.query(`
    SELECT id, contract_market_id, question, lock_timestamp, resolve_timestamp, state
    FROM markets
    WHERE state IN ('Open', 'Closed')
    ORDER BY lock_timestamp ASC
  `);

  console.log(`📈 Found ${result.rows.length} active markets`);
  return result.rows;
}

async function ingestRelevantEvents(markets: Market[]) {
  console.log("📥 Ingesting events relevant to market questions...");

  // Extract key topics from market questions for event filtering
  const marketTopics = new Set<string>();
  markets.forEach(market => {
    // Simple keyword extraction from questions
    const keywords = market.question.toLowerCase()
      .split(/[^a-zA-Z0-9]/)
      .filter(word => word.length > 3)
      .filter(word => !['will', 'this', 'that', 'with', 'from', 'into', 'over'].includes(word));

    keywords.forEach(keyword => marketTopics.add(keyword));
  });

  console.log(`🔍 Monitoring topics: ${Array.from(marketTopics).slice(0, 10).join(', ')}...`);

  // Sample events that would be relevant to our markets
  const relevantEvents = [
    {
      source: "newsapi",
      text: "Bitcoin surges past $95,000 as institutional adoption accelerates",
      content_hash: "btc_surge_" + Date.now()
    },
    {
      source: "newsapi",
      text: "Ethereum Foundation announces successful completion of latest protocol upgrade",
      content_hash: "eth_upgrade_" + Date.now()
    },
    {
      source: "newsapi",
      text: "SEC delays decision on Ethereum ETF applications until next quarter",
      content_hash: "sec_eth_etf_" + Date.now()
    },
    {
      source: "newsapi",
      text: "DeFi total value locked reaches $150 billion milestone",
      content_hash: "defi_tvl_" + Date.now()
    },
    {
      source: "newsapi",
      text: "Major crypto exchange faces regulatory scrutiny over compliance issues",
      content_hash: "exchange_regulation_" + Date.now()
    }
  ];

  // Queue events for processing
  for (const event of relevantEvents) {
    try {
      // Insert raw event
      const eventResult = await pg.query(`
        INSERT INTO raw_events (source, text, content_hash)
        VALUES ($1, $2, $3)
        ON CONFLICT (content_hash) DO NOTHING
        RETURNING id
      `, [event.source, event.text, event.content_hash]);

      if (eventResult.rows.length > 0) {
        const rawEventId = eventResult.rows[0].id;

        // Queue for signal processing
        await pg.query(`
          INSERT INTO signal_queue (raw_event_id)
          VALUES ($1)
        `, [rawEventId]);

        console.log(`📝 Queued event: ${event.text.substring(0, 60)}...`);
      }
    } catch (error) {
      console.error("❌ Error ingesting event:", error);
    }
  }
}

async function processSignalsForMarkets(markets: Market[]) {
  console.log("🤖 Processing signals for market relevance...");

  // Process pending signals from queue
  const pendingSignals = await pg.query(`
    SELECT q.id as queue_id, r.id as raw_id, r.text
    FROM signal_queue q
    JOIN raw_events r ON r.id = q.raw_event_id
    WHERE q.processed = false
    ORDER BY q.enqueued_at ASC
    LIMIT 10
  `);

  console.log(`🔄 Processing ${pendingSignals.rows.length} pending signals`);

  for (const row of pendingSignals.rows) {
    try {
      const { raw_id, queue_id, text } = row;

      // Check if already processed
      const exists = await pg.query(
        `SELECT 1 FROM ai_signals WHERE raw_event_id = $1 LIMIT 1`,
        [raw_id]
      );

      if (exists.rows.length > 0) {
        await pg.query(`UPDATE signal_queue SET processed = true WHERE id = $1`, [queue_id]);
        continue;
      }

      // Process with AI
      const { category, relevance } = await classifyText(text);
      const { summary, confidence, reasoning } = await refineSignal(text, category);

      // Store AI signal
      await pg.query(`
        INSERT INTO ai_signals
        (raw_event_id, category, relevance, confidence, summary, reasoning, model_metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        raw_id,
        category,
        relevance,
        confidence,
        summary,
        reasoning,
        JSON.stringify({ model: "gpt-4o-mini", market_aware: true })
      ]);

      // Mark as processed
      await pg.query(`UPDATE signal_queue SET processed = true WHERE id = $1`, [queue_id]);

      console.log(`✅ Processed signal: ${category} (conf: ${confidence})`);

    } catch (error) {
      console.error("❌ Error processing signal:", error);
    }
  }
}

async function generateMarketPredictions(markets: Market[]): Promise<MarketPrediction[]> {
  console.log("🎯 Generating predictions for specific markets...");

  const marketPredictions: MarketPrediction[] = [];

  // Get recent AI signals
  const recentSignals = await pg.query(`
    SELECT s.id, s.category, s.relevance, s.confidence, s.summary, s.reasoning, r.text
    FROM ai_signals s
    JOIN raw_events r ON s.raw_event_id = r.id
    WHERE s.id NOT IN (SELECT signal_id FROM predictions)
    ORDER BY s.created_at DESC
    LIMIT 20
  `);

  console.log(`📊 Using ${recentSignals.rows.length} recent signals for predictions`);

  for (const market of markets) {
    // Find signals relevant to this market's question
    const relevantSignals = recentSignals.rows.filter(signal => {
      const marketLower = market.question.toLowerCase();
      const signalLower = signal.text.toLowerCase();

      // Simple relevance matching - in production this would use embeddings
      const marketWords = marketLower.split(/[^a-zA-Z0-9]/).filter(w => w.length > 3);
      const signalWords = signalLower.split(/[^a-zA-Z0-9]/).filter(w => w.length > 3);

      const matchingWords = marketWords.filter(word =>
        signalWords.some(signalWord => signalWord.includes(word) || word.includes(signalWord))
      );

      return matchingWords.length > 0;
    });

    if (relevantSignals.length === 0) {
      console.log(`   ⏭️  No relevant signals for market: ${market.question.substring(0, 50)}...`);
      continue;
    }

    console.log(`   🔍 Market: ${market.question.substring(0, 50)}...`);
    console.log(`      Found ${relevantSignals.length} relevant signals`);

    // Use the most relevant signal for prediction
    const bestSignal = relevantSignals[0];

    // Create prediction
    const prediction = createPrediction({
      id: bestSignal.id,
      category: bestSignal.category,
      relevance: bestSignal.relevance,
      confidence: bestSignal.confidence,
      summary: bestSignal.summary,
    });

    // Store prediction
    const predictionResult = await pg.query(`
      INSERT INTO predictions (signal_id, category, summary, prediction_value)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [
      prediction.signal_id,
      prediction.category,
      prediction.summary,
      prediction.prediction_value
    ]);

    const predictionId = predictionResult.rows[0].id;

    // Determine market outcome based on prediction value
    // For binary markets: > 0.5 = Yes, <= 0.5 = No
    const marketOutcome: 'Yes' | 'No' = prediction.prediction_value > 0.5 ? 'Yes' : 'No';

    // Link prediction to market
    await pg.query(`
      INSERT INTO market_predictions
      (market_id, prediction_id, market_outcome, confidence)
      VALUES ($1, $2, $3, $4)
    `, [
      market.id,
      predictionId,
      marketOutcome,
      bestSignal.confidence
    ]);

    marketPredictions.push({
      marketId: market.contract_market_id,
      question: market.question,
      predictionId,
      predictionValue: prediction.prediction_value,
      confidence: bestSignal.confidence,
      reasoning: bestSignal.reasoning,
      marketOutcome
    });

    console.log(`   ✅ Generated prediction: ${marketOutcome} (${(prediction.prediction_value * 100).toFixed(1)}%)`);
  }

  return marketPredictions;
}

async function submitPredictionsToChain(marketPredictions: MarketPrediction[]) {
  if (!process.env.ORACLE_PRIVATE_KEY) {
    console.log("⚠️  ORACLE_PRIVATE_KEY not set - skipping chain submission");
    return;
  }

  console.log("⛓️  Submitting predictions to blockchain...");

  const { provider, oracleContract } = await ensureBlockchainConnection();
  const wallet = new ethers.Wallet(process.env.ORACLE_PRIVATE_KEY, provider);

  let submittedCount = 0;

  for (const mp of marketPredictions) {
    try {
      // Scale prediction values for on-chain storage
      const scaledPred = Math.round(mp.predictionValue * SCALE);
      const scaledConf = Math.round(mp.confidence * SCALE);

      // Sign the prediction
      const messageHash = await oracleContract.getMessageHash(
        mp.predictionId,
        scaledPred,
        scaledConf
      );

      const signature = await wallet.signMessage(ethers.getBytes(messageHash));

      // Submit to oracle contract
      const contractWithSigner = oracleContract.connect(wallet);
      const tx = await contractWithSigner.submitPrediction(
        mp.predictionId,
        scaledPred,
        scaledConf,
        signature
      );

      console.log(`   📝 Submitted prediction ${mp.predictionId} for market ${mp.marketId}`);
      console.log(`      Outcome: ${mp.marketOutcome}, Confidence: ${(mp.confidence * 100).toFixed(1)}%`);
      console.log(`      TX: ${tx.hash}`);

      // Update database with submission info
      await pg.query(`
        UPDATE market_predictions
        SET submitted_to_chain = true, chain_tx_hash = $1
        WHERE prediction_id = $2 AND market_id = $3
      `, [tx.hash, mp.predictionId, mp.marketId]);

      submittedCount++;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`   ❌ Failed to submit prediction for market ${mp.marketId}:`, error.message);
    }
  }

  console.log(`✅ Submitted ${submittedCount} predictions to blockchain`);
}

async function main() {
  console.log("🚀 Starting Market-Aware Prediction Workflow");
  console.log("============================================");

  try {
    // Step 1: Setup connections
    await ensureDatabaseConnection();
    await ensureBlockchainConnection();

    // Step 2: Get active markets
    const markets = await getActiveMarkets();
    if (markets.length === 0) {
      console.log("❌ No active markets found. Please create markets first.");
      process.exit(1);
    }

    // Step 3: Ingest relevant events
    await ingestRelevantEvents(markets);

    // Step 4: Process signals
    await processSignalsForMarkets(markets);

    // Step 5: Generate market-specific predictions
    const marketPredictions = await generateMarketPredictions(markets);

    if (marketPredictions.length === 0) {
      console.log("⚠️  No market predictions generated - insufficient relevant data");
      return;
    }

    // Step 6: Submit to blockchain
    await submitPredictionsToChain(marketPredictions);

    console.log("\n🎉 Market-aware workflow completed successfully!");
    console.log(`📊 Generated ${marketPredictions.length} market-specific predictions`);

  } catch (error) {
    console.error("❌ Workflow failed:", error);
    process.exit(1);
  } finally {
    try {
      await pg.end();
      console.log("🔌 Database connection closed");
    } catch (e) {
      // ignore
    }
  }
}

// Run the workflow
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
