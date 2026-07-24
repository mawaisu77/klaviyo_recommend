import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "./crypto.js";

describe("crypto", () => {
  it("round-trips plaintext", () => {
    const secret = "shopify-access-token-abc123";
    const encrypted = encrypt(secret);
    expect(encrypted).not.toEqual(secret);
    expect(encrypted.split(".")).toHaveLength(3);
    expect(decrypt(encrypted)).toEqual(secret);
  });

  it("produces different ciphertext each time (random IV)", () => {
    expect(encrypt("same")).not.toEqual(encrypt("same"));
  });

  it("fails on tampered ciphertext", () => {
    const encrypted = encrypt("secret");
    const [iv, tag, data] = encrypted.split(".");
    const tampered = [iv, tag, Buffer.from("garbage").toString("base64")].join(".");
    void data;
    expect(() => decrypt(tampered)).toThrow();
  });
});
