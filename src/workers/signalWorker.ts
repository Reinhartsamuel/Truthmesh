// src/workers/signalWorker.ts
import { pg } from "../store";
import { classifyText } from "../llm/classifier";
import { refineSignal } from "../llm/reasoner";

const BATCH_SIZE = 10;

export async function runSignalWorker() {
  console.log("[signal-worker] started");

  // Only 1 worker loop should be active globally
  const lock = await pg.query(`SELECT pg_try_advisory_lock(987654) AS locked`);
  if (!lock.rows[0].locked) {
    console.log("[signal-worker] another worker already running, exiting");
    return;
  }

  while (true) {
    try {
      const res = await pg.query(
        `SELECT
            q.id AS queue_id,
            r.id AS raw_id,
            r.text
         FROM signal_queue q
         JOIN raw_events r ON r.id = q.raw_event_id
         WHERE q.processed = false
         ORDER BY q.enqueued_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [BATCH_SIZE]
      );

      if (res.rows.length === 0) {
        await wait(2000);
        continue;
      }

      for (const row of res.rows) {
        const { raw_id, queue_id, text } = row;

        // 0) Prevent duplicate signals
        const exists = await pg.query(
          `SELECT 1 FROM ai_signals WHERE raw_event_id = $1 LIMIT 1`,
          [raw_id]
        );

        if (exists.rows.length > 0) {
          console.log(`[signal-worker] skipping ${raw_id} → already processed`);
          await pg.query(
            `UPDATE signal_queue SET processed = true WHERE id = $1`,
            [queue_id]
          );
          continue;
        }

        // 1) Embedding-based classifier
        const { category, relevance } = await classifyText(text);

        // 2) Short LLM reasoning summary
        const { summary, confidence } = await refineSignal(text, category);

        // 3) Insert AI signal (idempotent)
        await pg.query(
          `INSERT INTO ai_signals
           (raw_event_id, category, relevance, confidence, summary, model_metadata)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (raw_event_id) DO NOTHING`,
          [
            raw_id,
            category,
            relevance,
            confidence,
            summary,
            JSON.stringify({ model: "gpt-4o-mini" }),
          ]
        );

        // 4) Mark as processed
        await pg.query(
          `UPDATE signal_queue SET processed = true WHERE id = $1`,
          [queue_id]
        );

        console.log(
          `[signal-worker] processed ${raw_id} → ${category} (rel=${relevance.toFixed(
            3
          )}, conf=${confidence})`
        );
      }
    } catch (err) {
      console.error("[signal-worker] error:", err);
      await wait(3000);
    }
  }
}

function wait(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}




export async function runSignalWorkerOnce() {
  try {
    const res = await pg.query(
      `SELECT q.id as queue_id, r.id as raw_id, r.text
       FROM signal_queue q
       JOIN raw_events r ON r.id = q.raw_event_id
       WHERE q.processed = false
       ORDER BY q.enqueued_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`
    );

    if (res.rows.length === 0) {
      console.log("[test] no pending signals.");
      return;
    }

    const row = res.rows[0];
    const rawText = row.text;

    const { category, relevance } = await classifyText(rawText);
    const { summary, confidence } = await refineSignal(rawText, category);

    await pg.query(
      `INSERT INTO ai_signals (raw_event_id, category, relevance, confidence, summary, model_metadata)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        row.raw_id,
        category,
        relevance,
        confidence,
        summary,
        JSON.stringify({ model: "gpt-4o-mini" }),
      ]
    );
    await pg.query(
      `UPDATE signal_queue SET processed = true WHERE id = $1`,
      [row.queue_id]
    );

    console.log("[test] processed", row.raw_id, category, relevance, confidence);
  } catch (err) {
    console.error(err);
  }
}
