# 08 - Testing

Testing scales with the chunks. Chunk 1 sets up the test runner; chunks 2 and 3 add the
integration, webhook, and end-to-end coverage.

## Tooling

- Backend: Vitest (or Jest) + Supertest for HTTP; a test Postgres schema and a mocked or
  in-memory Redis for queue tests.
- Frontend: Vitest + React Testing Library for critical components (forms, guards).
- External APIs (Shopify, Klaviyo) are mocked at the HTTP client boundary in unit and
  integration tests; only the E2E scenario hits real dev accounts.

## Unit testing

Test pure logic in services:

- Return normalization (Shopify GraphQL shape -> `NormalizedReturn`).
- Return-reason mapping (raw reason -> marketing category, including `OTHER` fallback).
- Profile-property calculations (totals, last-return fields, exchange count, return rate
  only when totals are reliable).
- Klaviyo payload generation (correct `metric`, `properties`, deterministic `unique_id`).
- Duplicate detection (same `externalWebhookId` -> no reprocess; same `unique_id` -> no
  duplicate event).

## Integration testing

- Shopify GraphQL client against recorded/mocked responses (returns, refunds, customer).
- Klaviyo event creation and profile update against a mocked Klaviyo API.
- Token refresh path (expired -> refresh -> retry; refresh failure -> mark expired).
- Database transactions writing `returns`, `return_items`, `sync_jobs`.

## Webhook testing

- Valid HMAC accepted; invalid HMAC rejected with `401`.
- Duplicate `X-Shopify-Webhook-Id` acknowledged without reprocessing.
- Delayed and out-of-order events still resolve to correct final state.
- Raw-body parsing produces a byte-accurate HMAC.

## Failure testing

Simulate and assert graceful handling:

- Klaviyo `429` rate limits (backoff + retry, no duplicate event).
- Expired/revoked credentials (connection marked, notification sent).
- Shopify API failures (job retried, then marked failed after max attempts).
- Missing customer email/id (job failed with clear message, no event).
- Database interruptions (job not marked success prematurely).

## End-to-end scenario (the demo)

1. Create a Shopify customer.
2. Place an order containing two products.
3. Return one product because of a sizing issue.
4. Confirm ReturnSense processes the webhook.
5. Confirm an `Item Returned` event appears in Klaviyo.
6. Confirm the Klaviyo customer profile is updated with `returnsense_*` properties.
7. Confirm the size-recovery flow is triggered.
8. Confirm retrying the job does **not** create another event.

## Demo Klaviyo flows (chunk 3 deliverable)

Create at least two flows to demonstrate the data:

- **Size Recovery** - trigger `Item Returned`, condition `return_category = SIZE_ISSUE`;
  send sizing guide + exchange option.
- **Damaged Product Support** - trigger `Item Returned`, condition
  `return_category = PRODUCT_PROBLEM`; send apology + resolution.

Additional suggested flows (optional): Exchange Follow-Up (`Item Exchanged`), Post-Return
Recovery (`Return Completed`), and a High Return Rate segment on
`returnsense_return_rate`.

## Definition of done (per chunk)

- **Chunk 1:** register/login works; `/auth/me` returns the user; empty dashboard renders;
  migrations run clean; unit test runner green.
- **Chunk 2:** both OAuth connections succeed; a raw Shopify return can be fetched;
  a manual Klaviyo test event is visible; webhook endpoints verify HMAC and store events.
- **Chunk 3:** a real Shopify return automatically produces exactly one Klaviyo event,
  updates the profile, is visible/retryable in the dashboard, and drives a demo flow; the
  E2E scenario passes.
