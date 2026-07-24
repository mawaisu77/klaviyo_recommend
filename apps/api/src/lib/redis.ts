import { Redis } from "ioredis";
import { env } from "../config/env.js";

/**
 * Shared connection factory. BullMQ requires `maxRetriesPerRequest: null`
 * on the connections used by Queues and Workers.
 */
export function createRedisConnection(): Redis {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
}

/**
 * Shared client for app-level commands (health, OAuth state). Lazily connects
 * on first command so importing modules in tests does not open a socket.
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redis.on("error", () => {
  // Errors surface at the call site; avoid crashing on background connect issues.
});
