import { describe, expect, it } from "vitest";
import { buildUniqueId } from "./unique-id.js";

describe("buildUniqueId", () => {
  it("is deterministic for the same inputs", () => {
    const a = buildUniqueId("ret_1", "item_1", "Item Returned");
    const b = buildUniqueId("ret_1", "item_1", "Item Returned");
    expect(a).toEqual(b);
  });

  it("differs across event types", () => {
    expect(buildUniqueId("ret_1", "item_1", "Item Returned")).not.toEqual(
      buildUniqueId("ret_1", "item_1", "Return Completed"),
    );
  });

  it("normalizes whitespace and case", () => {
    expect(buildUniqueId("ret_1", "item_1", "Item Returned")).toEqual(
      "ret_1:item_1:item-returned",
    );
  });
});
