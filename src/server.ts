// src/server.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { pg, connectDB } from "./store";

const app = new Hono();
connectDB();

// Enable CORS for frontend
//
//
app.use('/*', cors());

app.get("/", (c) => c.text("TruthMesh — healthy"));
app.get("/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));

// Test API endpoint
app.get("/api/test", (c) => {
  return c.json({
    message: "API is working",
    timestamp: new Date().toISOString(),
    endpoints: [
      "/api/events",
      "/api/signals",
      "/api/predictions",
      "/api/stats"
    ]
  });
});

// Get recent raw events
app.get("/api/events", async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    console.log(`Fetching events: limit=${limit}, offset=${offset}`);


    const res = await pg.query(`
      SELECT id, source, source_id, title, text, url, metadata, inserted_at
      FROM raw_events
      ORDER BY inserted_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    console.log(`Found ${res.rows.length} events`);

    return c.json({
      events: res.rows,
      total: res.rows.length
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return c.json({ error: "Failed to fetch events: " + error.message }, 500);
  }
});
// Get prediction markets


// Get AI signals with their raw events
app.get("/api/signals", async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    console.log(`Fetching signals: limit=${limit}, offset=${offset}`);


    const res = await pg.query(`
      SELECT
        s.id, s.category, s.relevance, s.confidence, s.summary, s.reasoning, s.created_at,
        r.source, r.title, r.text, r.url
      FROM ai_signals s
      JOIN raw_events r ON s.raw_event_id = r.id
      ORDER BY s.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    console.log(`Found ${res.rows.length} signals`);

    return c.json({
      signals: res.rows,
      total: res.rows.length
    });
  } catch (error) {
    console.error("Error fetching signals:", error);
    return c.json({ error: "Failed to fetch signals: " + error.message }, 500);
  }
});

// Get predictions with their signals and events
app.get("/api/predictions", async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    console.log(`Fetching predictions: limit=${limit}, offset=${offset}`);

    const res = await pg.query(`
      SELECT
        p.id, p.category, p.summary, p.prediction_value, p.created_at,
        s.relevance, s.confidence, s.reasoning,
        r.source, r.title, r.text, r.url, mr.chain_tx_hash
      FROM predictions p
      JOIN ai_signals s ON p.signal_id = s.id
      JOIN raw_events r ON s.raw_event_id = r.id
      LEFT JOIN market_predictions mr on mr.prediction_id = p.id
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);



    console.log(`Found ${res.rows.length} predictions`);

    return c.json({
      predictions: res.rows,
      total: res.rows.length
    });
  } catch (error) {
    console.error("Error fetching predictions:", error);
    return c.json({ error: "Failed to fetch predictions: " + error.message }, 500);
  }
});

// Get statistics
app.get("/api/stats", async (c) => {
  try {
    console.log("Fetching statistics");

    const [eventsCount, signalsCount, predictionsCount] = await Promise.all([
      pg.query("SELECT COUNT(*) as count FROM raw_events"),
      pg.query("SELECT COUNT(*) as count FROM ai_signals"),
      pg.query("SELECT COUNT(*) as count FROM predictions")
    ]);

    const categoryStats = await pg.query(`
      SELECT category, COUNT(*) as count
      FROM ai_signals
      GROUP BY category
      ORDER BY count DESC
    `);

    const stats = {
      events: parseInt(eventsCount.rows[0].count),
      signals: parseInt(signalsCount.rows[0].count),
      predictions: parseInt(predictionsCount.rows[0].count),
      categories: categoryStats.rows
    };

    console.log("Statistics fetched:", stats);

    return c.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    return c.json({ error: "Failed to fetch statistics: " + error.message }, 500);
  }
});

// Get markets
app.get("/api/markets", async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    console.log(`Fetching markets: limit=${limit}, offset=${offset}`);

    const res = await pg.query(`
      SELECT
        m.id,
        m.contract_market_id,
        m.question,
        m.lock_timestamp,
        m.resolve_timestamp,
        m.state,
        m.created_at,
        m.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'predictionId', mp.id,
              'aiPredictionId', mp.prediction_id,
              'marketOutcome', mp.market_outcome,
              'confidence', mp.confidence,
              'submittedToChain', mp.submitted_to_chain,
              'chainTxHash', mp.chain_tx_hash,
              'createdAt', mp.created_at
            )
          ) FILTER (WHERE mp.id IS NOT NULL),
          '[]'::json
        ) AS predictions
      FROM markets m
      LEFT JOIN market_predictions mp ON m.id = mp.market_id
      GROUP BY m.id
      ORDER BY m.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    console.log(`Found ${res.rows.length} markets`);

    return c.json({
      markets: res.rows,
      total: res.rows.length
    });
  } catch (error) {
    console.error("Error fetching markets:", error);
    return c.json({ error: "Failed to fetch markets: " + error.message }, 500);
  }
});

// Get events by category
app.get("/api/events/category/:category", async (c) => {
  try {
    const category = c.req.param('category');
    const limit = parseInt(c.req.query('limit') || '50');
    console.log(`Fetching events for category: ${category}, limit=${limit}`);

    const res = await pg.query(`
      SELECT
        s.id, s.category, s.relevance, s.confidence, s.summary, s.reasoning, s.created_at,
        r.source, r.title, r.text, r.url
      FROM ai_signals s
      JOIN raw_events r ON s.raw_event_id = r.id
      WHERE s.category = $1
      ORDER BY s.created_at DESC
      LIMIT $2
    `, [category, limit]);

    console.log(`Found ${res.rows.length} signals for category ${category}`);

    return c.json({
      category,
      signals: res.rows,
      total: res.rows.length
    });
  } catch (error) {
    console.error("Error fetching category events:", error);
    return c.json({ error: "Failed to fetch category events: " + error.message }, 500);
  }
});

// simple debug: return latest raw events
app.get("/debug/recent", async (c) => {
  const res = await pg.query("SELECT id, source, text, inserted_at FROM raw_events ORDER BY inserted_at DESC LIMIT 30");
  return c.json(res.rows);
});

export default {
  port: process.env.PORT || "localhost:3999",
  fetch:app.fetch
}
