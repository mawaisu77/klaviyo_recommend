import type {
  Paginated,
  ReturnDetailDto,
  ReturnItemDto,
  ReturnListItemDto,
  SyncJobDto,
} from "@returnsense/shared";
import { notFound } from "../../lib/errors.js";
import { syncRepository } from "../sync/sync.repository.js";
import { syncService } from "../sync/sync.service.js";

type SyncJobRow = Awaited<ReturnType<typeof syncRepository.syncJobsForReturn>>[number];
type ReturnRow = Awaited<ReturnType<typeof syncRepository.getReturnDetail>>;

export const returnsService = {
  async list(
    organizationId: string,
    page: number,
    pageSize: number,
  ): Promise<Paginated<ReturnListItemDto>> {
    const { rows, total } = await syncRepository.listReturns(organizationId, page, pageSize);
    const jobs = await syncRepository.syncJobsForReturns(rows.map((r) => r.id));
    const jobsByReturn = groupBy(jobs, (j) => j.returnId);

    return {
      items: rows.map((r) => ({
        id: r.id,
        shopifyReturnId: r.shopifyReturnId,
        orderNumber: r.orderNumber,
        customerEmail: r.customerEmail,
        status: r.status,
        currency: r.currency,
        totalReturnedValue: Number(r.totalReturnedValue),
        returnCreatedAt: r.returnCreatedAt.toISOString(),
        itemCount: r.items.length,
        syncStatus: deriveSyncStatus(jobsByReturn.get(r.id) ?? []),
      })),
      total,
      page,
      pageSize,
    };
  },

  async detail(organizationId: string, id: string): Promise<ReturnDetailDto> {
    const r = await syncRepository.getReturnDetail(organizationId, id);
    if (!r) throw notFound("Return not found");
    const jobs = await syncRepository.syncJobsForReturn(r.id);

    return {
      id: r.id,
      shopifyReturnId: r.shopifyReturnId,
      shopifyOrderId: r.shopifyOrderId,
      orderNumber: r.orderNumber,
      customerEmail: r.customerEmail,
      status: r.status,
      currency: r.currency,
      totalReturnedValue: Number(r.totalReturnedValue),
      returnCreatedAt: r.returnCreatedAt.toISOString(),
      itemCount: r.items.length,
      syncStatus: deriveSyncStatus(jobs),
      items: r.items.map(toItemDto),
      syncJobs: jobs.map(toSyncJobDto),
    };
  },

  async listSyncJobs(
    organizationId: string,
    status: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<Paginated<SyncJobDto>> {
    const { rows, total } = await syncRepository.listSyncJobs(
      organizationId,
      status,
      page,
      pageSize,
    );
    return { items: rows.map(toSyncJobDto), total, page, pageSize };
  },

  async getSyncJob(organizationId: string, id: string): Promise<SyncJobDto> {
    const job = await syncRepository.getSyncJob(organizationId, id);
    if (!job) throw notFound("Sync job not found");
    return toSyncJobDto(job);
  },

  async retrySyncJob(organizationId: string, id: string): Promise<void> {
    const job = await syncRepository.getSyncJob(organizationId, id);
    if (!job) throw notFound("Sync job not found");
    await syncService.retrySyncJob(organizationId, id);
  },
};

function deriveSyncStatus(jobs: SyncJobRow[]): string {
  if (jobs.length === 0) return "pending";
  if (jobs.some((j) => j.status === "failed")) return "failed";
  if (jobs.every((j) => j.status === "success")) return "success";
  return "pending";
}

function toItemDto(item: NonNullable<ReturnRow>["items"][number]): ReturnItemDto {
  return {
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    sku: item.sku,
    title: item.title,
    variantTitle: item.variantTitle,
    quantity: item.quantity,
    reason: item.reason,
    marketingCategory: item.marketingCategory,
    returnedValue: Number(item.returnedValue),
  };
}

function toSyncJobDto(job: SyncJobRow): SyncJobDto {
  return {
    id: job.id,
    returnId: job.returnId,
    returnItemId: job.returnItemId,
    eventType: job.eventType,
    klaviyoEventId: job.klaviyoEventId,
    status: job.status,
    attemptCount: job.attemptCount,
    errorMessage: job.errorMessage,
    processedAt: job.processedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
  };
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const arr = map.get(key) ?? [];
    arr.push(item);
    map.set(key, arr);
  }
  return map;
}
