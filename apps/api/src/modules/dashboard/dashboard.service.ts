import type {
  DashboardReasonsDto,
  DashboardSummaryDto,
  SyncHealthDto,
} from "@returnsense/shared";
import { syncRepository } from "../sync/sync.repository.js";

export const dashboardService = {
  async summary(organizationId: string): Promise<DashboardSummaryDto> {
    const returns = await syncRepository.returnsWithItems(organizationId);
    const counts = await syncRepository.syncJobCounts(organizationId);

    const totalReturnedItems = returns.reduce(
      (sum, r) => sum + r.items.reduce((s, i) => s + i.quantity, 0),
      0,
    );
    const totalReturnedValue = returns.reduce(
      (sum, r) => sum + r.items.reduce((s, i) => s + Number(i.returnedValue), 0),
      0,
    );

    return {
      totalReturns: returns.length,
      totalReturnedItems,
      totalReturnedValue: round2(totalReturnedValue),
      eventsSuccess: countFor(counts, "success"),
      eventsFailed: countFor(counts, "failed"),
    };
  },

  async reasons(organizationId: string): Promise<DashboardReasonsDto> {
    const returns = await syncRepository.returnsWithItems(organizationId);
    const byReason = new Map<string, number>();
    const byCategory = new Map<string, number>();
    const byProduct = new Map<string, number>();

    for (const r of returns) {
      for (const item of r.items) {
        inc(byReason, item.reason, item.quantity);
        inc(byCategory, item.marketingCategory, item.quantity);
        inc(byProduct, item.title, item.quantity);
      }
    }

    return {
      byReason: toSorted(byReason),
      byCategory: toSorted(byCategory),
      topProducts: toSorted(byProduct).slice(0, 10),
    };
  },

  async syncHealth(organizationId: string): Promise<SyncHealthDto> {
    const counts = await syncRepository.syncJobCounts(organizationId);
    const failures = await syncRepository.recentFailures(organizationId);
    return {
      pending: countFor(counts, "pending"),
      success: countFor(counts, "success"),
      failed: countFor(counts, "failed"),
      recentFailures: failures.map((job) => ({
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
      })),
    };
  },
};

function countFor(
  counts: Array<{ status: string; _count: { _all: number } }>,
  status: string,
): number {
  return counts.find((c) => c.status === status)?._count._all ?? 0;
}

function inc(map: Map<string, number>, key: string, by: number): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

function toSorted(map: Map<string, number>): Array<{ key: string; count: number }> {
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
