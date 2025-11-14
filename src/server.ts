// src/server.ts
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => c.text("TruthMesh — healthy"));
app.get("/health", (c) => c.json({ status: "ok", time: new Date().toISOString() }));
// simple debug: return latest raw events
import { pg } from "./store";
app.get("/debug/recent", async (c) => {
  const res = await pg.query("SELECT id, source, text, inserted_at FROM raw_events ORDER BY inserted_at DESC LIMIT 30");
  return c.json(res.rows);
});

export default app;
