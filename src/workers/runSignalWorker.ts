import { connectDB } from "../store";
import { runSignalWorker } from "./signalWorker";

async function main() {
  await connectDB();
  console.log("DB connected");
  setInterval(async () => {
    await runSignalWorker();
  }, 5000); // every 5 seconds
}

main();
