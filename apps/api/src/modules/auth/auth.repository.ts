import { prisma } from "../../lib/prisma.js";

export const authRepository = {
  findUserByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findUserById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  async createUserWithOrganization(params: {
    email: string;
    passwordHash: string;
    organizationName: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: params.email, passwordHash: params.passwordHash },
      });
      const organization = await tx.organization.create({
        data: { name: params.organizationName },
      });
      await tx.organizationUser.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: "owner",
        },
      });
      return { user, organization };
    });
  },
};
