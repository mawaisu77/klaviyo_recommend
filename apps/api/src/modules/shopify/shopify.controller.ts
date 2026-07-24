import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../lib/http.js";
import { getAuth, requireAuth } from "../../middleware/auth.js";
import { shopifyService } from "./shopify.service.js";

export const shopifyController = Router();

const installSchema = z.object({ shop: z.string().min(3) });

shopifyController.get(
  "/install",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId } = getAuth(req);
    const { shop } = installSchema.parse(req.query);
    const url = await shopifyService.buildInstallUrl(organizationId, shop);
    res.redirect(url);
  }),
);

shopifyController.get(
  "/callback",
  asyncHandler(async (req, res) => {
    await shopifyService.handleCallback(req.query as Record<string, string>);
    res.redirect(`${env.WEB_URL}/integrations?shopify=connected`);
  }),
);

shopifyController.get(
  "/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId } = getAuth(req);
    res.json(await shopifyService.getStatus(organizationId));
  }),
);

shopifyController.post(
  "/disconnect",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId } = getAuth(req);
    await shopifyService.disconnect(organizationId);
    res.status(204).end();
  }),
);
