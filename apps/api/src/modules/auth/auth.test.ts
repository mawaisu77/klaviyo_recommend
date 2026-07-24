import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./auth.service.js";

describe("password hashing", () => {
  it("hashes and verifies a correct password", async () => {
    const hash = await hashPassword("supersecret");
    expect(hash).not.toEqual("supersecret");
    expect(await verifyPassword("supersecret", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("supersecret");
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});
