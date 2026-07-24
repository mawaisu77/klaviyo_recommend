import { Worker } from "bullmq";
import { createRedisConnection } from "../lib/redis.js";
import { logger } from "../lib/logger.js";
import { notificationsService } from "../modules/notifications/notifications.service.js";
import { syncService } from "../modules/sync/sync.service.js";
import { RETURNS_QUEUE, type ProcessWebhookJob } from "./queues.js";

export function startWorkers(): Worker<ProcessWebhookJob> {
  const worker = new Worker<ProcessWebhookJob>(
    RETURNS_QUEUE,
    async (job) => {
      logger.info({ jobId: job.id, name: job.name }, "Processing job");
      await syncService.processWebhookEvent(job.data.webhookEventId);
    },
    { connection: createRedisConnection(), concurrency: 5 },
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error(
      { jobId: job?.id, attempts: job?.attemptsMade, err: err.message },
      "Job failed",
    );
    const maxAttempts = job?.opts.attempts ?? 1;
    if (job && job.attemptsMade >= maxAttempts) {
      void notificationsService.notifyFailure(
        "ReturnSense sync job failed",
        `Job ${job.id} failed after ${job.attemptsMade} attempts: ${err.message}`,
      );
    }
  });

  return worker;
}
