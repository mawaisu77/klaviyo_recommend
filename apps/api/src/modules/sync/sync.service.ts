import type { NormalizedReturn } from "@returnsense/shared";
import { logger } from "../../lib/logger.js";
import { klaviyoService } from "../klaviyo/klaviyo.service.js";
import { mappingsService } from "../mappings/mappings.service.js";
import { shopifyService } from "../shopify/shopify.service.js";
import {
  buildUniqueId,
  computeProfileStats,
  eventTypeForTopic,
  normalizeReturn,
} from "./engine/index.js";
import { syncRepository } from "./sync.repository.js";

export const syncService = {
  async processWebhookEvent(webhookEventId: string): Promise<void> {
    const event = await syncRepository.getWebhookEvent(webhookEventId);
    if (!event) {
      logger.warn({ webhookEventId }, "Webhook event not found");
      return;
    }

    await syncRepository.setWebhookStatus(event.id, "processing");

    const eventType = eventTypeForTopic(event.topic);
    if (!eventType) {
      await syncRepository.setWebhookStatus(event.id, "processed", new Date());
      return;
    }

    const returnId = extractReturnId(event.payload);
    if (!returnId) {
      logger.info({ topic: event.topic }, "No return id in payload; skipping");
      await syncRepository.setWebhookStatus(event.id, "processed", new Date());
      return;
    }

    try {
      const graph = await shopifyService.getReturn(event.organizationId, returnId);

      // Pre-resolve categories so normalization stays pure/synchronous.
      const reasons = new Set(
        graph.returnLineItems.edges.map((e) => (e.node.returnReason ?? "OTHER").toUpperCase()),
      );
      const categoryByReason = new Map<string, string>();
      for (const reason of reasons) {
        categoryByReason.set(
          reason,
          await mappingsService.mapReason(event.organizationId, reason),
        );
      }
      const normalized = normalizeReturn(graph, (reason) =>
        categoryByReason.get(reason.toUpperCase()) ?? "OTHER",
      );

      const savedReturn = await syncRepository.upsertReturn(
        event.organizationId,
        normalized,
        event.payload,
      );

      const failures = await this.syncItems(
        event.organizationId,
        savedReturn.id,
        normalized,
        savedReturn.items,
        eventType,
      );

      await this.updateCustomerProfile(event.organizationId, normalized);

      await syncRepository.setWebhookStatus(event.id, "processed", new Date());

      if (failures.length > 0) {
        throw new Error(`${failures.length} item event(s) failed to sync`);
      }
    } catch (err) {
      await syncRepository.setWebhookStatus(event.id, "failed", new Date());
      throw err;
    }
  },

  async syncItems(
    organizationId: string,
    returnId: string,
    normalized: NormalizedReturn,
    savedItems: Array<{ id: string }>,
    eventType: string,
  ): Promise<string[]> {
    const failures: string[] = [];

    for (let i = 0; i < normalized.items.length; i += 1) {
      const item = normalized.items[i];
      const savedItem = savedItems[i];
      const job = await syncRepository.findOrCreateSyncJob({
        organizationId,
        returnId,
        returnItemId: savedItem?.id ?? null,
        eventType,
      });

      if (job.status === "success") continue;

      const attemptCount = job.attemptCount + 1;

      if (!normalized.customer.email && !normalized.customer.shopifyCustomerId) {
        await syncRepository.updateSyncJob(job.id, {
          status: "failed",
          attemptCount,
          errorMessage: "Missing customer identifier (no email or Shopify customer id)",
          processedAt: new Date(),
        });
        failures.push(job.id);
        continue;
      }

      const uniqueId = buildUniqueId(normalized.returnId, savedItem?.id ?? String(i), eventType);

      try {
        const klaviyoEventId = await klaviyoService.createEvent(organizationId, {
          metric: { name: eventType },
          profile: {
            email: normalized.customer.email,
            external_id: normalized.customer.shopifyCustomerId,
          },
          properties: {
            return_id: normalized.returnId,
            order_id: normalized.orderId,
            order_number: normalized.orderNumber,
            product_id: item.productId,
            variant_id: item.variantId,
            product_title: item.productTitle,
            variant_title: item.variantTitle,
            sku: item.sku,
            quantity: item.quantity,
            return_reason: item.returnReason,
            return_category: item.marketingCategory,
            returned_value: item.returnedValue,
            currency: normalized.currency,
          },
          unique_id: uniqueId,
        });

        await syncRepository.updateSyncJob(job.id, {
          status: "success",
          klaviyoEventId,
          attemptCount,
          errorMessage: null,
          processedAt: new Date(),
        });
      } catch (err) {
        await syncRepository.updateSyncJob(job.id, {
          status: "failed",
          attemptCount,
          errorMessage: err instanceof Error ? err.message : "Unknown error",
          processedAt: new Date(),
        });
        failures.push(job.id);
      }
    }

    return failures;
  },

  async updateCustomerProfile(
    organizationId: string,
    normalized: NormalizedReturn,
  ): Promise<void> {
    if (!normalized.customer.email && !normalized.customer.shopifyCustomerId) return;

    const email = normalized.customer.email;
    const history = email
      ? await syncRepository.getReturnsForCustomer(organizationId, email)
      : [];

    const stats = computeProfileStats({
      returns: history.map((r) => ({
        createdAt: r.returnCreatedAt.toISOString(),
        items: r.items.map((it) => ({
          quantity: it.quantity,
          returnedValue: Number(it.returnedValue),
          reason: it.reason,
          category: it.marketingCategory,
          productTitle: it.title,
        })),
      })),
    });

    try {
      await klaviyoService.upsertProfileProperties(
        organizationId,
        {
          email: normalized.customer.email,
          external_id: normalized.customer.shopifyCustomerId,
        },
        stats,
      );
    } catch (err) {
      logger.error({ err }, "Failed to update Klaviyo profile properties");
    }
  },

  async retrySyncJob(organizationId: string, syncJobId: string): Promise<void> {
    const job = await syncRepository.getSyncJob(organizationId, syncJobId);
    if (!job) return;
    const detail = await syncRepository.getReturnDetail(organizationId, job.returnId);
    if (!detail) return;

    await syncRepository.updateSyncJob(job.id, { status: "pending", errorMessage: null });

    const normalized: NormalizedReturn = {
      returnId: detail.shopifyReturnId,
      orderId: detail.shopifyOrderId,
      orderNumber: detail.orderNumber ?? "",
      customer: { shopifyCustomerId: null, email: detail.customerEmail, phone: null },
      status: detail.status as NormalizedReturn["status"],
      currency: detail.currency,
      totalReturnedValue: Number(detail.totalReturnedValue),
      createdAt: detail.returnCreatedAt.toISOString(),
      items: detail.items.map((it) => ({
        productId: it.productId,
        variantId: it.variantId,
        productTitle: it.title,
        variantTitle: it.variantTitle,
        sku: it.sku,
        quantity: it.quantity,
        returnReason: it.reason,
        marketingCategory: it.marketingCategory,
        returnedValue: Number(it.returnedValue),
      })),
    };

    await this.syncItems(
      organizationId,
      detail.id,
      normalized,
      detail.items.map((it) => ({ id: it.id })),
      job.eventType,
    );
    await this.updateCustomerProfile(organizationId, normalized);
  },
};

function extractReturnId(payload: unknown): string | null {
  const p = payload as Record<string, unknown>;
  if (!p) return null;
  if (typeof p.admin_graphql_api_id === "string" && p.admin_graphql_api_id.includes("/Return/")) {
    return p.admin_graphql_api_id;
  }
  const candidate = p.id ?? p.return_id ?? (p.return as Record<string, unknown>)?.id;
  return candidate != null ? String(candidate) : null;
}
