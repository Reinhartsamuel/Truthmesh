// src/pollers/rssPoller.ts
import Parser from "rss-parser";
import { snippetNormalize, contentHash } from "../utils";
import { pushRawEvent } from "../queue";

const parser = new Parser({});

export async function pollRSSFeed(url: string) {
  try {
    const feed = await parser.parseURL(url);
    const promises = feed.items.slice(0, 10).map(async (item:any) => {
      const text = [item.title, item.contentSnippet, item.content].filter(Boolean).join(" — ");
      const normalized = snippetNormalize(text);
      const hash = contentHash(normalized);
      return pushRawEvent({
        source: `rss:${url}`,
        source_id: item.guid ?? item.link ?? item.title,
        title: item.title ?? null,
        text: normalized,
        url: item.link ?? null,
        metadata: { pubDate: item.pubDate ?? null },
        content_hash: hash,
      });
    });
    await Promise.all(promises);
  } catch (err) {
    console.error("rssPoller error", url, err);
  }
}
