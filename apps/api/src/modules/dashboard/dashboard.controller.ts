import { Router } from "express";
import { asyncHandler } from "../../lib/http.js";
import { getAuth, requireAuth } from "../../middleware/auth.js";
import { dashboardService } from "./dashboard.service.js";

export const dashboardController = Router();

dashboardController.get(
  "/summary",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId } = getAuth(req);
    res.json(await dashboardService.summary(organizationId));
  }),
);

dashboardController.get(
  "/return-reasons",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId } = getAuth(req);
    res.json(await dashboardService.reasons(organizationId));
  }),
);

dashboardController.get(
  "/sync-health",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId } = getAuth(req);
    res.json(await dashboardService.syncHealth(organizationId));
  }),
);
