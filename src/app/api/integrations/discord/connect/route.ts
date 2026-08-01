import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getSession } from "@/lib/auth";

// GET /api/integrations/discord/connect — start Discord OAuth2 to link the
// signed-in Ailexity user to their Discord account (scope: identify guilds.join).
// Optional ?returnTo=/some/path to send the user back after linking.
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.redirect(`${appUrl}/login?error=login_required`);
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(`${appUrl}/?error=discord_not_configured`);
  }

  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") || "/communities";

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${appUrl}/api/integrations/discord/callback`;

  const authUrl = new URL("https://discord.com/api/oauth2/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "identify guilds.join");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("prompt", "consent");

  const response = NextResponse.redirect(authUrl.toString());
  // Short-lived, HttpOnly cookies to validate the callback (CSRF) and resume.
  response.cookies.set("discord_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  response.cookies.set("discord_oauth_return", returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
