import type { KlaviyoProfileProperties } from "@returnsense/shared";

export interface ProfileStatsReturn {
  createdAt: string;
  items: Array<{
    quantity: number;
    returnedValue: number;
    reason: string;
    category: string;
    productTitle: string;
  }>;
}

export interface ProfileStatsInput {
  returns: ProfileStatsReturn[];
  exchangeCount?: number;
  /** Total number of purchased items, if reliably known. Enables return rate. */
  purchasedItems?: number | null;
}

/**
 * Pure calculation of Klaviyo profile properties from a customer's return history.
 * `returnsense_return_rate` is only set when purchasedItems is a reliable positive
 * number; otherwise it stays null (never guessed from incomplete data).
 */
export function computeProfileStats(input: ProfileStatsInput): KlaviyoProfileProperties {
  const { returns } = input;
  const totalReturns = returns.length;

  const totalReturnedItems = returns.reduce(
    (sum, r) => sum + r.items.reduce((s, i) => s + i.quantity, 0),
    0,
  );
  const totalReturnedValue = round2(
    returns.reduce(
      (sum, r) => sum + r.items.reduce((s, i) => s + i.returnedValue, 0),
      0,
    ),
  );

  const sorted = [...returns].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const latest = sorted[0];
  const latestItem = latest?.items[0];

  const reliablePurchase =
    typeof input.purchasedItems === "number" && input.purchasedItems > 0;
  const returnRate = reliablePurchase
    ? round2(totalReturnedItems / (input.purchasedItems as number))
    : null;

  return {
    returnsense_total_returns: totalReturns,
    returnsense_total_returned_items: totalReturnedItems,
    returnsense_total_returned_value: totalReturnedValue,
    returnsense_last_return_date: latest?.createdAt ?? null,
    returnsense_last_return_reason: latestItem?.reason ?? null,
    returnsense_last_return_category: latestItem?.category ?? null,
    returnsense_last_returned_product: latestItem?.productTitle ?? null,
    returnsense_exchange_count: input.exchangeCount ?? 0,
    returnsense_return_rate: returnRate,
    returnsense_customer_status: deriveStatus(returnRate, totalReturns),
  };
}

function deriveStatus(returnRate: number | null, totalReturns: number): string {
  if (returnRate !== null && returnRate >= 0.5) return "high_returner";
  if (totalReturns >= 3) return "frequent_returner";
  return "active";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
