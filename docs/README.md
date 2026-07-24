# ReturnSense Documentation

ReturnSense is a SaaS integration that turns Shopify return, exchange, and refund
activity into marketing-ready customer events and profile properties in Klaviyo.

This `docs/` folder is the operational knowledge base for building the product.
The master product vision lives in [`../plan.md`](../plan.md); these documents
condense that plan into concrete, buildable specifications.

## How to read these docs

Read in order the first time:

| Doc | Purpose |
| --- | --- |
| [00-overview.md](00-overview.md) | Product, problem, goals, users, scope |
| [01-architecture.md](01-architecture.md) | Monorepo layout, stack, system + data flows |
| [02-data-model.md](02-data-model.md) | Prisma schema, internal formats, event/profile shapes |
| [03-api-reference.md](03-api-reference.md) | Every backend endpoint, grouped by module |
| [04-integrations-shopify.md](04-integrations-shopify.md) | Shopify OAuth, webhooks, GraphQL |
| [05-integrations-klaviyo.md](05-integrations-klaviyo.md) | Klaviyo OAuth, events, profiles, dedup |
| [06-frontend.md](06-frontend.md) | Routing, screens, state, component conventions |
| [07-environment-setup.md](07-environment-setup.md) | Env vars, external accounts, local run steps |
| [08-testing.md](08-testing.md) | Test strategy and the end-to-end demo scenario |

## How to build the product

The build is split into three self-contained chunks. Each chunk file in
[`chunks/`](chunks/) is a complete, copy-paste-ready prompt for Cursor. Run them
in order; each ends in a working, testable state.

| Chunk | Outcome |
| --- | --- |
| [chunk-1-foundation.md](chunks/chunk-1-foundation.md) | Monorepo, auth, empty dashboard |
| [chunk-2-integrations.md](chunks/chunk-2-integrations.md) | Shopify + Klaviyo connected, raw data + test event |
| [chunk-3-processing-dashboard.md](chunks/chunk-3-processing-dashboard.md) | Automatic return→Klaviyo sync + full dashboard |

After chunk 3 you have a complete end-to-end application.

## Stack at a glance

- **Monorepo:** npm workspaces (`apps/*`, `packages/*`)
- **Backend (`apps/api`):** Node.js + Express + TypeScript, Prisma + PostgreSQL, Redis + BullMQ
- **Frontend (`apps/web`):** Vite + React + TypeScript SPA, React Router, TanStack Query
- **Shared (`packages/shared`):** TypeScript types shared by both apps
