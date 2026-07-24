import { Queue } from "bullmq";
import { createRedisConnection } from "../lib/redis.js";

export const RETURNS_QUEUE = "returns";

export interface ProcessWebhookJob {
  webhookEventId: string;
}

export const returnsQueue = new Queue<ProcessWebhookJob>(RETURNS_QUEUE, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: 1000,
    removeOnFail: 5000,
  },
});

export async function enqueueWebhookProcessing(
  webhookEventId: string,
  jobId?: string,
): Promise<void> {
  await returnsQueue.add(
    "processWebhookEvent",
    { webhookEventId },
    // jobId dedups enqueues for the same webhook event
    { jobId: jobId ?? `webhook:${webhookEventId}` },
  );
}
