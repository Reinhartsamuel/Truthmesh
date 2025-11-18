// scripts/runPredictionWorker.ts
import { connectDB, pg } from "../src/store";
import { runPredictionWorkerOnce } from "../src/workers/ai/predictionWorker";

async function main() {
  console.log("Starting prediction worker...");
  
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  try {
    await connectDB();
    console.log("Connected to database");

    // Check how many signals need to be processed
    const pendingSignals = await pg.query(`
      SELECT COUNT(*) as count 
      FROM ai_signals 
      WHERE id NOT IN (SELECT signal_id FROM predictions)
    `);
    
    const count = parseInt(pendingSignals.rows[0].count);
    console.log(`Found ${count} signals pending prediction generation`);

    if (count === 0) {
      console.log("No pending signals to process");
      return;
    }

    // Process signals in batches
    const BATCH_SIZE = 10;
    let processed = 0;
    
    for (let i = 0; i < Math.min(count, BATCH_SIZE); i++) {
      try {
        await runPredictionWorkerOnce();
        processed++;
        console.log(`Processed ${processed}/${count} signals`);
      } catch (error) {
        console.error(`Error processing signal:`, error);
      }
    }

    console.log(`✅ Successfully processed ${processed} signals into predictions`);

    // Show the new predictions
    const newPredictions = await pg.query(`
      SELECT p.id, p.category, p.summary, p.prediction_value, s.reasoning
      FROM predictions p
      JOIN ai_signals s ON p.signal_id = s.id
      ORDER BY p.id DESC
      LIMIT ${processed}
    `);

    console.log("\n📊 New Predictions Created:");
    console.log("==========================");
    newPredictions.rows.forEach((pred: any, index: number) => {
      console.log(`\n${index + 1}. Prediction ID: ${pred.id}`);
      console.log(`   Category: ${pred.category}`);
      console.log(`   Summary: ${pred.summary}`);
      console.log(`   Prediction Value: ${pred.prediction_value}`);
      console.log(`   Reasoning: ${pred.reasoning ? pred.reasoning.substring(0, 100) + '...' : 'No reasoning'}`);
    });

  } catch (error) {
    console.error("❌ Error running prediction worker:", error);
    process.exit(1);
  } finally {
    try {
      await pg.end();
      console.log("\nDatabase connection closed");
    } catch (e) {
      // ignore
    }
  }
}

// Run the worker
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});