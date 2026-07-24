import { describe, expect, it } from "vitest";
import { normalizeReturn } from "./normalize.js";
import type { ShopifyReturnGraph } from "../../shopify/shopify.types.js";

const graph: ShopifyReturnGraph = {
  id: "gid://shopify/Return/12345",
  status: "OPEN",
  order: {
    id: "gid://shopify/Order/999",
    name: "#1045",
    currencyCode: "USD",
    createdAt: "2026-07-23T12:00:00Z",
    customer: {
      id: "gid://shopify/Customer/555",
      email: "customer@example.com",
      phone: null,
    },
  },
  returnLineItems: {
    edges: [
      {
        node: {
          id: "gid://shopify/ReturnLineItem/1",
          quantity: 2,
          returnReason: "TOO_SMALL",
          returnReasonNote: null,
          fulfillmentLineItem: {
            lineItem: {
              id: "gid://shopify/LineItem/1",
              sku: "JACKET-M-BLK",
              title: "Classic Jacket",
              variantTitle: "Medium / Black",
              product: { id: "gid://shopify/Product/77" },
              variant: { id: "gid://shopify/ProductVariant/88" },
              originalUnitPriceSet: { shopMoney: { amount: "37.50", currencyCode: "USD" } },
            },
          },
        },
      },
    ],
  },
};

describe("normalizeReturn", () => {
  it("maps a Shopify return to the internal format", () => {
    const result = normalizeReturn(graph, () => "SIZE_ISSUE");

    expect(result.returnId).toBe("12345");
    expect(result.orderId).toBe("999");
    expect(result.orderNumber).toBe("#1045");
    expect(result.status).toBe("APPROVED");
    expect(result.customer.email).toBe("customer@example.com");
    expect(result.customer.shopifyCustomerId).toBe("555");
    expect(result.items).toHaveLength(1);

    const item = result.items[0];
    expect(item.productId).toBe("77");
    expect(item.variantId).toBe("88");
    expect(item.quantity).toBe(2);
    expect(item.returnReason).toBe("TOO_SMALL");
    expect(item.marketingCategory).toBe("SIZE_ISSUE");
    expect(item.returnedValue).toBe(75);
    expect(result.totalReturnedValue).toBe(75);
  });

  it("defaults a missing reason to OTHER", () => {
    const noReason: ShopifyReturnGraph = {
      ...graph,
      returnLineItems: {
        edges: [
          {
            node: {
              ...graph.returnLineItems.edges[0].node,
              returnReason: null,
            },
          },
        ],
      },
    };
    const result = normalizeReturn(noReason, (reason) => (reason === "OTHER" ? "OTHER" : "X"));
    expect(result.items[0].returnReason).toBe("OTHER");
    expect(result.items[0].marketingCategory).toBe("OTHER");
  });
});
