// src/ai/predictionEngine.ts

export interface Signal {
  id: number;
  category: string;
  relevance: number;   // 0–1
  confidence: number;  // 0–1
  summary: string;
}

/**
 * Category multipliers (risk, impact, volatility)
 */
const categoryWeights: Record<string, number> = {
  BTC_price: 1.1,
  ETH_ecosystem: 1.0,
  Macro: 0.9,
  Regulation: 0.8,
  Exploit: 1.3,
  Other: 0.7,
};

/**
 * Compute a normalized prediction value (0–1)
 */
export function generatePredictionValue(signal: Signal) {
  const { relevance, confidence, category } = signal;

  const w = categoryWeights[category] ?? 1.0;

  let score =
    0.5 * relevance +
    0.5 * confidence;

  // apply category multiplier
  score *= w;

  // clamp 0–1
  score = Math.max(0, Math.min(1, score));

  return Number(score.toFixed(4));
}

/**
 * Convert a signal to a final prediction object
 */
export function createPrediction(signal: Signal) {
  return {
    signal_id: signal.id,
    category: signal.category,
    summary: signal.summary,
    prediction_value: generatePredictionValue(signal),
    created_at: new Date().toISOString(),
  };
}
