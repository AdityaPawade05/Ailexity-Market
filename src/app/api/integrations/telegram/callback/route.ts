import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";

// GET /api/integrations/telegram/callback — Telegram Login Widget redirects here
// with signed user data after the member authorizes our platform bot. Verifies
// the signature (see https://core.telegram.org/widgets/login#checking-authorization),
// then links telegramUserId to the signed-in Ailexity user so subscription
// cancellation can actually revoke Telegram access (see bot-integrations.ts).
const AUTH_MAX_AGE_SECONDS = 24 * 60 * 60;

function verifyTelegramAuth(params: URLSearchParams, botToken: string): boolean {
  const hash = params.get("hash");
  if (!hash) return false;

  const dataCheckString = Array.from(params.entries())
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto.createHash("sha256").update(botToken).digest();
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (computedHash.length !== hash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(hash));
}

export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") || "/communities";

  const fail = (reason: string) =>
    NextResponse.redirect(`${appUrl}${returnTo}?telegram=error&reason=${reason}`);

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return fail("not_configured");

  // Everything except our own returnTo param is Telegram's signed payload.
  const authParams = new URLSearchParams(searchParams);
  authParams.delete("returnTo");

  if (!verifyTelegramAuth(authParams, botToken)) {
    return fail("invalid_signature");
  }

  const authDate = parseInt(authParams.get("auth_date") || "0", 10);
  if (!authDate || Date.now() / 1000 - authDate > AUTH_MAX_AGE_SECONDS) {
    return fail("expired");
  }

  const telegramId = authParams.get("id");
  if (!telegramId) return fail("missing_id");

  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.redirect(`${appUrl}/login?error=login_required`);
  }

  try {
    await prisma.user.update({
      where: { id: session.userId },
      data: { telegramUserId: telegramId },
    });
  } catch (err) {
    // Unique violation: this Telegram account is linked to a different user.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return fail("already_linked");
    }
    console.error("[Telegram callback] link failed", err);
    return fail("link_failed");
  }

  return NextResponse.redirect(`${appUrl}${returnTo}?telegram=connected`);
}
