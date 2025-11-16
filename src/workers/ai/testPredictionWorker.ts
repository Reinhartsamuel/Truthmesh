import { pg, connectDB } from "../../store";
import { runPredictionWorkerOnce } from "./predictionWorker";

async function main() {
  console.log("[TEST-PRED] connecting...");
  await connectDB();
  console.log("[TEST-PRED] connected!");

  await runPredictionWorkerOnce();

  pg.end();
}

main();
