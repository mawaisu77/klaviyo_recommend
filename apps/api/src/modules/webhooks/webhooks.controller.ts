import { Router, type Request, type Response } from "express";
import { unauthorized } from "../../lib/errors.js";
import { asyncHandler } from "../../lib/http.js";
import { shopifyService } from "../shopify/shopify.service.js";
import { webhooksService } from "./webhooks.service.js";

export const webhooksController = Router();

function verifyOrThrow(req: Request): void {
  const hmac = req.get("X-Shopify-Hmac-Sha256") ?? undefined;
  if (!req.rawBody || !shopifyService.verifyWebhookHmac(req.rawBody, hmac)) {
    throw unauthorized("Invalid webhook signature");
  }
}

function extract(req: Request) {
  return {
    topic: req.get("X-Shopify-Topic") ?? "unknown",
    externalWebhookId: req.get("X-Shopify-Webhook-Id") ?? "",
    shopDomain: req.get("X-Shopify-Shop-Domain") ?? "",
    payload: req.body as unknown,
  };
}

const ingest = asyncHandler(async (req: Request, res: Response) => {
  verifyOrThrow(req);
  await webhooksService.ingest(extract(req));
  res.status(200).json({ ok: true });
});

webhooksController.post("/shopify/returns", ingest);
webhooksController.post("/shopify/refunds", ingest);

webhooksController.post(
  "/shopify/app-uninstalled",
  asyncHandler(async (req, res) => {
    verifyOrThrow(req);
    await webhooksService.handleUninstall(req.get("X-Shopify-Shop-Domain") ?? "");
    res.status(200).json({ ok: true });
  }),
);
