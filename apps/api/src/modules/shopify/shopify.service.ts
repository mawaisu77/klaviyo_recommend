import { createHmac, timingSafeEqual } from "node:crypto";
import type { ShopifyStatus } from "@returnsense/shared";
import { env } from "../../config/env.js";
import { badRequest, notFound, unauthorized } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";
import { decrypt, encrypt } from "../../lib/crypto.js";
import { oauthState } from "../../lib/oauth-state.js";
import { shopifyRepository } from "./shopify.repository.js";
import type { ShopifyReturnGraph } from "./shopify.types.js";

const SHOP_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/;

const WEBHOOK_TOPICS: Array<{ topic: string; path: string }> = [
  { topic: "returns/request", path: "returns" },
  { topic: "returns/approve", path: "returns" },
  { topic: "returns/decline", path: "returns" },
  { topic: "returns/cancel", path: "returns" },
  { topic: "returns/close", path: "returns" },
  { topic: "refunds/create", path: "refunds" },
  { topic: "app/uninstalled", path: "app-uninstalled" },
];

function assertValidShop(shop: string): void {
  if (!SHOP_REGEX.test(shop)) throw badRequest("Invalid shop domain");
}

export const shopifyService = {
  /** Verifies the HMAC on an OAuth callback query string. */
  verifyQueryHmac(query: Record<string, unknown>): boolean {
    const { hmac, signature, ...rest } = query as Record<string, string>;
    void signature;
    if (!hmac) return false;
    const message = Object.keys(rest)
      .sort()
      .map((key) => `${key}=${rest[key]}`)
      .join("&");
    const digest = createHmac("sha256", env.SHOPIFY_API_SECRET)
      .update(message)
      .digest("hex");
    return safeEqualHex(digest, hmac);
  },

  /** Verifies a Shopify webhook HMAC (base64) over the raw request body. */
  verifyWebhookHmac(rawBody: Buffer, hmacHeader: string | undefined): boolean {
    if (!hmacHeader) return false;
    const digest = createHmac("sha256", env.SHOPIFY_API_SECRET)
      .update(rawBody)
      .digest("base64");
    return safeEqualBase64(digest, hmacHeader);
  },

  async buildInstallUrl(organizationId: string, shop: string): Promise<string> {
    assertValidShop(shop);
    const state = await oauthState.create("shopify", { organizationId, shop });
    const redirectUri = `${env.APP_URL}/api/integrations/shopify/callback`;
    const params = new URLSearchParams({
      client_id: env.SHOPIFY_API_KEY,
      scope: env.SHOPIFY_SCOPES,
      redirect_uri: redirectUri,
      state,
    });
    return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
  },

  async handleCallback(query: Record<string, string>): Promise<{ organizationId: string }> {
    const { shop, code, state } = query;
    if (!shop || !code || !state) throw badRequest("Missing OAuth parameters");
    assertValidShop(shop);
    if (!this.verifyQueryHmac(query)) throw unauthorized("Invalid HMAC");

    const stored = await oauthState.consume("shopify", state);
    if (!stored || stored.shop !== shop) throw unauthorized("Invalid OAuth state");

    const token = await exchangeCodeForToken(shop, code);
    await shopifyRepository.upsert({
      organizationId: stored.organizationId,
      shopDomain: shop,
      encryptedAccessToken: encrypt(token.access_token),
      scopes: token.scope,
    });

    await this.registerWebhooks(shop, token.access_token).catch((err) => {
      logger.error({ err }, "Failed to register Shopify webhooks");
    });

    return { organizationId: stored.organizationId };
  },

  async registerWebhooks(shop: string, accessToken: string): Promise<void> {
    const address = `${env.APP_URL}/api/webhooks/shopify`;
    for (const { topic, path } of WEBHOOK_TOPICS) {
      const res = await fetch(
        `https://${shop}/admin/api/${env.SHOPIFY_API_VERSION}/webhooks.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            webhook: { topic, address: `${address}/${path}`, format: "json" },
          }),
        },
      );
      if (!res.ok && res.status !== 422) {
        logger.warn({ topic, status: res.status }, "Webhook registration issue");
      }
    }
  },

  async graphql<T>(
    organizationId: string,
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T> {
    const connection = await shopifyRepository.findByOrg(organizationId);
    if (!connection || connection.status !== "active") {
      throw notFound("Shopify is not connected");
    }
    const accessToken = decrypt(connection.encryptedAccessToken);

    const run = async (): Promise<Response> =>
      fetch(
        `https://${connection.shopDomain}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query, variables }),
        },
      );

    let res = await run();
    // Basic backoff on throttling.
    for (let attempt = 0; attempt < 3 && res.status === 429; attempt += 1) {
      await sleep(1000 * (attempt + 1));
      res = await run();
    }

    if (res.status === 401) throw unauthorized("Shopify token invalid");
    if (!res.ok) throw new Error(`Shopify GraphQL error ${res.status}`);

    const body = (await res.json()) as { data?: T; errors?: unknown };
    if (body.errors) {
      throw new Error(`Shopify GraphQL errors: ${JSON.stringify(body.errors)}`);
    }
    return body.data as T;
  },

  async getReturn(organizationId: string, returnId: string): Promise<ShopifyReturnGraph> {
    const data = await this.graphql<{ return: ShopifyReturnGraph | null }>(
      organizationId,
      RETURN_QUERY,
      { id: toGid("Return", returnId) },
    );
    if (!data.return) throw notFound("Return not found in Shopify");
    return data.return;
  },

  async getStatus(organizationId: string): Promise<ShopifyStatus> {
    const c = await shopifyRepository.findByOrg(organizationId);
    return {
      connected: !!c && c.status === "active",
      status: c?.status ?? "disconnected",
      shopDomain: c?.shopDomain ?? null,
      scopes: c?.scopes ?? null,
      installedAt: c?.installedAt?.toISOString() ?? null,
    };
  },

  async disconnect(organizationId: string): Promise<void> {
    const c = await shopifyRepository.findByOrg(organizationId);
    if (!c) return;
    await shopifyRepository.markUninstalled(organizationId);
  },
};

async function exchangeCodeForToken(
  shop: string,
  code: string,
): Promise<{ access_token: string; scope: string }> {
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.SHOPIFY_API_KEY,
      client_secret: env.SHOPIFY_API_SECRET,
      code,
    }),
  });
  if (!res.ok) throw badRequest("Failed to exchange Shopify code");
  return (await res.json()) as { access_token: string; scope: string };
}

function toGid(resource: string, id: string): string {
  return id.startsWith("gid://") ? id : `gid://shopify/${resource}/${id}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

function safeEqualBase64(a: string, b: string): boolean {
  try {
    return timingSafeEqual(Buffer.from(a, "base64"), Buffer.from(b, "base64"));
  } catch {
    return false;
  }
}

export const RETURN_QUERY = /* GraphQL */ `
  query GetReturn($id: ID!) {
    return(id: $id) {
      id
      status
      order {
        id
        name
        currencyCode
        createdAt
        customer {
          id
          email
          phone
        }
      }
      returnLineItems(first: 50) {
        edges {
          node {
            id
            quantity
            returnReason
            returnReasonNote
            fulfillmentLineItem {
              lineItem {
                id
                sku
                title
                variantTitle
                product {
                  id
                }
                variant {
                  id
                }
                originalUnitPriceSet {
                  shopMoney {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;
