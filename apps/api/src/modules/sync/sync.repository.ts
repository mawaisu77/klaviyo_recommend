import type { NormalizedReturn } from "@returnsense/shared";
import { prisma } from "../../lib/prisma.js";

export const syncRepository = {
  getWebhookEvent(id: string) {
    return prisma.webhookEvent.findUnique({ where: { id } });
  },

  setWebhookStatus(id: string, status: string, processedAt?: Date) {
    return prisma.webhookEvent.update({
      where: { id },
      data: { status, processedAt: processedAt ?? null },
    });
  },

  async upsertReturn(organizationId: string, normalized: NormalizedReturn, rawData: unknown) {
    const existing = await prisma.return.findUnique({
      where: {
        organizationId_shopifyReturnId: {
          organizationId,
          shopifyReturnId: normalized.returnId,
        },
      },
    });

    const scalarData = {
      organizationId,
      shopifyReturnId: normalized.returnId,
      shopifyOrderId: normalized.orderId,
      orderNumber: normalized.orderNumber,
      customerEmail: normalized.customer.email,
      status: normalized.status,
      currency: normalized.currency,
      totalReturnedValue: normalized.totalReturnedValue,
      returnCreatedAt: new Date(normalized.createdAt),
      rawData: rawData as object,
    };

    if (existing) {
      await prisma.returnItem.deleteMany({ where: { returnId: existing.id } });
      return prisma.return.update({
        where: { id: existing.id },
        data: {
          ...scalarData,
          items: { create: normalized.items.map(toItemData) },
        },
        include: { items: true },
      });
    }

    return prisma.return.create({
      data: {
        ...scalarData,
        items: { create: normalized.items.map(toItemData) },
      },
      include: { items: true },
    });
  },

  getReturnsForCustomer(organizationId: string, email: string) {
    return prisma.return.findMany({
      where: { organizationId, customerEmail: email },
      include: { items: true },
      orderBy: { returnCreatedAt: "desc" },
    });
  },

  async listReturns(organizationId: string, page: number, pageSize: number) {
    const [rows, total] = await Promise.all([
      prisma.return.findMany({
        where: { organizationId },
        include: { items: true },
        orderBy: { returnCreatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.return.count({ where: { organizationId } }),
    ]);
    return { rows, total };
  },

  getReturnDetail(organizationId: string, id: string) {
    return prisma.return.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });
  },

  syncJobsForReturn(returnId: string) {
    return prisma.syncJob.findMany({
      where: { returnId },
      orderBy: { createdAt: "desc" },
    });
  },

  syncJobsForReturns(returnIds: string[]) {
    return prisma.syncJob.findMany({ where: { returnId: { in: returnIds } } });
  },

  async findOrCreateSyncJob(params: {
    organizationId: string;
    returnId: string;
    returnItemId: string | null;
    eventType: string;
  }) {
    const existing = await prisma.syncJob.findFirst({
      where: {
        organizationId: params.organizationId,
        returnId: params.returnId,
        returnItemId: params.returnItemId,
        eventType: params.eventType,
      },
    });
    if (existing) return existing;
    return prisma.syncJob.create({ data: { ...params, status: "pending" } });
  },

  updateSyncJob(
    id: string,
    data: {
      status?: string;
      klaviyoEventId?: string | null;
      errorMessage?: string | null;
      attemptCount?: number;
      processedAt?: Date | null;
    },
  ) {
    return prisma.syncJob.update({ where: { id }, data });
  },

  getSyncJob(organizationId: string, id: string) {
    return prisma.syncJob.findFirst({ where: { id, organizationId } });
  },

  async listSyncJobs(
    organizationId: string,
    status: string | undefined,
    page: number,
    pageSize: number,
  ) {
    const where = { organizationId, ...(status ? { status } : {}) };
    const [rows, total] = await Promise.all([
      prisma.syncJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.syncJob.count({ where }),
    ]);
    return { rows, total };
  },

  syncJobCounts(organizationId: string) {
    return prisma.syncJob.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
    });
  },

  recentFailures(organizationId: string, take = 20) {
    return prisma.syncJob.findMany({
      where: { organizationId, status: "failed" },
      orderBy: { createdAt: "desc" },
      take,
    });
  },

  returnsWithItems(organizationId: string) {
    return prisma.return.findMany({
      where: { organizationId },
      include: { items: true },
    });
  },
};

function toItemData(item: NormalizedReturn["items"][number]) {
  return {
    productId: item.productId,
    variantId: item.variantId,
    sku: item.sku,
    title: item.productTitle,
    variantTitle: item.variantTitle,
    quantity: item.quantity,
    reason: item.returnReason,
    marketingCategory: item.marketingCategory,
    returnedValue: item.returnedValue,
  };
}
