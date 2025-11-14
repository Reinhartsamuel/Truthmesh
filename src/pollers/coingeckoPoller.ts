// src/pollers/coingeckoPoller.ts
import { snippetNormalize, contentHash } from "../utils";
import { pushRawEvent } from "../queue";

export async function pollCoingeckoTickers(ids = ["bitcoin", "ethereum"]) {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`;
    const res = await fetch(url);
    const data = await res.json();
    const time = new Date().toISOString();
    for (const id of Object.keys(data)) {
      const payload = data[id];
      const text = `Coingecko: ${id} price $${payload.usd} (24h ${payload.usd_24h_change?.toFixed(2)}%) at ${time}`;
      const normalized = snippetNormalize(text);
      const hash = contentHash(normalized);
      await pushRawEvent({
        source: "coingecko",
        source_id: `price:${id}:${time}`,
        title: `${id} price`,
        text: normalized,
        url: `https://www.coingecko.com/en/coins/${id}`,
        metadata: { price: payload.usd, change_24h: payload.usd_24h_change },
        content_hash: hash,
      });
    }
  } catch (err) {
    console.error("coingecko poll error", err);
  }
}
