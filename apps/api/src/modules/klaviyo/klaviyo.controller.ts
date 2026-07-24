import { Router } from "express";
import { env } from "../../config/env.js";
import { asyncHandler } from "../../lib/http.js";
import { getAuth, requireAuth } from "../../middleware/auth.js";
import { klaviyoService } from "./klaviyo.service.js";

export const klaviyoController = Router();

klaviyoController.get(
  "/connect",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId } = getAuth(req);
    const url = await klaviyoService.buildConnectUrl(organizationId);
    res.redirect(url);
  }),
);

klaviyoController.get(
  "/callback",
  asyncHandler(async (req, res) => {
    await klaviyoService.handleCallback(req.query as Record<string, string>);
    res.redirect(`${env.WEB_URL}/integrations?klaviyo=connected`);
  }),
);

klaviyoController.get(
  "/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId } = getAuth(req);
    res.json(await klaviyoService.getStatus(organizationId));
  }),
);

klaviyoController.post(
  "/disconnect",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId } = getAuth(req);
    await klaviyoService.disconnect(organizationId);
    res.status(204).end();
  }),
);

klaviyoController.post(
  "/test-event",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId } = getAuth(req);
    const uniqueId = await klaviyoService.sendTestEvent(organizationId);
    res.json({ ok: true, uniqueId });
  }),
);
