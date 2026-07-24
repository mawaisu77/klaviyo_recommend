import type { NormalizedReturn, NormalizedReturnItem, ReturnStatus } from "@returnsense/shared";
import type { ShopifyReturnGraph } from "../../shopify/shopify.types.js";

function mapStatus(shopifyStatus: string): ReturnStatus {
  switch (shopifyStatus?.toUpperCase()) {
    case "REQUESTED":
      return "REQUESTED";
    case "OPEN":
    case "APPROVED":
      return "APPROVED";
    case "CLOSED":
    case "COMPLETED":
      return "COMPLETED";
    case "DECLINED":
      return "DECLINED";
    case "CANCELED":
    case "CANCELLED":
      return "CANCELED";
    default:
      return "REQUESTED";
  }
}

function numericId(gid: string | null): string | null {
  if (!gid) return null;
  const parts = gid.split("/");
  return parts[parts.length - 1] || gid;
}

/**
 * Converts a Shopify Return GraphQL node into the internal normalized format.
 * `resolveCategory` maps a raw reason to a marketing category (kept injectable
 * so this function stays pure and testable).
 */
export function normalizeReturn(
  graph: ShopifyReturnGraph,
  resolveCategory: (reason: string) => string,
  createdAt: string = new Date().toISOString(),
): NormalizedReturn {
  const items: NormalizedReturnItem[] = graph.returnLineItems.edges.map(({ node }) => {
    const lineItem = node.fulfillmentLineItem?.lineItem;
    const unitPrice = Number(
      lineItem?.originalUnitPriceSet?.shopMoney.amount ?? "0",
    );
    const quantity = node.quantity ?? 0;
    const reason = (node.returnReason ?? "OTHER").toUpperCase();
    return {
      productId: numericId(lineItem?.product?.id ?? null),
      variantId: numericId(lineItem?.variant?.id ?? null),
      productTitle: lineItem?.title ?? "Unknown product",
      variantTitle: lineItem?.variantTitle ?? null,
      sku: lineItem?.sku ?? null,
      quantity,
      returnReason: reason,
      marketingCategory: resolveCategory(reason),
      returnedValue: round2(unitPrice * quantity),
    };
  });

  const totalReturnedValue = round2(
    items.reduce((sum, item) => sum + item.returnedValue, 0),
  );

  return {
    returnId: numericId(graph.id) ?? graph.id,
    orderId: numericId(graph.order.id) ?? graph.order.id,
    orderNumber: graph.order.name,
    customer: {
      shopifyCustomerId: numericId(graph.order.customer?.id ?? null),
      email: graph.order.customer?.email ?? null,
      phone: graph.order.customer?.phone ?? null,
    },
    status: mapStatus(graph.status),
    currency: graph.order.currencyCode,
    totalReturnedValue,
    items,
    createdAt: graph.order.createdAt ?? createdAt,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
