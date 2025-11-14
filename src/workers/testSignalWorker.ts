import { pg } from "../store";
import { runSignalWorkerOnce } from "./signalWorker";

async function main() {
  console.log("[TEST] starting");

  try {
    console.log("[TEST] connecting...");
    await pg.connect();
    console.log("[TEST] connected!");

    console.log("[TEST] inserting raw_events...");
    const insertRaw = await pg.query(
      `INSERT INTO raw_events (source, text, content_hash)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [
        "test",
        "BTC rises as ETF inflows increase",
        "hash_" + Math.random().toString(36).slice(2),
      ]
    );

    console.log("[TEST] insertRaw result:", insertRaw.rows);

    const rawId = insertRaw.rows[0].id;

    console.log("[TEST] inserting queue...");
    await pg.query(
      `INSERT INTO signal_queue (raw_event_id)
       VALUES ($1)`,
      [rawId]
    );

    console.log("[TEST] running worker once...");
    await runSignalWorkerOnce();

    console.log("[TEST] finished");
  } catch (err) {
    console.error("[TEST] ERROR:", err);
  } finally {
    await pg.end();
  }
}

main();
