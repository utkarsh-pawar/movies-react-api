import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();

export const QUEUE_KEYS = {
  generateScript : "q:generate-script",
  generateImages : "q:generate-images",
  generateAudio  : "q:generate-audio",
  renderVideo    : "q:render-video",
  uploadYoutube  : "q:upload-youtube",
} as const;

export async function enqueue(queue: string, payload: unknown) {
  await redis.rpush(queue, JSON.stringify(payload));
}

export async function dequeue<T>(queue: string): Promise<T | null> {
  const raw = await redis.lpop<string>(queue);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}
