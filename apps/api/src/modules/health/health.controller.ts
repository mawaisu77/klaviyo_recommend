import { Router } from "express";
import { asyncHandler } from "../../lib/http.js";
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";

export const healthController = Router();

healthController.get(
  "/",
  asyncHandler(async (_req, res) => {
    const checks: Record<string, string> = {};
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = "ok";
    } catch {
      checks.database = "error";
    }
    try {
      await redis.ping();
      checks.redis = "ok";
    } catch {
      checks.redis = "error";
    }
    const healthy = Object.values(checks).every((v) => v === "ok");
    res.status(healthy ? 200 : 503).json({ status: healthy ? "ok" : "degraded", checks });
  }),
);
