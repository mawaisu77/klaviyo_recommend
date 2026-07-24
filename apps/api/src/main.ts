import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { startWorkers } from "./queue/workers.js";

function main(): void {
  const app = createApp();

  const server = app.listen(env.API_PORT, () => {
    logger.info(`API listening on http://localhost:${env.API_PORT}`);
  });

  const worker = startWorkers();
  logger.info("Background worker started");

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down");
    await worker.close();
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main();
