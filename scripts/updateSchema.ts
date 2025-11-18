// scripts/updateSchema.ts
import fs from "fs";
import path from "path";
import { connectDB, pg } from "../src/store";

/**
 * Database migration script to add reasoning column to ai_signals table
 * 
 * Usage:
 * DATABASE_URL=postgresql://... bun run scripts/updateSchema.ts
 */

async function updateSchema() {
  console.log("Starting database schema update...");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is required");
    process.exit(1);
  }

  try {
    await connectDB();
    console.log("Connected to database");

    // Check if reasoning column already exists
    const checkResult = await pg.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ai_signals' AND column_name = 'reasoning'
    `);

    if (checkResult.rows.length > 0) {
      console.log("✅ Reasoning column already exists in ai_signals table");
    } else {
      // Add reasoning column
      console.log("Adding reasoning column to ai_signals table...");
      await pg.query(`
        ALTER TABLE ai_signals 
        ADD COLUMN reasoning TEXT
      `);
      console.log("✅ Successfully added reasoning column to ai_signals table");
    }

    // Verify the schema matches the expected structure
    const tableInfo = await pg.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'ai_signals'
      ORDER BY ordinal_position
    `);

    console.log("\n📊 Current ai_signals table structure:");
    console.log("=======================================");
    tableInfo.rows.forEach((row: any) => {
      console.log(`  ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check if we have any existing data that needs reasoning
    const existingSignals = await pg.query(`
      SELECT COUNT(*) as total, COUNT(reasoning) as with_reasoning
      FROM ai_signals
    `);

    const total = parseInt(existingSignals.rows[0].total);
    const withReasoning = parseInt(existingSignals.rows[0].with_reasoning);

    console.log(`\n📈 Data statistics:`);
    console.log(`   Total signals: ${total}`);
    console.log(`   Signals with reasoning: ${withReasoning}`);
    console.log(`   Signals missing reasoning: ${total - withReasoning}`);

    if (total > 0 && withReasoning === 0) {
      console.log("\n⚠️  Note: Existing signals don't have reasoning data.");
      console.log("   You may want to reprocess them using the workflow script.");
    }

    console.log("\n✅ Schema update completed successfully!");

  } catch (error) {
    console.error("❌ Error updating schema:", error);
    process.exit(1);
  } finally {
    try {
      await pg.end();
      console.log("Database connection closed.");
    } catch (e) {
      // ignore
    }
  }
}

// Run the migration
updateSchema().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});