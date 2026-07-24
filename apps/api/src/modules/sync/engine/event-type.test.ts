import { describe, expect, it } from "vitest";
import { eventTypeForTopic } from "./event-type.js";

describe("eventTypeForTopic", () => {
  it("maps known topics", () => {
    expect(eventTypeForTopic("returns/request")).toBe("Return Requested");
    expect(eventTypeForTopic("returns/approve")).toBe("Item Returned");
    expect(eventTypeForTopic("returns/close")).toBe("Return Completed");
    expect(eventTypeForTopic("refunds/create")).toBe("Partial Refund Issued");
  });

  it("returns null for declined/canceled returns", () => {
    expect(eventTypeForTopic("returns/decline")).toBeNull();
    expect(eventTypeForTopic("returns/cancel")).toBeNull();
  });

  it("defaults unknown topics to Item Returned", () => {
    expect(eventTypeForTopic("something/else")).toBe("Item Returned");
  });
});
