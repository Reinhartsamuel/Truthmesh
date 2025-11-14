// src/utils.ts
import * as crypto from "crypto";

export function contentHash(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export function snippetNormalize(text: string) {
  // light normalization: trim, remove excessive whitespace, remove URLs
  const noUrls = text.replace(/https?:\/\/\S+/g, "");
  const cleaned = noUrls.replace(/\s+/g, " ").trim();
  return cleaned;
}


export function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
