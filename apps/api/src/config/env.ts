import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

// Load the monorepo root .env (dev runs with cwd = apps/api), then a local override.
loadDotenv({ path: resolve(process.cwd(), "../../.env"), quiet: true });
loadDotenv({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:4000"),
  WEB_URL: z.string().url().default("http://localhost:5173"),
  API_PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 chars"),
  COOKIE_SECRET: z.string().min(8, "COOKIE_SECRET must be at least 8 chars"),
  ENCRYPTION_KEY: z.string().min(1, "ENCRYPTION_KEY is required (base64, 32 bytes)"),

  SHOPIFY_API_KEY: z.string().default(""),
  SHOPIFY_API_SECRET: z.string().default(""),
  SHOPIFY_SCOPES: z
    .string()
    .default("read_orders,read_returns,read_customers,read_fulfillments"),
  SHOPIFY_API_VERSION: z.string().default("2025-07"),

  KLAVIYO_CLIENT_ID: z.string().default(""),
  KLAVIYO_CLIENT_SECRET: z.string().default(""),
  KLAVIYO_SCOPES: z
    .string()
    .default("profiles:read profiles:write events:write metrics:read"),
  KLAVIYO_API_REVISION: z.string().default("2025-07-15"),

  NOTIFY_EMAIL_FROM: z.string().default(""),
  NOTIFY_EMAIL_TO: z.string().default(""),
  SLACK_WEBHOOK_URL: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

export const isProd = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
