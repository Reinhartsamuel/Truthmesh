// scripts/checkReasoning.ts
import { connectDB, pg } from "../src/store";

async function checkReasoningData() {
  console.log("🔍 Checking reasoning data in database...\n");

  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL environment variable is required");
    process.exit(1);
  }

  try {
    await connectDB();
    console.log("✅ Connected to database\n");

    // Check total signals and those with reasoning
    const statsResult = await pg.query(`
      SELECT 
        COUNT(*) as total_signals,
        COUNT(reasoning) as signals_with_reasoning,
        COUNT(*) - COUNT(reasoning) as signals_missing_reasoning
      FROM ai_signals
    `);

    const stats = statsResult.rows[0];
    console.log("📊 Signal Statistics:");
    console.log(`   Total signals: ${stats.total_signals}`);
    console.log(`   Signals with reasoning: ${stats.signals_with_reasoning}`);
    console.log(`   Signals missing reasoning: ${stats.signals_missing_reasoning}\n`);

    // Get recent signals with reasoning
    const recentWithReasoning = await pg.query(`
      SELECT 
        id,
        category,
        summary,
        reasoning,
        confidence,
        relevance,
        created_at
      FROM ai_signals 
      WHERE reasoning IS NOT NULL 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log("📝 Recent signals with reasoning:");
    console.log("==================================");

    if (recentWithReasoning.rows.length === 0) {
      console.log("   No signals with reasoning found yet.\n");
    } else {
      recentWithReasoning.rows.forEach((signal: any, index: number) => {
        console.log(`\n${index + 1}. Signal ID: ${signal.id}`);
        console.log(`   Category: ${signal.category}`);
        console.log(`   Summary: ${signal.summary}`);
        console.log(`   Confidence: ${signal.confidence}`);
        console.log(`   Relevance: ${signal.relevance}`);
        console.log(`   Created: ${new Date(signal.created_at).toLocaleString()}`);
        console.log(`   Reasoning: ${signal.reasoning}`);
      });
      console.log();
    }

    // Get recent signals without reasoning
    const recentWithoutReasoning = await pg.query(`
      SELECT 
        id,
        category,
        summary,
        confidence,
        relevance,
        created_at
      FROM ai_signals 
      WHERE reasoning IS NULL 
      ORDER BY created_at DESC 
      LIMIT 3
    `);

    if (recentWithoutReasoning.rows.length > 0) {
      console.log("⚠️  Recent signals missing reasoning:");
      console.log("=====================================");
      recentWithoutReasoning.rows.forEach((signal: any, index: number) => {
        console.log(`   ${index + 1}. ID: ${signal.id}, Category: ${signal.category}, Created: ${new Date(signal.created_at).toLocaleString()}`);
      });
      console.log();
    }

    // Check by category
    const categoryStats = await pg.query(`
      SELECT 
        category,
        COUNT(*) as total,
        COUNT(reasoning) as with_reasoning,
        ROUND((COUNT(reasoning)::numeric / COUNT(*)::numeric * 100)::numeric, 1) as reasoning_percentage
      FROM ai_signals 
      GROUP BY category 
      ORDER BY total DESC
    `);

    console.log("📈 Reasoning by Category:");
    console.log("=========================");
    categoryStats.rows.forEach((cat: any) => {
      console.log(`   ${cat.category}: ${cat.with_reasoning}/${cat.total} (${cat.reasoning_percentage}%)`);
    });

  } catch (error) {
    console.error("❌ Error checking reasoning data:", error);
    process.exit(1);
  } finally {
    try {
      await pg.end();
      console.log("\n✅ Database connection closed");
    } catch (e) {
      // ignore
    }
  }
}

// Run the check
checkReasoningData().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});