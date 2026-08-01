import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { validateProductionEnv } from "@/lib/env";

// Vitest loads the real dev .env (see vitest.config.ts), so each test stubs
// the variables it cares about and restores them afterwards.

const GOOD_SECRET = "a".repeat(64);

function stubSafeBaseline() {
  vi.stubEnv("JWT_SECRET", GOOD_SECRET);
  vi.stubEnv("ENCRYPTION_KEY", "b".repeat(64));
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://ailexity.example.com");
  vi.stubEnv("SMTP_HOST", "smtp.resend.com");
  vi.stubEnv("SMTP_USER", "resend");
  vi.stubEnv("SMTP_PASS", "re_test_key");
}

describe("validateProductionEnv", () => {
  beforeEach(() => stubSafeBaseline());
  afterEach(() => vi.unstubAllEnvs());

  it("passes with a fully safe configuration", () => {
    expect(() => validateProductionEnv()).not.toThrow();
  });

  it("rejects the well-known dev JWT_SECRET (by hash)", () => {
    vi.unstubAllEnvs();
    stubSafeBaseline();
    // The real dev value is loaded from .env before stubbing — restore just it.
    vi.stubEnv(
      "JWT_SECRET",
      "3f8a2b9e4c1d7f6a0e5b3c8d2f4a6e9b1c3d5f7a2b4e6c8d0f2a4b6c8e0d2f4a6b8c0e2d4f6a8b0c2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8"
    );
    expect(() => validateProductionEnv()).toThrow(/well-known development value/);
  });

  it("rejects a placeholder JWT_SECRET", () => {
    vi.stubEnv("JWT_SECRET", "your-secret-key-change-in-production");
    expect(() => validateProductionEnv()).toThrow(/JWT_SECRET/);
  });

  it("rejects a too-short ENCRYPTION_KEY", () => {
    vi.stubEnv("ENCRYPTION_KEY", "short");
    expect(() => validateProductionEnv()).toThrow(/ENCRYPTION_KEY/);
  });

  it("rejects a localhost NEXT_PUBLIC_APP_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    expect(() => validateProductionEnv()).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("rejects a plain-http NEXT_PUBLIC_APP_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://ailexity.example.com");
    expect(() => validateProductionEnv()).toThrow(/https/);
  });

  it("warns (but boots) when SMTP is missing", () => {
    vi.stubEnv("SMTP_HOST", "");
    vi.stubEnv("SMTP_USER", "");
    vi.stubEnv("SMTP_PASS", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => validateProductionEnv()).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/SMTP is not configured/));
    warn.mockRestore();
  });

  it("warns (but boots) on personal Gmail SMTP", () => {
    vi.stubEnv("SMTP_HOST", "smtp.gmail.com");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => validateProductionEnv()).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/gmail/i));
    warn.mockRestore();
  });
});
