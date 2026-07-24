import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/http.js";
import { getAuth, requireAuth } from "../../middleware/auth.js";
import { mappingsService } from "./mappings.service.js";

export const mappingsController = Router();

const createSchema = z.object({
  sourceReason: z.string().min(1),
  marketingCategory: z.string().min(1),
});

const updateSchema = z.object({
  marketingCategory: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

mappingsController.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId } = getAuth(req);
    res.json(await mappingsService.list(organizationId));
  }),
);

mappingsController.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId } = getAuth(req);
    const body = createSchema.parse(req.body);
    res.status(201).json(await mappingsService.create(organizationId, body));
  }),
);

mappingsController.patch(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { organizationId } = getAuth(req);
    const body = updateSchema.parse(req.body);
    await mappingsService.update(organizationId, req.params.id, body);
    res.status(204).end();
  }),
);
