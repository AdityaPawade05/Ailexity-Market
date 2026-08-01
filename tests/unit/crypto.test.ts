import { describe, it, expect } from "vitest";
import { encrypt, decrypt } from "@/lib/crypto";

describe("crypto (AES-256-GCM secrets at rest)", () => {
  it("round-trips plaintext", () => {
    const secret = "discord-bot-token-abc123";
    expect(decrypt(encrypt(secret))).toBe(secret);
  });

  it("round-trips unicode and long payloads", () => {
    const long = "x".repeat(10_000) + " — émojis 🎉 and ünïcode";
    expect(decrypt(encrypt(long))).toBe(long);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    expect(encrypt("same input")).not.toBe(encrypt("same input"));
  });

  it("rejects a malformed payload", () => {
    expect(() => decrypt("not-a-valid-payload")).toThrow();
  });

  it("rejects a tampered ciphertext (auth tag check)", () => {
    const encoded = encrypt("sensitive");
    const [iv, tag, cipher] = encoded.split(":");
    const tamperedCipher = Buffer.from(cipher, "base64");
    tamperedCipher[0] = tamperedCipher[0] ^ 0xff;
    const tampered = `${iv}:${tag}:${tamperedCipher.toString("base64")}`;
    expect(() => decrypt(tampered)).toThrow();
  });
});
