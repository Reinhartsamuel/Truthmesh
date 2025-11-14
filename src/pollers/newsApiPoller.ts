// src/pollers/newsApiPoller.ts
import { snippetNormalize, contentHash } from "../utils";
import { pushRawEvent } from "../queue";

const KEY = process.env.NEWSAPI_KEY;

export async function pollNewsAPI(query = "crypto OR ethereum OR bitcoin") {
  if (!KEY) {
    console.warn("NEWSAPI_KEY not set; skipping newsapi");
    return;
  }
  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=8&sortBy=publishedAt&apiKey=${KEY}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.articles) return;
    await Promise.all(data.articles.map(async (a: any) => {
      const text = `${a.title} — ${a.description ?? ""}`;
      const normalized = snippetNormalize(text);
      const hash = contentHash(normalized);
      await pushRawEvent({
        source: "newsapi",
        source_id: a.url,
        title: a.title,
        text: normalized,
        url: a.url,
        metadata: { sourceName: a.source?.name, publishedAt: a.publishedAt },
        content_hash: hash,
      });
    }));
  } catch (err) {
    console.error("newsapi poll error", err);
  }
}
