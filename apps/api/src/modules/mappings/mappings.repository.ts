import { prisma } from "../../lib/prisma.js";

export const mappingsRepository = {
  list(organizationId: string) {
    return prisma.returnReasonMapping.findMany({
      where: { organizationId },
      orderBy: { sourceReason: "asc" },
    });
  },

  findActive(organizationId: string, sourceReason: string) {
    return prisma.returnReasonMapping.findUnique({
      where: {
        organizationId_sourceReason: { organizationId, sourceReason },
      },
    });
  },

  create(params: {
    organizationId: string;
    sourceReason: string;
    marketingCategory: string;
  }) {
    return prisma.returnReasonMapping.create({ data: params });
  },

  update(
    id: string,
    organizationId: string,
    data: { marketingCategory?: string; isActive?: boolean },
  ) {
    return prisma.returnReasonMapping.updateMany({
      where: { id, organizationId },
      data,
    });
  },

  upsertDefault(params: {
    organizationId: string;
    sourceReason: string;
    marketingCategory: string;
  }) {
    return prisma.returnReasonMapping.upsert({
      where: {
        organizationId_sourceReason: {
          organizationId: params.organizationId,
          sourceReason: params.sourceReason,
        },
      },
      create: params,
      update: {},
    });
  },
};
