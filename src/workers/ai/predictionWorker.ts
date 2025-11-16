// src/workers/predictionWorker.ts

import { pg } from "../../store";
import { createPrediction } from "../ai/predictionEngine";

export async function runPredictionWorkerOnce() {
  const res = await pg.query(`
    SELECT *
    FROM ai_signals
    WHERE id NOT IN (SELECT signal_id FROM predictions)
    ORDER BY id ASC
    LIMIT 1
  `);

  if (res.rows.length === 0) {
    console.log("[prediction] no pending signals");
    return;
  }

  const signal = res.rows[0];

  const prediction = createPrediction({
    id: signal.id,
    category: signal.category,
    relevance: signal.relevance,
    confidence: signal.confidence,
    summary: signal.summary,
  });

  await pg.query(
    `
      INSERT INTO predictions (signal_id, category, summary, prediction_value)
      VALUES ($1, $2, $3, $4)
    `,
    [
      prediction.signal_id,
      prediction.category,
      prediction.summary,
      prediction.prediction_value,
    ]
  );

  console.log(
    `[prediction] signal ${signal.id} → ${prediction.prediction_value}`
  );
}
