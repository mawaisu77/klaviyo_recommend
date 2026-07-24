import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/http.js";
import { getAuth, requireAuth } from "../../middleware/auth.js";
import { returnsService } from "./returns.service.js";

export const returnsController = Router();

const pageSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: z.string().optional(),
});

returnsController.get(
  "/returns",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId } = getAuth(req);
    const { page, pageSize } = pageSchema.parse(req.query);
    res.json(await returnsService.list(organizationId, page, pageSize));
  }),
);

returnsController.get(
  "/returns/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId } = getAuth(req);
    res.json(await returnsService.detail(organizationId, req.params.id));
  }),
);

returnsController.get(
  "/sync-jobs",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId } = getAuth(req);
    const { page, pageSize, status } = pageSchema.parse(req.query);
    res.json(await returnsService.listSyncJobs(organizationId, status, page, pageSize));
  }),
);

returnsController.get(
  "/sync-jobs/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId } = getAuth(req);
    res.json(await returnsService.getSyncJob(organizationId, req.params.id));
  }),
);

returnsController.post(
  "/sync-jobs/:id/retry",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId } = getAuth(req);
    await returnsService.retrySyncJob(organizationId, req.params.id);
    res.json({ ok: true });
  }),
);
