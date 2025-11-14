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
