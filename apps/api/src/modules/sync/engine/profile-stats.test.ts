import { describe, expect, it } from "vitest";
import { computeProfileStats } from "./profile-stats.js";

const baseReturns = [
  {
    createdAt: "2026-07-20T10:00:00Z",
    items: [
      { quantity: 1, returnedValue: 50, reason: "DAMAGED", category: "PRODUCT_PROBLEM", productTitle: "Boots" },
    ],
  },
  {
    createdAt: "2026-07-23T10:00:00Z",
    items: [
      { quantity: 2, returnedValue: 75, reason: "TOO_SMALL", category: "SIZE_ISSUE", productTitle: "Jacket" },
    ],
  },
];

describe("computeProfileStats", () => {
  it("aggregates totals and uses the most recent return", () => {
    const stats = computeProfileStats({ returns: baseReturns });

    expect(stats.returnsense_total_returns).toBe(2);
    expect(stats.returnsense_total_returned_items).toBe(3);
    expect(stats.returnsense_total_returned_value).toBe(125);
    expect(stats.returnsense_last_return_date).toBe("2026-07-23T10:00:00Z");
    expect(stats.returnsense_last_return_reason).toBe("TOO_SMALL");
    expect(stats.returnsense_last_return_category).toBe("SIZE_ISSUE");
    expect(stats.returnsense_last_returned_product).toBe("Jacket");
  });

  it("leaves return rate null when purchase totals are unknown", () => {
    const stats = computeProfileStats({ returns: baseReturns });
    expect(stats.returnsense_return_rate).toBeNull();
  });

  it("computes return rate only when purchase totals are reliable", () => {
    const stats = computeProfileStats({ returns: baseReturns, purchasedItems: 6 });
    expect(stats.returnsense_return_rate).toBe(0.5);
    expect(stats.returnsense_customer_status).toBe("high_returner");
  });

  it("handles an empty history", () => {
    const stats = computeProfileStats({ returns: [] });
    expect(stats.returnsense_total_returns).toBe(0);
    expect(stats.returnsense_last_return_date).toBeNull();
  });
});
