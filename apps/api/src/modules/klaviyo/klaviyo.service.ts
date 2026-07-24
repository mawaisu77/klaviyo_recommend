import { createHash, randomBytes } from "node:crypto";
import type {
  KlaviyoEventPayload,
  KlaviyoProfileIdentifier,
  KlaviyoProfileProperties,
  KlaviyoStatus,
} from "@returnsense/shared";
import { env } from "../../config/env.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { decrypt, encrypt } from "../../lib/crypto.js";
import { logger } from "../../lib/logger.js";
import { oauthState } from "../../lib/oauth-state.js";
import { klaviyoRepository } from "./klaviyo.repository.js";

const KLAVIYO_API = "https://a.klaviyo.com";
const AUTHORIZE_URL = "https://www.klaviyo.com/oauth/authorize";
const EXPIRY_BUFFER_MS = 60_000;

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export const klaviyoService = {
  async buildConnectUrl(organizationId: string): Promise<string> {
    if (!env.KLAVIYO_CLIENT_ID) throw badRequest("Klaviyo client is not configured");
    const verifier = base64url(randomBytes(32));
    const challenge = base64url(createHash("sha256").update(verifier).digest());
    const state = await oauthState.create("klaviyo", { organizationId, verifier });
    const params = new URLSearchParams({
      response_type: "code",
      client_id: env.KLAVIYO_CLIENT_ID,
      redirect_uri: `${env.APP_URL}/api/integrations/klaviyo/callback`,
      scope: env.KLAVIYO_SCOPES,
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  },

  async handleCallback(query: Record<string, string>): Promise<{ organizationId: string }> {
    const { code, state } = query;
    if (!code || !state) throw badRequest("Missing OAuth parameters");
    const stored = await oauthState.consume("klaviyo", state);
    if (!stored) throw badRequest("Invalid OAuth state");

    const token = await requestToken({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${env.APP_URL}/api/integrations/klaviyo/callback`,
      code_verifier: stored.verifier,
    });

    await klaviyoRepository.upsert({
      organizationId: stored.organizationId,
      encryptedAccessToken: encrypt(token.access_token),
      encryptedRefreshToken: encrypt(token.refresh_token),
      tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
      scopes: env.KLAVIYO_SCOPES,
    });

    return { organizationId: stored.organizationId };
  },

  async getValidAccessToken(organizationId: string): Promise<string> {
    const c = await klaviyoRepository.findByOrg(organizationId);
    if (!c || c.status === "revoked") throw notFound("Klaviyo is not connected");

    const expiresSoon =
      !c.tokenExpiresAt || c.tokenExpiresAt.getTime() - Date.now() < EXPIRY_BUFFER_MS;
    if (!expiresSoon) return decrypt(c.encryptedAccessToken);

    try {
      const token = await requestToken({
        grant_type: "refresh_token",
        refresh_token: decrypt(c.encryptedRefreshToken),
      });
      await klaviyoRepository.updateTokens(organizationId, {
        encryptedAccessToken: encrypt(token.access_token),
        encryptedRefreshToken: encrypt(token.refresh_token ?? decrypt(c.encryptedRefreshToken)),
        tokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
      });
      return token.access_token;
    } catch (err) {
      logger.error({ err }, "Klaviyo token refresh failed");
      await klaviyoRepository.setStatus(organizationId, "expired");
      throw new Error("Klaviyo token refresh failed; reconnect required");
    }
  },

  async createEvent(organizationId: string, payload: KlaviyoEventPayload): Promise<string> {
    const accessToken = await this.getValidAccessToken(organizationId);
    const body = {
      data: {
        type: "event",
        attributes: {
          properties: payload.properties,
          unique_id: payload.unique_id,
          metric: {
            data: {
              type: "metric",
              attributes: { name: payload.metric.name },
            },
          },
          profile: {
            data: {
              type: "profile",
              attributes: identifierAttributes(payload.profile),
            },
          },
        },
      },
    };
    await this.request(accessToken, "POST", "/api/events/", body);
    return payload.unique_id;
  },

  async upsertProfileProperties(
    organizationId: string,
    identifier: KlaviyoProfileIdentifier,
    properties: KlaviyoProfileProperties,
  ): Promise<void> {
    const accessToken = await this.getValidAccessToken(organizationId);
    const body = {
      data: {
        type: "profile",
        attributes: {
          ...identifierAttributes(identifier),
          properties,
        },
      },
    };
    // profile-import creates or updates by identifier.
    await this.request(accessToken, "POST", "/api/profile-import/", body);
  },

  async sendTestEvent(organizationId: string): Promise<string> {
    const uniqueId = `returnsense-test-${Date.now()}`;
    return this.createEvent(organizationId, {
      metric: { name: "Item Returned" },
      profile: { email: "test@returnsense.dev", external_id: null },
      properties: {
        return_id: "test-return",
        order_id: "test-order",
        order_number: "TEST-1001",
        product_id: "test-product",
        variant_id: "test-variant",
        product_title: "Test Jacket",
        variant_title: "Medium / Black",
        sku: "TEST-M-BLK",
        quantity: 1,
        return_reason: "TOO_SMALL",
        return_category: "SIZE_ISSUE",
        returned_value: 75,
        currency: "USD",
      },
      unique_id: uniqueId,
    });
  },

  async request(
    accessToken: string,
    method: string,
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    const run = async (): Promise<Response> =>
      fetch(`${KLAVIYO_API}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          revision: env.KLAVIYO_API_REVISION,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

    let res = await run();
    for (let attempt = 0; attempt < 3 && res.status === 429; attempt += 1) {
      const retryAfter = Number(res.headers.get("Retry-After") ?? attempt + 1);
      await sleep(retryAfter * 1000);
      res = await run();
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Klaviyo API ${res.status}: ${text}`);
    }
    if (res.status === 204) return null;
    const ct = res.headers.get("content-type") ?? "";
    return ct.includes("json") ? res.json() : null;
  },

  async getStatus(organizationId: string): Promise<KlaviyoStatus> {
    const c = await klaviyoRepository.findByOrg(organizationId);
    return {
      connected: !!c && c.status === "active",
      status: c?.status ?? "disconnected",
      accountId: c?.accountId ?? null,
      tokenExpiresAt: c?.tokenExpiresAt?.toISOString() ?? null,
      scopes: c?.scopes ?? null,
    };
  },

  async disconnect(organizationId: string): Promise<void> {
    await klaviyoRepository.delete(organizationId);
  },
};

function identifierAttributes(id: KlaviyoProfileIdentifier): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  if (id.email) attrs.email = id.email;
  if (id.external_id) attrs.external_id = id.external_id;
  return attrs;
}

async function requestToken(
  params: Record<string, string>,
): Promise<TokenResponse> {
  const basic = Buffer.from(
    `${env.KLAVIYO_CLIENT_ID}:${env.KLAVIYO_CLIENT_SECRET}`,
  ).toString("base64");
  const res = await fetch(`${KLAVIYO_API}/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Klaviyo token error ${res.status}: ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
