export type ReturnStatus =
  | "REQUESTED"
  | "APPROVED"
  | "COMPLETED"
  | "DECLINED"
  | "CANCELED";

export interface NormalizedReturnItem {
  productId: string | null;
  variantId: string | null;
  productTitle: string;
  variantTitle: string | null;
  sku: string | null;
  quantity: number;
  returnReason: string;
  marketingCategory: string;
  returnedValue: number;
}

export interface NormalizedReturn {
  returnId: string;
  orderId: string;
  orderNumber: string;
  customer: {
    shopifyCustomerId: string | null;
    email: string | null;
    phone: string | null;
  };
  status: ReturnStatus;
  currency: string;
  totalReturnedValue: number;
  items: NormalizedReturnItem[];
  createdAt: string;
}

export const RETURN_EVENT_TYPES = [
  "Return Requested",
  "Return Approved",
  "Item Returned",
  "Item Exchanged",
  "Partial Refund Issued",
  "Return Completed",
] as const;

export type ReturnEventType = (typeof RETURN_EVENT_TYPES)[number];

export const MARKETING_CATEGORIES = [
  "SIZE_ISSUE",
  "PREFERENCE_ISSUE",
  "PRODUCT_PROBLEM",
  "EXPECTATION_PROBLEM",
  "CUSTOMER_CHANGED_MIND",
  "OTHER",
] as const;

export type MarketingCategory = (typeof MARKETING_CATEGORIES)[number];

export const DEFAULT_REASON_MAPPINGS: Record<string, MarketingCategory> = {
  TOO_SMALL: "SIZE_ISSUE",
  TOO_LARGE: "SIZE_ISSUE",
  WRONG_COLOR: "PREFERENCE_ISSUE",
  DAMAGED: "PRODUCT_PROBLEM",
  NOT_AS_DESCRIBED: "EXPECTATION_PROBLEM",
  ORDERED_BY_MISTAKE: "CUSTOMER_CHANGED_MIND",
  OTHER: "OTHER",
};
