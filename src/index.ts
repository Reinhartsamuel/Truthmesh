import { connectDB } from "./store";
import app from "./server";
import { pollRSSFeed } from "./pollers/rssPoller";
import { pollNewsAPI } from "./pollers/newsApiPoller";
import { pollCoingeckoTickers } from "./pollers/coingeckoPoller";

const PORT = Number(process.env.PORT || 3000);
const POLL_INTERVAL = Number(process.env.POLL_INTERVAL_SECONDS || 15) * 1000;

async function main() {
  await connectDB();
  console.log("DB connected");

  // start Hono server
  (async () => {
    const { serve } = await import("bun");
    // using Bun's serve (or you can use app.listen)
    console.log(`starting server on ${PORT}`);
    serve({
      port: PORT,
      fetch: app.fetch,
    });
  })();

  // Configure which sources to poll
  const rssFeeds = [
    "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "https://www.reuters.com/markets/us/rss",
  ];

  // schedule poller
  setInterval(async () => {
    try {
      // RSS feeds
      for (const f of rssFeeds) {
        pollRSSFeed(f); // fire-and-forget
      }
      // NewsAPI
      pollNewsAPI("crypto OR ethereum OR bitcoin");
      // Coingecko
      pollCoingeckoTickers(["bitcoin", "ethereum"]);
    } catch (err) {
      console.error("poll loop error", err);
    }
  }, POLL_INTERVAL);

  console.log("Pollers started");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
