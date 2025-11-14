// src/workers/testSignalWorkerMulti.ts
import { pg } from "../store";
import { runSignalWorkerOnce } from "./signalWorker";

const SAMPLE_EVENTS = [
  "BTC surges as ETF inflows hit record levels",
  "ETH drops 3% amid whale movements",
  "Solana sees spike in daily active addresses",
  "US inflation report sends markets sideways",
  "Binance volume rises despite regulatory concerns",
];

function randomHash() {
  return "hash_" + Math.random().toString(36).slice(2, 12);
}

async function main() {
  console.log("[TEST] starting");
  await pg.connect();
  console.log("[TEST] connected!");

  try {
    const ids: number[] = [];

    console.log("[TEST] inserting raw_events...");
    for (const text of SAMPLE_EVENTS) {
      const res = await pg.query(
        `INSERT INTO raw_events (source, text, content_hash)
         VALUES ($1, $2, $3)
         RETURNING id`,
        ["test", text, randomHash()]
      );
      const id = res.rows[0].id;
      ids.push(id);
      console.log("  inserted raw_event id =", id);

      await pg.query(
        `INSERT INTO signal_queue (raw_event_id) VALUES ($1)`,
        [id]
      );
      console.log("  queued event id =", id);
    }

    console.log("\n[TEST] running worker in loop until queue empty...");

    while (true) {
      const pendingRes = await pg.query(
        `SELECT COUNT(*)::int AS cnt FROM signal_queue WHERE processed = false`
      );
      const left = Number(pendingRes.rows[0].cnt);
      console.log(`  pending = ${left}`);

      if (left === 0) break;

      await runSignalWorkerOnce();
    }

    console.log("\n[TEST] done! All events processed.");
  } catch (err) {
    console.error("[TEST] ERROR:", err);
  } finally {
    await pg.end();
  }
}

main();
