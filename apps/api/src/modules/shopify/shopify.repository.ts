import { prisma } from "../../lib/prisma.js";

export const shopifyRepository = {
  findByOrg(organizationId: string) {
    return prisma.shopifyConnection.findUnique({ where: { organizationId } });
  },

  findByShopDomain(shopDomain: string) {
    return prisma.shopifyConnection.findUnique({ where: { shopDomain } });
  },

  upsert(params: {
    organizationId: string;
    shopDomain: string;
    encryptedAccessToken: string;
    scopes: string;
  }) {
    return prisma.shopifyConnection.upsert({
      where: { organizationId: params.organizationId },
      create: {
        organizationId: params.organizationId,
        shopDomain: params.shopDomain,
        encryptedAccessToken: params.encryptedAccessToken,
        scopes: params.scopes,
        status: "active",
      },
      update: {
        shopDomain: params.shopDomain,
        encryptedAccessToken: params.encryptedAccessToken,
        scopes: params.scopes,
        status: "active",
        uninstalledAt: null,
      },
    });
  },

  markUninstalled(organizationId: string) {
    return prisma.shopifyConnection.update({
      where: { organizationId },
      data: { status: "uninstalled", uninstalledAt: new Date() },
    });
  },

  markUninstalledByDomain(shopDomain: string) {
    return prisma.shopifyConnection.updateMany({
      where: { shopDomain },
      data: { status: "uninstalled", uninstalledAt: new Date() },
    });
  },
};
