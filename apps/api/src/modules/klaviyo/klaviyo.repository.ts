import { prisma } from "../../lib/prisma.js";

export const klaviyoRepository = {
  findByOrg(organizationId: string) {
    return prisma.klaviyoConnection.findUnique({ where: { organizationId } });
  },

  upsert(params: {
    organizationId: string;
    accountId?: string | null;
    encryptedAccessToken: string;
    encryptedRefreshToken: string;
    tokenExpiresAt: Date;
    scopes: string;
  }) {
    return prisma.klaviyoConnection.upsert({
      where: { organizationId: params.organizationId },
      create: {
        organizationId: params.organizationId,
        accountId: params.accountId ?? null,
        encryptedAccessToken: params.encryptedAccessToken,
        encryptedRefreshToken: params.encryptedRefreshToken,
        tokenExpiresAt: params.tokenExpiresAt,
        scopes: params.scopes,
        status: "active",
      },
      update: {
        encryptedAccessToken: params.encryptedAccessToken,
        encryptedRefreshToken: params.encryptedRefreshToken,
        tokenExpiresAt: params.tokenExpiresAt,
        scopes: params.scopes,
        status: "active",
      },
    });
  },

  updateTokens(
    organizationId: string,
    data: {
      encryptedAccessToken: string;
      encryptedRefreshToken: string;
      tokenExpiresAt: Date;
    },
  ) {
    return prisma.klaviyoConnection.update({
      where: { organizationId },
      data,
    });
  },

  setStatus(organizationId: string, status: string) {
    return prisma.klaviyoConnection.update({
      where: { organizationId },
      data: { status },
    });
  },

  delete(organizationId: string) {
    return prisma.klaviyoConnection.deleteMany({ where: { organizationId } });
  },
};
