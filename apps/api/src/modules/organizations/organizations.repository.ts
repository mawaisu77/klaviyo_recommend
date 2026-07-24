import { prisma } from "../../lib/prisma.js";

export const organizationsRepository = {
  findByUserId(userId: string) {
    return prisma.organizationUser.findFirst({
      where: { userId },
      include: { organization: true },
    });
  },

  findById(organizationId: string) {
    return prisma.organization.findUnique({ where: { id: organizationId } });
  },
};
