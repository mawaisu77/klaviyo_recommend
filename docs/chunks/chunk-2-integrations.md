# Chunk 2 - Integrations (Shopify + Klaviyo Connect)

> Copy everything below the line into Cursor as a single prompt. Run **after chunk 1 is
> complete and working**. When this chunk is done, a merchant can connect both Shopify
> and Klaviyo, you can fetch a raw Shopify return, and you can send a manual test event
> that appears in Klaviyo.

---

## Role and context

You are continuing **ReturnSense**. Chunk 1 (monorepo, auth, empty dashboard) already
exists and works. This is **Chunk 2 of 3**: connect Shopify and Klaviyo via OAuth, store
tokens encrypted, register + receive (store-only) webhooks, and expose connection status
and a manual test event.

Read first: `docs/04-integrations-shopify.md`, `docs/05-integrations-klaviyo.md`,
`docs/02-data-model.md` (chunk 2 section), `docs/03-api-reference.md`
(Shopify/Klaviyo/Webhooks), and `docs/06-frontend.md` (chunk 2 screens). Reuse the
existing conventions, `lib/crypto.ts`, `lib/prisma.ts`, and auth middleware from chunk 1.

## Goal / definition of done

- Merchant connects Shopify via OAuth; access token stored encrypted; required webhooks
  registered against `APP_URL`.
- Merchant connects Klaviyo via OAuth (with PKCE); access + refresh tokens stored
  encrypted; token refresh works.
- Backend can fetch a full Shopify return by id via GraphQL (verified with a real return
  in the dev store).
- `POST /integrations/klaviyo/test-event` sends a sample event that appears in Klaviyo.
- Webhook endpoints verify HMAC over the raw body and store a deduped `WebhookEvent`
  (no processing yet).
- Frontend Onboarding + Integration Settings screens show status and drive connect /
  disconnect / reconnect / test-event.

## Tasks

### 1. Data model
- Add the **chunk-2 models** from `docs/02-data-model.md`: `ShopifyConnection`,
  `KlaviyoConnection`, `WebhookEvent`. Run a migration.

### 2. Config
- Extend `config/env.ts` with the Shopify and Klaviyo vars from
  `docs/07-environment-setup.md` (API key/secret/scopes/version; client id/secret/
  scopes/revision). Fail fast if missing.

### 3. Shopify module (`apps/api/src/modules/shopify/`)
- `shopify.controller.ts`: routes
  `GET /integrations/shopify/install` (auth), `GET /integrations/shopify/callback`,
  `GET /integrations/shopify/status` (auth), `POST /integrations/shopify/disconnect`
  (auth).
- `shopify.service.ts`:
  - Build the authorize URL with scopes + a stored `state` nonce.
  - Callback: verify `hmac` + `state`, validate `shop` is `*.myshopify.com`, exchange the
    code for an access token, encrypt + upsert `ShopifyConnection`, then register
    webhooks.
  - `graphql(shop, query, variables)`: POST to the pinned API version with the decrypted
    `X-Shopify-Access-Token`; handle throttling with backoff; typed error on invalid
    token.
  - `getReturn(returnId)`: run the return query from `docs/04-integrations-shopify.md`.
  - `registerWebhooks()` / `deleteWebhooks()` for the topics listed in that doc.
  - `disconnect()`: mark uninstalled, best-effort delete webhooks.
- `shopify.repository.ts`: Prisma access for `ShopifyConnection`.
- `shopify.types.ts`: GraphQL response types.
- Tests: HMAC verification, authorize URL building, return-query response parsing (mock).

### 4. Klaviyo module (`apps/api/src/modules/klaviyo/`)
- `klaviyo.controller.ts`: routes
  `GET /integrations/klaviyo/connect` (auth), `GET /integrations/klaviyo/callback`,
  `GET /integrations/klaviyo/status` (auth), `POST /integrations/klaviyo/disconnect`
  (auth), `POST /integrations/klaviyo/test-event` (auth).
