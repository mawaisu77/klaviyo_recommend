# 03 - API Reference

All endpoints are served by the Express backend under a common prefix (default `/api`).
Authenticated endpoints require the session cookie set at login. Tenant-scoped endpoints
resolve the organization from the authenticated user's membership.

Conventions:

- JSON request/response bodies; DTOs live in `packages/shared/src/api.ts`.
- Validation with Zod at the controller boundary; invalid input returns `400`.
- Errors use a consistent shape: `{ "error": { "code": string, "message": string } }`.
- Webhook endpoints are unauthenticated but HMAC-verified and consume the **raw** body.

## Auth (chunk 1)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | no | Create user + organization, start session |
| POST | `/auth/login` | no | Verify credentials, set session cookie |
| POST | `/auth/logout` | yes | Clear session cookie |
| GET | `/auth/me` | yes | Current user + organization |

Register body:

```json
{ "email": "merchant@example.com", "password": "…", "organizationName": "Acme" }
```

## Shopify connection (chunk 2)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/integrations/shopify/install` | yes | Start Shopify OAuth (redirect to Shopify) |
| GET | `/integrations/shopify/callback` | no* | OAuth callback; exchange code, store token, register webhooks |
| GET | `/integrations/shopify/status` | yes | Connection status, shop domain, scopes, last sync |
| POST | `/integrations/shopify/disconnect` | yes | Revoke + mark uninstalled |

\* The callback is reached by Shopify's redirect and validated via `state` + HMAC, not
the session cookie.

## Klaviyo connection (chunk 2)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/integrations/klaviyo/connect` | yes | Start Klaviyo OAuth (PKCE) |
| GET | `/integrations/klaviyo/callback` | no* | Exchange code for access + refresh tokens |
| GET | `/integrations/klaviyo/status` | yes | Connection status, account, token expiry |
| POST | `/integrations/klaviyo/disconnect` | yes | Revoke + clear tokens |
| POST | `/integrations/klaviyo/test-event` | yes | Send a manual test event (chunk 2 validation) |

## Webhooks (chunk 2 receive, chunk 3 process)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/webhooks/shopify/returns` | HMAC | Return lifecycle events |
| POST | `/webhooks/shopify/refunds` | HMAC | Refund created (may include return) |
| POST | `/webhooks/shopify/app-uninstalled` | HMAC | Mark connection uninstalled |

All webhook handlers: verify HMAC over raw body, upsert `WebhookEvent` by
`externalWebhookId`, respond `200` fast. Chunk 2 stores only; chunk 3 enqueues a job.

## Return mappings (chunk 3)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/return-mappings` | yes | List mappings for the org |
| POST | `/return-mappings` | yes | Create a mapping |
| PATCH | `/return-mappings/:id` | yes | Update category / active flag |

## Returns and synchronization (chunk 3)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/returns` | yes | Paginated list with sync status |
| GET | `/returns/:id` | yes | Full return, items, event payloads, attempts |
| GET | `/sync-jobs` | yes | Paginated sync attempts (filter by status) |
| GET | `/sync-jobs/:id` | yes | Single sync job detail |
| POST | `/sync-jobs/:id/retry` | yes | Re-enqueue a failed job (same `unique_id`) |

## Dashboard (chunk 3)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/dashboard/summary` | yes | Totals: returns, returned value, events success/fail |
| GET | `/dashboard/return-reasons` | yes | Counts grouped by reason / category |
| GET | `/dashboard/sync-health` | yes | Recent failures, retry counts, queue health |

## Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | no | Liveness (DB + Redis reachable) |
