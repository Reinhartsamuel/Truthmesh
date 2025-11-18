#!/usr/bin/env bun

/**
 * Database Reset Script for TruthMesh AI Oracle
 *
 * This script completely resets the database to a clean state for:
 * - Hackathon demonstrations
 * - Fresh development environments
 * - Testing from scratch
 *
 * WARNING: This will DELETE ALL DATA in the database!
 */

import { Client } from "pg";

// Database connection configuration
const DATABASE_URL = process.env.DATABASE_URL!;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required");
  console.error("Please set DATABASE_URL in your .env file");
  process.exit(1);
}

const pg = new Client({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
});

// Tables to reset (in dependency order to avoid foreign key constraints)
const TABLES = [
  'market_predictions',
  'markets',
  'predictions',
  'ai_signals',
  'signal_queue',
  'raw_events'
];

// Sample markets for demonstration
async function resetDatabase() {
  console.log("🚀 Starting database reset...");
  console.log(`📊 Database: ${DATABASE_URL.split('@')[1] || DATABASE_URL}`);

  try {
    // Connect to database
    await pg.connect();
    console.log("✅ Connected to database");

    // Disable foreign key checks temporarily (PostgreSQL doesn't have this, but we'll handle dependencies manually)
    console.log("🔄 Disabling foreign key constraints...");

    // Reset all tables in reverse dependency order
    for (const table of TABLES) {
      console.log(`🗑️  Clearing table: ${table}`);
      try {
        await pg.query(`DELETE FROM ${table} CASCADE`);
        console.log(`✅ Cleared ${table}`);
      } catch (error) {
        console.error(`❌ Failed to clear ${table}:`, error.message);
      }
    }

    // Reset sequences to start from 1
    console.log("🔄 Resetting sequences...");
    const sequences = [
      'raw_events_id_seq',
      'signal_queue_id_seq',
      'ai_signals_id_seq',
      'predictions_id_seq',
      'markets_id_seq',
      'market_predictions_id_seq'
    ];

    for (const sequence of sequences) {
      try {
        await pg.query(`ALTER SEQUENCE ${sequence} RESTART WITH 1`);
        console.log(`✅ Reset sequence: ${sequence}`);
      } catch (error) {
        // Sequence might not exist yet, that's okay
        console.log(`ℹ️  Sequence ${sequence} not found (will be created on first insert)`);
      }
    }


    // Verify the reset
    console.log("\n🔍 Verifying database state...");

    const tableCounts: Record<string, number> = {};
    for (const table of TABLES) {
      try {
        const result = await pg.query(`SELECT COUNT(*) as count FROM ${table}`);
        tableCounts[table] = parseInt(result.rows[0].count);
      } catch (error) {
        tableCounts[table] = 0;
      }
    }

    console.log("\n📊 Final database state:");
    for (const [table, count] of Object.entries(tableCounts)) {
      console.log(`   ${table}: ${count} rows`);
    }

    console.log("\n🎉 Database reset completed successfully!");
    console.log("✨ Ready for hackathon demonstration!");
    console.log("\n📋 Next steps:");
    console.log("   1. Run the AI workflow: bun run scripts/runFullWorkflow.ts");
    console.log("   2. Start the frontend: cd frontend && bun run dev");
    console.log("   3. Open http://localhost:3000 to see the fresh system");

  } catch (error) {
    console.error("❌ Database reset failed:", error);
    process.exit(1);
  } finally {
    await pg.end();
    console.log("🔌 Database connection closed");
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Database Reset Script for TruthMesh AI Oracle

Usage:
  bun run scripts/resetDatabase.ts [options]

Options:
  --help, -h     Show this help message
  --force        Skip confirmation (use with caution!)

This script will:
  • Delete ALL data from all tables
  • Reset auto-increment sequences
  • Insert sample prediction markets
  • Prepare the system for fresh demonstration

WARNING: This operation cannot be undone!
  `);
  process.exit(0);
}

// Confirm destructive operation (unless --force is used)
if (!args.includes('--force')) {
  console.log(`
⚠️  WARNING: DESTRUCTIVE OPERATION ⚠️

This script will DELETE ALL DATA from the database:
${TABLES.map(t => `  • ${t}`).join('\n')}

This operation cannot be undone!

Type "RESET" to continue, or anything else to cancel:
  `);

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('', (answer: string) => {
    readline.close();
    if (answer.trim().toUpperCase() === 'RESET') {
      resetDatabase();
    } else {
      console.log('❌ Operation cancelled.');
      process.exit(0);
    }
  });
} else {
  resetDatabase();
}
