# Chunk 3 - Processing Engine + Profiles + Dashboard + Testing

> Copy everything below the line into Cursor as a single prompt. Run **after chunks 1 and
> 2 are complete and working**. When this chunk is done, a real Shopify return
> automatically produces the correct Klaviyo event (exactly once), updates the customer
> profile, is visible and retryable in the dashboard, and drives a demo flow. This is the
> final chunk; after it, the application is complete end-to-end.

---

## Role and context

You are completing **ReturnSense**. Chunks 1 and 2 exist and work: monorepo + auth, and
both Shopify + Klaviyo connected with store-only webhooks. This is **Chunk 3 of 3**: the
return-processing engine, profile calculations, mappings, the full dashboard, failure
notifications, and the test suite.

Read first: `docs/02-data-model.md` (chunk 3 section + internal format + event/profile
shapes), `docs/04-integrations-shopify.md` (return GraphQL), `docs/05-integrations-klaviyo.md`
(events, profiles, dedup, rate limits), `docs/03-api-reference.md` (mappings, returns,
sync, dashboard), `docs/06-frontend.md` (chunk 3 screens), and `docs/08-testing.md`.
Reuse everything from chunks 1-2 (crypto, Shopify GraphQL client, Klaviyo client,
webhook storage, BullMQ scaffold).

## Goal / definition of done

- Stored webhooks are enqueued and processed by a BullMQ worker.
- The worker fetches the full return, normalizes it, maps reasons, matches the customer,
  and emits **item-level** Klaviyo events with a deterministic `unique_id` (idempotent
  across retries).
- After each return, Klaviyo profile properties are recomputed and updated.
- Merchants can view/edit return-reason mappings and see returns, details, sync errors,
  and analytics in the dashboard; failed jobs are retryable.
- Repeated failures / expired tokens trigger an email or Slack notification.
- Unit, integration, webhook, failure, and the end-to-end scenario from `docs/08-testing.md`
  pass. Two demo Klaviyo flows are documented/created.

## Tasks

### 1. Data model + seed
- Add the **chunk-3 models** from `docs/02-data-model.md`: `ReturnReasonMapping`,
  `Return`, `ReturnItem`, `SyncJob`. Run a migration.
- Add `npm run db:seed` that seeds the default reason->category mappings (from
  `docs/02-data-model.md`) for an organization on demand / at first connect.

### 2. Shared types
- Finalize `packages/shared/src/return.ts` (`NormalizedReturn`, `NormalizedReturnItem`)
  and `klaviyo.ts` (event + profile-property shapes) exactly as in `docs/02-data-model.md`.

### 3. Mappings module (`apps/api/src/modules/mappings/`)
- Controller: `GET /return-mappings`, `POST /return-mappings`, `PATCH /return-mappings/:id`
  (all auth, org-scoped).
- Service + repository over `ReturnReasonMapping`.
- `mapReason(orgId, sourceReason)`: returns the active marketing category, falling back to
  `OTHER`. Unit-tested.

### 4. Sync module (`apps/api/src/modules/sync/`) - the engine
- `normalize.ts`: convert a Shopify return (from `shopify.getReturn`) into
  `NormalizedReturn`; pure and unit-tested against a mocked GraphQL response.
- `event-type.ts`: determine the event type from the webhook topic / return status
  (`Return Requested`, `Return Approved`, `Item Returned`, `Item Exchanged`,
  `Partial Refund Issued`, `Return Completed`).
- `unique-id.ts`: deterministic `unique_id` from `returnId + returnItemId + eventType`.
- `profile-stats.ts`: compute the `returnsense_*` properties from stored returns; only set
  `returnsense_return_rate` when purchase + return totals are reliable. Unit-tested.
- `sync.service.ts` `processWebhookEvent(webhookEventId)`:
  1. Load the `WebhookEvent`; mark `processing`.
  2. Resolve the return id from the payload; `shopify.getReturn`.
  3. Normalize; map each item's reason via `mappings.mapReason`.
  4. Persist `Return` + `ReturnItem` (idempotent upsert by
     `(organizationId, shopifyReturnId)`).
  5. For each item, create/find a `SyncJob`, upsert the Klaviyo profile, send the
     item-level event with the deterministic `unique_id`, and record
     `klaviyoEventId` / status / attemptCount.
  6. Recompute + update Klaviyo profile properties once per return.
  7. Mark the `WebhookEvent` `processed` (or `failed` with a message).
