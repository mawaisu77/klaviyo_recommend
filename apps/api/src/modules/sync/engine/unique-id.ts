/**
 * Deterministic, stable Klaviyo event `unique_id`. The same inputs always
 * produce the same value so retries never create duplicate Klaviyo events.
 */
export function buildUniqueId(
  returnId: string,
  returnItemId: string,
  eventType: string,
): string {
  return [returnId, returnItemId, eventType]
    .map((part) => String(part).trim().replace(/\s+/g, "-").toLowerCase())
    .join(":");
}
