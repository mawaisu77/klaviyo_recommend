import { notFound } from "../../lib/errors.js";
import { organizationsRepository } from "./organizations.repository.js";

export const organizationsService = {
  async getForUser(userId: string) {
    const membership = await organizationsRepository.findByUserId(userId);
    if (!membership) throw notFound("Organization not found for user");
    return {
      id: membership.organization.id,
      name: membership.organization.name,
      plan: membership.organization.plan,
      role: membership.role,
    };
  },
};
