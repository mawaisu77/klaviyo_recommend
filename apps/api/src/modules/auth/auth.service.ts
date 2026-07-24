import bcrypt from "bcryptjs";
import type { MeResponse } from "@returnsense/shared";
import { badRequest, conflict, notFound, unauthorized } from "../../lib/errors.js";
import { mappingsService } from "../mappings/mappings.service.js";
import { organizationsService } from "../organizations/organizations.service.js";
import { authRepository } from "./auth.repository.js";

const SALT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export const authService = {
  async register(params: {
    email: string;
    password: string;
    organizationName: string;
  }): Promise<{ userId: string }> {
    const email = params.email.trim().toLowerCase();
    if (params.password.length < 8) {
      throw badRequest("Password must be at least 8 characters");
    }
    const existing = await authRepository.findUserByEmail(email);
    if (existing) throw conflict("An account with this email already exists");

    const passwordHash = await hashPassword(params.password);
    const { user, organization } = await authRepository.createUserWithOrganization({
      email,
      passwordHash,
      organizationName: params.organizationName.trim() || "My Store",
    });
    await mappingsService.seedDefaults(organization.id);
    return { userId: user.id };
  },

  async login(params: { email: string; password: string }): Promise<{ userId: string }> {
    const email = params.email.trim().toLowerCase();
    const user = await authRepository.findUserByEmail(email);
    if (!user) throw unauthorized("Invalid email or password");

    const ok = await verifyPassword(params.password, user.passwordHash);
    if (!ok) throw unauthorized("Invalid email or password");
    return { userId: user.id };
  },

  async me(userId: string): Promise<MeResponse> {
    const user = await authRepository.findUserById(userId);
    if (!user) throw notFound("User not found");
    const organization = await organizationsService.getForUser(userId);
    return {
      user: { id: user.id, email: user.email },
      organization,
    };
  },
};
