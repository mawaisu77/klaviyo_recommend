import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { unauthorized } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";

export interface AuthContext {
  userId: string;
  organizationId: string;
  role: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export const AUTH_COOKIE = "rs_session";

interface TokenPayload {
  userId: string;
}

export function signSession(userId: string): string {
  return jwt.sign({ userId } satisfies TokenPayload, env.JWT_SECRET, {
    expiresIn: "7d",
  });
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = req.cookies?.[AUTH_COOKIE] as string | undefined;
    if (!token) throw unauthorized("Not authenticated");

    let decoded: TokenPayload;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch {
      throw unauthorized("Invalid or expired session");
    }

    const membership = await prisma.organizationUser.findFirst({
      where: { userId: decoded.userId },
    });
    if (!membership) throw unauthorized("No organization for user");

    req.auth = {
      userId: decoded.userId,
      organizationId: membership.organizationId,
      role: membership.role,
    };
    next();
  } catch (err) {
    next(err);
  }
}

export function getAuth(req: Request): AuthContext {
  if (!req.auth) throw unauthorized("Not authenticated");
  return req.auth;
}
