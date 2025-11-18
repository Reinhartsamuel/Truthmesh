// scripts/updateTimestamps.ts
import { connectDB, pg } from "../src/store";

async function updateTimestamps() {
  console.log("Updating prediction timestamps...");
  
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  try {
    await connectDB();
    console.log("Connected to database");

    // Update timestamps for all predictions with reasoning
    const result = await pg.query(`
      UPDATE predictions 
      SET created_at = NOW() 
      WHERE id IN (
        SELECT p.id 
        FROM predictions p
        JOIN ai_signals s ON p.signal_id = s.id
        WHERE s.reasoning IS NOT NULL
      )
    `);

    console.log(`✅ Updated ${result.rowCount} prediction timestamps`);

    // Show the updated predictions
    const updatedPredictions = await pg.query(`
      SELECT p.id, p.category, p.summary, p.prediction_value, p.created_at, s.reasoning
      FROM predictions p
      JOIN ai_signals s ON p.signal_id = s.id
      WHERE s.reasoning IS NOT NULL
      ORDER BY p.created_at DESC
      LIMIT 5
    `);

    console.log("\n📊 Updated Predictions:");
    console.log("======================");
    updatedPredictions.rows.forEach((pred: any, index: number) => {
      console.log(`\n${index + 1}. Prediction ID: ${pred.id}`);
      console.log(`   Category: ${pred.category}`);
      console.log(`   Summary: ${pred.summary}`);
      console.log(`   Prediction Value: ${pred.prediction_value}`);
      console.log(`   Created: ${new Date(pred.created_at).toLocaleString()}`);
      console.log(`   Reasoning: ${pred.reasoning ? pred.reasoning.substring(0, 100) + '...' : 'No reasoning'}`);
    });

  } catch (error) {
    console.error("❌ Error updating timestamps:", error);
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

// Run the update
updateTimestamps().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});