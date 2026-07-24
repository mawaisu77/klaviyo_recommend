import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { enqueueWebhookProcessing } from "../../queue/queues.js";
import { shopifyRepository } from "../shopify/shopify.repository.js";

export interface IncomingWebhook {
  topic: string;
  externalWebhookId: string;
  shopDomain: string;
  payload: unknown;
}

export const webhooksService = {
  /**
   * Stores a webhook (deduped by externalWebhookId) and enqueues processing.
   * Returns whether this was a newly-stored event.
   */
  async ingest(webhook: IncomingWebhook): Promise<{ isNew: boolean }> {
    const connection = await shopifyRepository.findByShopDomain(webhook.shopDomain);
    if (!connection) {
      logger.warn({ shop: webhook.shopDomain }, "Webhook for unknown shop");
      return { isNew: false };
    }

    const existing = await prisma.webhookEvent.findUnique({
      where: {
        source_externalWebhookId: {
          source: "shopify",
          externalWebhookId: webhook.externalWebhookId,
        },
      },
    });
    if (existing) return { isNew: false };

    const created = await prisma.webhookEvent.create({
      data: {
        organizationId: connection.organizationId,
        source: "shopify",
        topic: webhook.topic,
        externalWebhookId: webhook.externalWebhookId,
        payload: webhook.payload as object,
        status: "received",
      },
    });

    await enqueueWebhookProcessing(created.id);
    return { isNew: true };
  },

  async handleUninstall(shopDomain: string): Promise<void> {
    await shopifyRepository.markUninstalledByDomain(shopDomain);
  },
};
