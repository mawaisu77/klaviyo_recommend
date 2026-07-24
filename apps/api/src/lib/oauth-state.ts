import { randomBytes } from "node:crypto";
import { redis } from "./redis.js";

const TTL_SECONDS = 600;

/** Stores short-lived OAuth state (and optional PKCE verifier) in Redis. */
export const oauthState = {
  async create(namespace: string, data: Record<string, string>): Promise<string> {
    const state = randomBytes(16).toString("hex");
    await redis.set(
      `oauth:${namespace}:${state}`,
      JSON.stringify(data),
      "EX",
      TTL_SECONDS,
    );
    return state;
  },

  async consume(
    namespace: string,
    state: string,
  ): Promise<Record<string, string> | null> {
    const key = `oauth:${namespace}:${state}`;
    const raw = await redis.get(key);
    if (!raw) return null;
    await redis.del(key);
    return JSON.parse(raw) as Record<string, string>;
  },
};
