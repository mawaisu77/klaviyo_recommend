import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { shopifyService } from "./shopify.service.js";

const SECRET = "test-shopify-secret";

describe("shopifyService.verifyWebhookHmac", () => {
  it("accepts a valid signature", () => {
    const body = Buffer.from(JSON.stringify({ id: 1, foo: "bar" }));
    const hmac = createHmac("sha256", SECRET).update(body).digest("base64");
    expect(shopifyService.verifyWebhookHmac(body, hmac)).toBe(true);
  });

  it("rejects an invalid signature", () => {
    const body = Buffer.from(JSON.stringify({ id: 1 }));
    expect(shopifyService.verifyWebhookHmac(body, "not-a-real-hmac")).toBe(false);
  });

  it("rejects a missing signature", () => {
    const body = Buffer.from("{}");
    expect(shopifyService.verifyWebhookHmac(body, undefined)).toBe(false);
  });
});
