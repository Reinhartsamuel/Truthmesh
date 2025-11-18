import fs from "fs";
import path from "path";
import { connectDB, pg } from "../src/store";
import { pushRawEvent } from "../src/queue";
import { runSignalWorkerOnce } from "../src/workers/signalWorker";
import { runPredictionWorkerOnce } from "../src/workers/ai/predictionWorker";
import { signPrediction } from "../src/oracle/signer";
import { ethers } from "ethers";

/**
 * Full workflow script for local development:
 * - Apply DB schema (if not present)
 * - Ingest sample events and enqueue them
 * - Run signal extraction worker to populate ai_signals
 * - Run prediction worker to generate predictions
 * - Sign the latest prediction and submit it to the deployed PredictionOracle contract on RPC_URL
 *
 * Usage example (from repo root):
 *   DATABASE_URL=postgresql://postgres:pass@localhost:5432/oracle \
 *   RPC_URL=http://127.0.0.1:8545 \
 *   ORACLE_PRIVATE_KEY=0x... \
 *   ORACLE_CONTRACT_ADDRESS=0x... \
 *   SUBMITTER_PRIVATE_KEY=0x... \
 *   bun run scripts/runFullWorkflow.ts
 *
 * Notes:
 * - The script expects the SQL schema file at ./sql/schema.sql relative to the repo root.
 * - Prediction values and confidences are floats (0..1) in the DB. We scale them to integers before signing/submitting.
 */

const SCALE = 1_000_000; // scale floats -> integer representation (adjust if your contract expects a different scaling)

async function applySchemaIfNeeded() {
  const schemaPath = path.join(process.cwd(), "sql", "schema.sql");
  if (!fs.existsSync(schemaPath)) {
    console.warn("schema.sql not found at", schemaPath, "— skipping schema apply.");
    return;
  }
  const sql = fs.readFileSync(schemaPath, "utf8");
  console.log("Applying SQL schema (if missing) from", schemaPath);
  // Run the file as a single query. The schema uses CREATE TABLE IF NOT EXISTS so it's idempotent.
  await pg.query(sql);
  console.log("Schema applied.");
}

async function ingestSampleEvents() {
  console.log("Ingesting sample events and enqueueing for signal extraction...");
  const samples = [
    {
      source: "test",
      text: "BTC surges as ETF inflows hit record levels",
      content_hash: "hash_" + Math.random().toString(36).slice(2, 12),
    },
    {
      source: "test",
      text: "ETH drops 3% amid whale movements",
      content_hash: "hash_" + Math.random().toString(36).slice(2, 12),
    },
    {
      source: "test",
      text: "SEC approves new crypto regulations for institutional investors",
      content_hash: "hash_" + Math.random().toString(36).slice(2, 12),
    },
    {
      source: "test",
      text: "Major Ethereum L2 protocol announces token airdrop to users",
      content_hash: "hash_" + Math.random().toString(36).slice(2, 12),
    },
  ];

  const queued: Array<{ rawEventId: number | null }> = [];

  for (const s of samples) {
    try {
      const qid = await pushRawEvent(s as any);
      queued.push({ rawEventId: qid as any });
      console.log("Queued raw event:", s.text.slice(0, 60), "=> queue id:", qid);
    } catch (err) {
      console.error("Failed to push raw event:", err);
      queued.push({ rawEventId: null });
    }
  }

  return queued;
}

async function runSignalWorkersUntilDone() {
  console.log("Processing signal queue (embedding + LLM reasoning)...");
  // loop until there are no pending rows in signal_queue
  for (;;) {
    const res = await pg.query(
      `SELECT COUNT(*)::int as cnt FROM signal_queue WHERE processed = false`
    );
    const cnt = Number(res.rows[0].cnt);
    if (cnt === 0) {
      console.log("No pending signal_queue entries.");
      break;
    }
    console.log("Pending signal_queue entries:", cnt, " — running worker once.");
    try {
      await runSignalWorkerOnce();
    } catch (err) {
      console.error("runSignalWorkerOnce error:", err);
      // small delay before retrying
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

async function runPredictionWorkersUntilDone() {
  console.log("Creating predictions from ai_signals...");
  for (;;) {
    const res = await pg.query(
      `SELECT id FROM ai_signals WHERE id NOT IN (SELECT signal_id FROM predictions) LIMIT 1`
    );
    if (res.rows.length === 0) {
      console.log("No pending ai_signals to process into predictions.");
      break;
    }
    try {
      await runPredictionWorkerOnce();
    } catch (err) {
      console.error("runPredictionWorkerOnce error:", err);
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}

async function signAndSubmitLatestPrediction() {
  console.log("Fetching the latest prediction to sign and submit...");
  const latest = await pg.query(
    `SELECT p.id AS pred_id, p.prediction_value, p.signal_id, s.confidence
     FROM predictions p
     LEFT JOIN ai_signals s ON s.id = p.signal_id
     ORDER BY p.id DESC
     LIMIT 1`
  );

  if (latest.rows.length === 0) {
    console.log("No predictions available to sign/submit.");
    return;
  }

  const row = latest.rows[0];
  const predId = Number(row.pred_id);
  const floatVal = Number(row.prediction_value);
  const confFloat = Number(row.confidence ?? 0);

  const scaledPred = Math.round(floatVal * SCALE);
  const scaledConf = Math.round(confFloat * SCALE);

  console.log("Latest prediction row:", { predId, floatVal, confFloat, scaledPred, scaledConf });

  // sign using the repo signer which reads ORACLE_PRIVATE_KEY from env
  const signed = await signPrediction({ id: predId, prediction: scaledPred, confidence: scaledConf });
  console.log("Signed prediction:", signed);

  // submit to chain
  const rpc = process.env.RPC_URL || "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpc);

  const submitterPk = process.env.SUBMITTER_PRIVATE_KEY || process.env.ORACLE_PRIVATE_KEY;
  if (!submitterPk) {
    throw new Error("Missing SUBMITTER_PRIVATE_KEY or ORACLE_PRIVATE_KEY to send transaction");
  }

  const wallet = new ethers.Wallet(submitterPk, provider);

  const contractAddress = process.env.PREDICTION_ORACLE_ADDRESS;
  if (!contractAddress) {
    throw new Error("PREDICTION_ORACLE_ADDRESS must be set in env to submit the prediction");
  }

  const abi = ["function submitPrediction(uint256 id,uint256 prediction,uint256 confidence,bytes signature) external"];
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  console.log(`Submitting prediction ${predId} to contract ${contractAddress}...`);
  const tx = await contract.submitPrediction(predId, scaledPred, scaledConf, signed.signature);
  console.log("Transaction sent. Hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("Transaction mined. Block:", receipt.blockNumber, "TxHash:", receipt.transactionHash);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL env var is required (postgres connection).");
    process.exit(1);
  }

  console.log("Connecting to DB...");
  await connectDB();
  console.log("DB connected.");

  try {
    await applySchemaIfNeeded();
    await ingestSampleEvents();
    await runSignalWorkersUntilDone();
    await runPredictionWorkersUntilDone();
    await signAndSubmitLatestPrediction();
    console.log("Full workflow completed.");
  } catch (err) {
    console.error("Error during workflow:", err);
    process.exitCode = 1;
  } finally {
    try {
      await pg.end();
      console.log("DB connection closed.");
    } catch (e) {
      // ignore
    }
  }
}

main().catch((e) => {
  console.error("Unhandled error:", e);
  process.exit(1);
});
