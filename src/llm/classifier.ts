import { embedText } from "./embedder";
import { cosineSimilarity } from "../utils";

const categories = {
  BTC_price: "Bitcoin price movement, market volatility, ETF flows, macro BTC trends",
  ETH_ecosystem: "Ethereum L2, rollups, staking, MEV, dev updates, protocols",
  Macro: "inflation, CPI, Fed interest rates, macro economy, geopolitical events",
  Regulation: "crypto regulation, government policy, SEC, bans, compliance",
  Exploit: "hacks, exploits, vulnerabilities, protocol failures",
};

let cache: Record<string, number[]> = {};

async function getCategoryCenter(cat: string) {
  if (!cache[cat]) {
    cache[cat] = await embedText(categories[cat as keyof typeof categories]);
  }
  return cache[cat];
}

export async function classifyText(text: string) {
  const textEmbed = await embedText(text);

  let bestCat = "Other";
  let bestScore = -1;

  for (const cat of Object.keys(categories)) {
    const center = await getCategoryCenter(cat);
    const score = cosineSimilarity(textEmbed, center);

    if (score > bestScore) {
      bestScore = score;
      bestCat = cat;
    }
  }

  return {
    category: bestCat,
    relevance: bestScore, // similarity 0–1
  };
}
