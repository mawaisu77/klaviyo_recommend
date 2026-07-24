import { Router } from "express";
import { z } from "zod";
import { isProd } from "../../config/env.js";
import { asyncHandler } from "../../lib/http.js";
import { AUTH_COOKIE, getAuth, requireAuth, signSession } from "../../middleware/auth.js";
import { authService } from "./auth.service.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  organizationName: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

export const authController = Router();

authController.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = registerSchema.parse(req.body);
    const { userId } = await authService.register(body);
    res.cookie(AUTH_COOKIE, signSession(userId), cookieOptions);
    res.status(201).json(await authService.me(userId));
  }),
);

authController.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const { userId } = await authService.login(body);
    res.cookie(AUTH_COOKIE, signSession(userId), cookieOptions);
    res.json(await authService.me(userId));
  }),
);

authController.post(
  "/logout",
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.clearCookie(AUTH_COOKIE, { path: "/" });
    res.status(204).end();
  }),
);

authController.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);
    res.json(await authService.me(userId));
  }),
);
