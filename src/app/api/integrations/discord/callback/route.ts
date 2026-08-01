import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { grantDiscordAccess } from "@/lib/bot-integrations";

// GET /api/integrations/discord/callback — finish Discord OAuth2: exchange the
// code, store the Discord user id + access token against the Ailexity user, and
// grant access to any communities they already have an active subscription to.
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader
      .split(";")
      .map((c) => c.trim().split("="))
      .filter((p) => p.length === 2)
  );
  const expectedState = cookies["discord_oauth_state"];
  const returnTo = decodeURIComponent(cookies["discord_oauth_return"] || "/communities");

  const fail = (reason: string) => {
    const res = NextResponse.redirect(`${appUrl}${returnTo}?discord=error&reason=${reason}`);
    res.cookies.delete("discord_oauth_state");
    res.cookies.delete("discord_oauth_return");
    return res;
  };

  if (oauthError || !code || !state || !expectedState || state !== expectedState) {
    return fail("invalid_state");
  }

  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.redirect(`${appUrl}/login?error=login_required`);
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return fail("not_configured");
  }

  const redirectUri = `${appUrl}/api/integrations/discord/callback`;

  // 1. Exchange the authorization code for an access token.
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    console.error("[Discord callback] token exchange failed", await tokenRes.text());
    return fail("token_exchange");
  }

  const tokens = (await tokenRes.json()) as { access_token: string };

  // 2. Identify the Discord user.
  const meRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!meRes.ok) {
    return fail("identify_failed");
  }

  const me = (await meRes.json()) as { id: string; username: string };

  // 3. Link the Discord identity to the Ailexity user.
  try {
    await prisma.user.update({
      where: { id: session.userId },
      data: {
        discordUserId: me.id,
        discordAccessToken: tokens.access_token,
      },
    });
  } catch (err) {
    // Unique violation: this Discord account is linked to a different user.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return fail("already_linked");
    }
    console.error("[Discord callback] link failed", err);
    return fail("link_failed");
  }

  // 4. Best-effort: grant access to communities the user is already subscribed to.
  try {
    const activeSubs = await prisma.communitySubscription.findMany({
      where: { memberId: session.userId, status: "active" },
      include: {
        community: { include: { discordConfig: true } },
        tier: { select: { discordRoleId: true } },
      },
    });

    for (const sub of activeSubs) {
      const cfg = sub.community.discordConfig;
      const roleId = sub.tier?.discordRoleId || cfg?.managedRoleId;
      if (cfg && roleId) {
        await grantDiscordAccess({
          botToken: cfg.botToken,
          serverId: cfg.serverId,
          roleId,
          discordUserId: me.id,
          userAccessToken: tokens.access_token,
        });
      }
    }
  } catch (err) {
    // Linking succeeded; access grant is retried by the webhook, so don't fail.
    console.error("[Discord callback] grant-on-connect failed", err);
  }

  const res = NextResponse.redirect(`${appUrl}${returnTo}?discord=connected`);
  res.cookies.delete("discord_oauth_state");
  res.cookies.delete("discord_oauth_return");
  return res;
}
