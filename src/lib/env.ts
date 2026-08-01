/**
 * Startup validation for environment-configured secrets and API keys.
 * Runs once via src/instrumentation.ts so misconfiguration is reported clearly
 * at boot instead of failing deep inside a request handler.
 */

import crypto from "crypto";

const REQUIRED_KEYS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "JWT_SECRET",
  "ENCRYPTION_KEY",
  "NEXT_PUBLIC_APP_URL",
] as const;

// Values copied verbatim from .env.example — treated as "not actually configured".
// Every placeholder in .env.example follows the "your-..." convention except this one.
const PLACEHOLDER_VALUES = new Set(["PASTE_FROM_OAUTH2_TAB"]);

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_VALUES.has(value) || value.startsWith("your-");
}

interface OptionalGroup {
  feature: string;
  keys: string[];
  // If true, the feature works when ANY key is set (e.g. Gemini OR OpenAI).
  // Otherwise all keys are required together for the feature to work.
  anyOf?: boolean;
}

const OPTIONAL_GROUPS: OptionalGroup[] = [
  { feature: "AI chatbot", keys: ["GEMINI_API_KEY", "OPENAI_API_KEY"], anyOf: true },
  { feature: "Google OAuth", keys: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"] },
  { feature: "Discord OAuth", keys: ["DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET"] },
  {
    feature: "Telegram account linking",
    keys: ["TELEGRAM_BOT_TOKEN", "NEXT_PUBLIC_TELEGRAM_BOT_USERNAME"],
  },
  { feature: "SMTP email delivery", keys: ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"] },
];

// SHA-256 hashes of the development secrets shipped in the local dev .env.
// Only hashes live in source — enough to refuse booting production with them,
// without disclosing the values themselves.
const KNOWN_DEV_SECRET_HASHES = new Set([
  "b797f9108bc501ed6177a47b5f46bce2c6110f8c4e4c5d0975d2878c496ef676", // dev JWT_SECRET
  "5aa67694b3d9978e801eb912c02aad6de2918a728231a9e81281ba775eeed4a1", // dev ENCRYPTION_KEY
]);

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function checkProductionSecret(name: string, minLength: number, errors: string[]): void {
  const value = process.env[name] ?? "";
  if (isPlaceholder(value) || value.length < minLength) {
    errors.push(
      `${name} is a placeholder or shorter than ${minLength} chars — generate a real one: openssl rand -hex ${minLength / 2}`
    );
  } else if (KNOWN_DEV_SECRET_HASHES.has(sha256(value))) {
    errors.push(`${name} is the well-known development value — generate a fresh secret for production`);
  }
}

// Hard failures that must never reach a real deployment. Throwing here stops
// the server at boot, which is the only safe behavior for a bad JWT secret.
export function validateProductionEnv(): void {
  const errors: string[] = [];

  // Both docs (DEPLOY.md, .env.example) say `openssl rand -hex 32` → 64 chars.
  checkProductionSecret("JWT_SECRET", 64, errors);
  checkProductionSecret("ENCRYPTION_KEY", 64, errors);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  if (/localhost|127\.0\.0\.1/.test(appUrl)) {
    errors.push(`NEXT_PUBLIC_APP_URL still points at ${appUrl} — set it to the real https:// domain`);
  } else if (!appUrl.startsWith("https://")) {
    errors.push(`NEXT_PUBLIC_APP_URL should be an https:// URL in production (got: ${appUrl})`);
  }

  if (errors.length > 0) {
    throw new Error(
      `[env] Refusing to start in production with unsafe configuration:\n` +
        errors.map((e) => `  ✖ ${e}`).join("\n")
    );
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn(
      "[env] ⚠ SMTP is not configured in production — verification, receipt, and refund emails " +
        "will silently go to a throwaway Ethereal test inbox instead of real users."
    );
  } else if (process.env.SMTP_HOST === "smtp.gmail.com") {
    console.warn(
      "[env] ⚠ SMTP_HOST is smtp.gmail.com — personal Gmail is fine for dev but has low sending " +
        "limits and poor deliverability for transactional mail. Use Resend/Brevo/SES in production " +
        "(see .env.example for ready-made settings)."
    );
  }
}

export function validateEnv(): void {
  const missingRequired = REQUIRED_KEYS.filter((key) => !process.env[key]);
  if (missingRequired.length > 0) {
    throw new Error(
      `[env] Missing required environment variable(s): ${missingRequired.join(", ")}. ` +
        `Copy .env.example to .env and fill these in before starting the server.`
    );
  }

  if (process.env.NODE_ENV === "production") {
    validateProductionEnv();
  }

  const warnings: string[] = [];

  for (const group of OPTIONAL_GROUPS) {
    const states = group.keys.map((key) => {
      const value = process.env[key];
      if (!value) return { key, status: "missing" as const };
      if (isPlaceholder(value)) return { key, status: "placeholder" as const };
      return { key, status: "ok" as const };
    });

    const configured = group.anyOf
      ? states.some((s) => s.status === "ok")
      : states.every((s) => s.status === "ok");

    if (configured) continue;

    const problems = states.filter((s) => s.status !== "ok");
    const detail = problems
      .map((s) => (s.status === "placeholder" ? `${s.key} (placeholder)` : `${s.key} (unset)`))
      .join(", ");
    warnings.push(`${group.feature} disabled — ${detail}`);
  }

  if (warnings.length > 0) {
    console.warn(
      `[env] Optional integrations not fully configured:\n` +
        warnings.map((w) => `  ⚠ ${w}`).join("\n")
    );
  } else {
    console.log("[env] All optional integrations configured.");
  }
}
