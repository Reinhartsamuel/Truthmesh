// src/queue.ts
import { upsertRawEvent, enqueueForSignalExtraction } from "./store";

export async function pushRawEvent(event: {
  source: string;
  source_id?: string;
  title?: string;
  text: string;
  url?: string;
  metadata?: any;
  content_hash: string;
}) {
  const inserted = await upsertRawEvent(event);
  if (!inserted) {
    // already seen
    return null;
  }
  const id = await enqueueForSignalExtraction(inserted.id);
  return id;
}
