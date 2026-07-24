# Chunk 1 - Foundation (Monorepo + Auth + Base UI)

> Copy everything below the line into Cursor as a single prompt. It is self-contained.
> Run this chunk first. When it is done, you can register, log in, and see an empty
> dashboard.

---

## Role and context

You are building **ReturnSense**, a SaaS app that syncs Shopify return data into Klaviyo.
This is **Chunk 1 of 3**: the foundation. Do not build any Shopify or Klaviyo logic yet.

Full product context lives in `docs/00-overview.md` and `docs/01-architecture.md`. Read
`docs/02-data-model.md` (chunk 1 section) and `docs/03-api-reference.md` (Auth section)
before coding. Follow the exact structure in `docs/01-architecture.md`.

## Stack (do not deviate)

- Monorepo: **npm workspaces** (`apps/*`, `packages/*`). No Turborepo, no pnpm, no yarn.
- Backend `apps/api`: **Node.js + Express + TypeScript**, Prisma + PostgreSQL, Redis +
  BullMQ, Zod, Pino, bcrypt, JWT in an httpOnly cookie.
- Frontend `apps/web`: **Vite + React + TypeScript** SPA, React Router, TanStack Query.
- Shared `packages/shared`: TypeScript types imported by both apps.
- Language: TypeScript everywhere, `strict: true`.

## Goal / definition of done

- `npm install` at the root installs all workspaces.
- `npm run dev` starts the API and the web app together.
- A user can register (creating a user + organization), log in, hit `GET /auth/me`, and
  see an authenticated, empty dashboard shell. Logout clears the session.
- `npm run db:migrate --workspace apps/api` applies migrations cleanly.
- The unit-test runner is configured and passes.

## Tasks

### 1. Monorepo scaffold
- Root `package.json` with `"private": true`, `"workspaces": ["apps/*", "packages/*"]`,
  and scripts: `dev`, `build`, `test`, `lint`, `db:migrate` (delegating to workspaces;
  use `concurrently` for `dev`).
- Root `.gitignore` (node_modules, dist, .env, prisma generated client).
- Root `.env.example` per `docs/07-environment-setup.md` (include the chunk-1 vars:
  NODE_ENV, APP_URL, API_PORT, WEB_PORT, DATABASE_URL, REDIS_URL, JWT_SECRET,
  COOKIE_SECRET, ENCRYPTION_KEY, VITE_API_URL).
- Root `README.md` with local run steps.

### 2. Shared package (`packages/shared`)
- `package.json` (name `@returnsense/shared`, `main`/`types` pointing at `src/index.ts`
  via a build or `ts` path; simplest: compile with `tsc` or use it as TS source through
  workspace path aliasing).
- `src/index.ts` re-exporting from `src/api.ts` (DTOs). Add the auth DTOs now:
  `RegisterRequest`, `LoginRequest`, `AuthUser`, `MeResponse`. Leave `return.ts` and
  `klaviyo.ts` as stubs for later chunks.

### 3. Backend app (`apps/api`)
- `tsconfig.json` (strict), `package.json` with scripts: `dev` (tsx/ts-node-dev watch),
  `build`, `start`, `db:migrate` (`prisma migrate dev`), `db:generate`, `test`, `lint`.
- `prisma/schema.prisma` with the **chunk-1 models** from `docs/02-data-model.md`:
  `User`, `Organization`, `OrganizationUser`. Postgres provider from `DATABASE_URL`.
- `src/config/env.ts`: Zod schema validating all required env vars; export a typed
  `env` object; fail fast on missing/invalid values.
- `src/lib/prisma.ts`: singleton PrismaClient.
- `src/lib/redis.ts`: ioredis connection from `REDIS_URL`.
- `src/lib/logger.ts`: Pino logger.
- `src/lib/crypto.ts`: AES-256-GCM `encrypt(text)` / `decrypt(payload)` using
  `ENCRYPTION_KEY` (base64, 32 bytes). Include a unit test. (Used by later chunks.)
- `src/queue/queues.ts` + `src/queue/workers.ts`: create a BullMQ queue + a no-op worker
  wired to Redis, to prove the queue works. A real processor comes in chunk 3.
- `src/middleware/error-handler.ts`: central error handler returning
  `{ error: { code, message } }`; map known errors to status codes.
- `src/middleware/auth.ts`: `requireAuth` middleware that verifies the JWT cookie,
  loads the user + organization, attaches `req.auth = { userId, organizationId }`.
- `src/modules/auth/`:
  - `auth.controller.ts`: routes `POST /auth/register`, `POST /auth/login`,
    `POST /auth/logout`, `GET /auth/me` (validate bodies with Zod).
  - `auth.service.ts`: register (hash password with bcrypt, create user +
    organization + owner membership in a transaction), login (verify, issue JWT), me.
  - `auth.repository.ts`: Prisma access for users/orgs/memberships.
  - `auth.test.ts`: unit tests for register/login/hashing.
- `src/modules/organizations/`: service + repository to create an org and resolve a
  user's organization (used by auth and later modules).
- `src/routes/index.ts`: mount all module routers under `/api` (health + auth for now).
- `src/app.ts`: assemble Express (JSON parser, cookie parser, CORS for the web origin
  with credentials, logger, routes, error handler). Add `GET /api/health` checking DB +
  Redis.
- `src/main.ts`: start server on `API_PORT`, start the worker.

### 4. Frontend app (`apps/web`)
- Vite + React + TS scaffold; `package.json` scripts `dev`, `build`, `preview`, `lint`,
  `test`.
- `src/api/client.ts`: fetch wrapper (`VITE_API_URL`, `credentials: "include"`, JSON,
  normalized errors).
- `src/api/endpoints.ts`: typed auth calls using `@returnsense/shared` DTOs.
- `src/store/auth.tsx`: `AuthProvider` + `useAuth` (loads `GET /auth/me`, exposes user,
  login/register/logout helpers).
- `src/router.tsx`: routes for `/login`, `/register` (public) and `/` (private
  dashboard placeholder). Private routes wrapped by a guard that redirects to `/login`.
- `src/layouts/AuthLayout.tsx` and `src/layouts/AppLayout.tsx` (sidebar + top bar).
- `src/components/ui/`: minimal button, input, card, and a toast (shadcn-style, simple).
- `src/features/auth/LoginPage.tsx`, `RegisterPage.tsx`: forms wired to the auth store.
- `src/features/dashboard/DashboardPage.tsx`: empty authenticated dashboard placeholder.
- `main.tsx`: mount with `QueryClientProvider`, `BrowserRouter`, `AuthProvider`.

### 5. Testing setup
- Configure Vitest in both apps. Add the `crypto.ts` and `auth.service.ts` unit tests.
  `npm run test` at the root runs both.

## Constraints / guardrails

- Do **not** implement Shopify or Klaviyo modules, webhooks, or return processing. Those
  are chunks 2 and 3. You may create empty module folders only if needed for routing.
- Do **not** store any secret in plaintext; use `lib/crypto.ts` for anything sensitive.
- Keep the module convention from `docs/01-architecture.md`: controller -> service ->
  repository; services never import Express; controllers never call Prisma directly.
- No secrets committed; only `.env.example` is committed.

## Verify before finishing

1. `npm install` succeeds at the root.
2. `npm run db:migrate --workspace apps/api` creates the three tables.
3. `npm run dev` starts API + web with no errors; `GET /api/health` returns ok.
4. Register a user in the UI -> redirected to the empty dashboard; refresh keeps the
   session; logout returns to `/login`.
5. `npm run test` passes.
