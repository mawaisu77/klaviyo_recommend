import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/error-handler.js";
import { rawBodyJson } from "./middleware/raw-body.js";
import { apiRouter } from "./routes/index.js";
import { webhooksController } from "./modules/webhooks/index.js";

export function createApp(): Express {
  const app = express();

  app.use(pinoHttp({ logger }));
  app.use(
    cors({
      origin: env.WEB_URL,
      credentials: true,
    }),
  );
  app.use(cookieParser(env.COOKIE_SECRET));

  // Webhooks need the raw body for HMAC verification, so mount before global JSON.
  app.use("/api/webhooks", rawBodyJson, webhooksController);

  // All other API routes use standard JSON parsing.
  app.use("/api", express.json({ limit: "2mb" }), apiRouter);

  app.use(errorHandler);

  return app;
}
