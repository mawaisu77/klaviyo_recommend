# 07 - Environment Setup

## Prerequisites

- Node.js 20+ and npm 10+
- PostgreSQL 15+ (local install or Docker)
- Redis 7+ (local install or Docker)
- A public tunnel for local webhook delivery (e.g. `ngrok` or `cloudflared`)

Quick Docker for infra:

```bash
docker run -d --name rs-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=returnsense -p 5432:5432 postgres:16
docker run -d --name rs-redis -p 6379:6379 redis:7
```

## External accounts (manual)

You must create these yourself; they cannot be provisioned by code:

1. **Shopify Partner account** + a **development store**.
2. A **Shopify app** (custom/public) with scopes `read_orders`, `read_returns`,
   `read_customers`, `read_fulfillments`; note the **API key** and **API secret** and set
   the OAuth redirect to `APP_URL/api/integrations/shopify/callback`.
3. **Klaviyo account** (a dev/test account is fine) and a **Klaviyo OAuth app**; note the
   **client id** and **client secret** and set the redirect to
   `APP_URL/api/integrations/klaviyo/callback`.
4. Sample data in the dev store: products, a customer, an order, and at least one return
   and one exchange for testing.

You also decide: which Shopify return reasons map to which marketing categories, the
first Klaviyo flows/templates, and product branding (name, logo, notification email,
privacy policy) before any public install.

## Environment variables

Root `.env.example` (copy to `.env`; the API reads it, Vite reads `VITE_`-prefixed vars):

```bash
# --- Core ---
NODE_ENV=development
APP_URL=https://your-tunnel.ngrok-free.app     # public URL for OAuth + webhooks
API_PORT=4000
WEB_PORT=5173

# --- Database / Queue ---
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/returnsense
REDIS_URL=redis://localhost:6379

# --- Auth / crypto ---
JWT_SECRET=change-me-long-random
COOKIE_SECRET=change-me-long-random
ENCRYPTION_KEY=32-byte-base64-key            # AES-256-GCM key for token encryption

# --- Shopify ---
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=
SHOPIFY_SCOPES=read_orders,read_returns,read_customers,read_fulfillments
SHOPIFY_API_VERSION=2025-07

# --- Klaviyo ---
KLAVIYO_CLIENT_ID=
KLAVIYO_CLIENT_SECRET=
KLAVIYO_SCOPES=profiles:read profiles:write events:write metrics:read
KLAVIYO_API_REVISION=2025-07-15

# --- Notifications (optional, chunk 3) ---
NOTIFY_EMAIL_FROM=
NOTIFY_EMAIL_TO=
SLACK_WEBHOOK_URL=

# --- Frontend ---
VITE_API_URL=http://localhost:4000/api
```

The API validates all required vars at boot with Zod (`config/env.ts`) and fails fast
with a clear message if any are missing.

Generate an encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Install and run (after chunk 1 exists)

```bash
npm install                       # installs all workspaces
npm run db:migrate --workspace apps/api   # prisma migrate dev
npm run dev                       # runs api + web (and worker) together
```

Expose the API publicly for webhooks:

```bash
ngrok http 4000     # set APP_URL to the https URL it prints
```

Then re-run the Shopify install so webhooks register against the tunnel URL.

## Root scripts (target)

Defined on the root `package.json`; individual apps expose matching scripts:

| Script | Effect |
| --- | --- |
| `npm run dev` | Start api, worker, and web concurrently |
| `npm run build` | Build all workspaces |
| `npm run db:migrate` | Prisma migrate (api) |
| `npm run db:seed` | Seed default return-reason mappings (chunk 3) |
| `npm run test` | Run tests across workspaces |
| `npm run lint` | Lint all workspaces |