- `sync.repository.ts`: Prisma access for returns/items/sync jobs.
- Tests for normalization, mapping, unique-id stability, and profile-stat math.

### 5. Queue wiring
- Replace the chunk-1 no-op worker with a real processor that calls
  `sync.service.processWebhookEvent`. Configure retries with exponential backoff and a max
  attempt count; on final failure mark the `SyncJob` `failed` and notify.
- Update the **webhooks module** so, after storing a new `WebhookEvent`, it enqueues a job
  (replacing chunk 2's store-only behavior). Duplicates are still deduped and not
  re-enqueued.

### 6. Returns + sync API (`apps/api/src/modules/returns/`)
- `GET /returns` (paginated, with per-return sync status), `GET /returns/:id` (full return,
  items, generated event payloads, all attempts).
- `GET /sync-jobs`, `GET /sync-jobs/:id`, `POST /sync-jobs/:id/retry` (re-enqueue with the
  **same** `unique_id` so no duplicate event is created).

### 7. Dashboard API (`apps/api/src/modules/dashboard/`)
- `GET /dashboard/summary` (totals: returns, returned value, events success/fail),
  `GET /dashboard/return-reasons` (counts by reason/category),
  `GET /dashboard/sync-health` (recent failures, retry counts, queue health).

### 8. Notifications module (`apps/api/src/modules/notifications/`)
- Send an email and/or Slack message when a job fails past its max attempts, a token
  expires, or Klaviyo rejects events repeatedly. Config via env
  (`NOTIFY_EMAIL_*`, `SLACK_WEBHOOK_URL`); no-op cleanly if unset.

### 9. Frontend (`apps/web`)
- `features/mappings/ReturnMappingPage.tsx`: table of `sourceReason -> marketingCategory`
  with inline edit + active toggle.
- `features/returns/ReturnsActivityPage.tsx`: paginated table (date, order, customer,
  product(s), reason, value, sync-status badge).
- `features/returns/ReturnDetailsPage.tsx`: full return, items, event payloads, attempts.
- `features/sync/SyncErrorsPage.tsx`: failed events + error messages + retry action.
- `features/dashboard/DashboardPage.tsx`: replace the placeholder with the analytics
  summary (cards + a simple chart: totals, top reasons, top returned products, success vs
  failed events).
- Add nav links; wire all pages with TanStack Query hooks; mutations invalidate the
  relevant keys; show loading/empty/error states.

### 10. Testing (per `docs/08-testing.md`)
- Unit: normalization, mapping, profile stats, payload/unique-id, dedup.
- Integration: Shopify GraphQL (mock), Klaviyo event + profile (mock), token refresh, DB
  transactions.
- Webhook: valid/invalid HMAC, duplicate id, out-of-order.
- Failure: Klaviyo `429`, expired credentials, Shopify failure, missing email, DB error.
- End-to-end: run the full demo scenario (order with two items, return one for a sizing
  issue, confirm one `Item Returned` event, profile updated, flow triggered, retry creates
  no duplicate).

### 11. Demo flows
- Document (and, in the Klaviyo dev account, create) the **Size Recovery** and **Damaged
  Product Support** flows described in `docs/08-testing.md`.

## Constraints / guardrails

- Idempotency is mandatory: same webhook id -> processed once; same `unique_id` -> one
  Klaviyo event, even on retry.
- Never mark a `SyncJob` `success` before Klaviyo confirms the event.
- One profile-property update per return (not per item) to respect rate limits.
- Keep the module/feature conventions from `docs/01-architecture.md`.
- Do not weaken chunk 1/2 behavior (auth, encryption, HMAC verification).

## Verify before finishing (MVP acceptance)

1. A real Shopify return in the dev store automatically produces the correct Klaviyo
   event with full item detail.
2. The customer's Klaviyo profile shows updated `returnsense_*` properties.
3. Sending the same webhook twice / retrying a job creates no duplicate event.
4. Failed jobs are visible in Sync Errors and can be retried successfully.
5. The dashboard shows recent returns and sync status; analytics populate.
6. At least two Klaviyo flows are triggered by the synced data.
7. The full test suite (`npm run test`) and the E2E scenario pass.