- `klaviyo.service.ts`:
  - Build the authorize URL with PKCE (store verifier + state server-side).
  - Callback: validate state, exchange code + verifier for tokens, encrypt + upsert
    `KlaviyoConnection`, set `tokenExpiresAt`.
  - `getValidAccessToken(orgId)`: refresh when near expiry; persist rotated tokens; on
    refresh failure set `status = expired`.
  - `upsertProfile({ email, externalId })`, `createEvent(payload)`,
    `updateProfileProperties(...)` (the last one is exercised fully in chunk 3, but
    implement the client method now).
  - `sendTestEvent()`: create a sample `Item Returned` event with a fixed `unique_id` to
    prove connectivity.
  - `disconnect()`: revoke + clear tokens.
- `klaviyo.repository.ts`, `klaviyo.types.ts`, and tests (token-refresh logic with a
  mocked token endpoint; payload building).
- All requests send the pinned `revision` header and respect `429` `Retry-After`.

### 5. Webhooks module (`apps/api/src/modules/webhooks/`)
- `middleware/raw-body.ts`: capture the raw body for webhook routes only (before JSON
  parsing) so HMAC is byte-accurate.
- `webhooks.controller.ts`: routes
  `POST /webhooks/shopify/returns`, `POST /webhooks/shopify/refunds`,
  `POST /webhooks/shopify/app-uninstalled`.
- `webhooks.service.ts`:
  - Verify `X-Shopify-Hmac-Sha256` against the raw body + app secret; reject `401` on
    mismatch.
  - Resolve the organization from `X-Shopify-Shop-Domain`.
  - Upsert `WebhookEvent` by `(source, externalWebhookId)` using `X-Shopify-Webhook-Id`;
    if it already exists, ack `200` without duplicating.
  - `app/uninstalled`: mark the Shopify connection uninstalled.
  - Respond `200` quickly. **Do not process returns yet** (that is chunk 3); just store.
- Tests: valid vs invalid HMAC, duplicate webhook id dedup.

### 6. Frontend (`apps/web`)
- `features/onboarding/OnboardingPage.tsx`: "Connect Shopify" and "Connect Klaviyo"
  actions redirecting to the install/connect endpoints; show a completed state when both
  are connected (poll status).
- `features/integrations/IntegrationSettingsPage.tsx`: a status card per connection
  (shop domain, scopes, token expiry, status) with reconnect/disconnect and, for
  Klaviyo, a "Send test event" button; toast the result.
- `api/endpoints.ts`: add typed calls for both status endpoints, disconnect, and
  test-event.
- Update the private-route guard so an unconnected org lands on `/onboarding`.
- Add nav links for Integrations.

### 7. Shared types
- Add integration status DTOs to `packages/shared/src/api.ts`
  (`ShopifyStatus`, `KlaviyoStatus`). Flesh out `klaviyo.ts` event/profile types used by
  the client.

## Constraints / guardrails

- Do **not** implement return normalization, the processing worker, mappings, the returns
  dashboard, or profile calculations. Webhooks are **store-only** in this chunk.
- Never log or return decrypted tokens. Encrypt everything sensitive via `lib/crypto.ts`.
- Keep OAuth `state`/PKCE server-side and single-use.
- Pin and use the API versions from env (`SHOPIFY_API_VERSION`, `KLAVIYO_API_REVISION`).

## Verify before finishing

1. Migration adds the three tables.
2. From the UI, connect Shopify in the dev store; `ShopifyConnection` row created with an
   encrypted token; webhooks appear registered in the store.
3. Connect Klaviyo; tokens stored; forcing a near-expiry refresh succeeds.
4. Trigger a real return in the dev store; confirm `getReturn` returns full data (log it).
5. `POST /integrations/klaviyo/test-event` -> event visible in Klaviyo.
6. Send a signed webhook (valid + invalid HMAC + duplicate id) and confirm store + dedup +
   rejection behavior.
7. Integration Settings shows both connections as active.
