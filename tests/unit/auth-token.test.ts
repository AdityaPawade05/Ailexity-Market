import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";
import { createToken, verifyToken, hashPassword, verifyPassword } from "@/lib/auth";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

describe("session tokens", () => {
  it("round-trips a valid session token", async () => {
    const token = await createToken({ userId: "u1", email: "a@b.c", role: "user" });
    const payload = await verifyToken(token);
    expect(payload).toMatchObject({ userId: "u1", email: "a@b.c", role: "user" });
  });

  it("rejects garbage tokens", async () => {
    expect(await verifyToken("not.a.jwt")).toBeNull();
    expect(await verifyToken("")).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const forged = await new SignJWT({ userId: "u1", email: "a@b.c", role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode("wrong-secret-wrong-secret-wrong-secret!!"));
    expect(await verifyToken(forged)).toBeNull();
  });

  it("rejects a purpose-scoped JWT (e.g. password-reset) used as a session", async () => {
    // Signed with the REAL secret but carrying a purpose claim — must not
    // be accepted as a login session.
    const resetToken = await new SignJWT({ userId: "u1", email: "a@b.c", role: "user", purpose: "password-reset" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(JWT_SECRET);
    expect(await verifyToken(resetToken)).toBeNull();
  });

  it("rejects a structurally wrong payload signed with the real secret", async () => {
    const noUserId = await new SignJWT({ email: "a@b.c", role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(JWT_SECRET);
    expect(await verifyToken(noUserId)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const expired = await new SignJWT({ userId: "u1", email: "a@b.c", role: "user" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(JWT_SECRET);
    expect(await verifyToken(expired)).toBeNull();
  });
});

describe("password hashing", () => {
  it("verifies a correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("wrong password", hash)).toBe(false);
  });

  it("never stores the plaintext", async () => {
    const hash = await hashPassword("hunter2");
    expect(hash).not.toContain("hunter2");
  });
});
