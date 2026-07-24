import type { ReturnEventType } from "@returnsense/shared";

/**
 * Maps a Shopify webhook topic to the ReturnSense event type.
 * Returns null for topics that should not produce a Klaviyo event
 * (e.g. declined or canceled returns).
 */
export function eventTypeForTopic(topic: string): ReturnEventType | null {
  switch (topic) {
    case "returns/request":
      return "Return Requested";
    case "returns/approve":
      return "Item Returned";
    case "returns/close":
      return "Return Completed";
    case "refunds/create":
      return "Partial Refund Issued";
    case "returns/decline":
    case "returns/cancel":
      return null;
    default:
      return "Item Returned";
  }
}
