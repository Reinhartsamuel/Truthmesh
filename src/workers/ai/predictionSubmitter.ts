import { signPrediction } from "../../oracle/signer.js";

export async function submitPredictionToChain(pred:any) {
  const signed = await signPrediction(pred);

  console.log("[oracle-signature]", signed);
  return signed;
}
