import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword, createToken, setAuthCookie } from "@/lib/auth";

// GET /api/auth/google/callback — exchange code for tokens, sign in or create the user
export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    const cookieHeader = request.headers.get("cookie") || "";
    const expectedState = cookieHeader
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("google_oauth_state="))
      ?.split("=")[1];

    if (error || !code || !state || !expectedState || state !== expectedState) {
      console.error("Google OAuth: state validation failed", { error });
      return NextResponse.redirect(`${appUrl}/login?error=google_auth_failed`);
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      console.error("Google OAuth: missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET");
      return NextResponse.redirect(`${appUrl}/login?error=google_auth_failed`);
    }

    const redirectUri = `${appUrl}/api/auth/google/callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("Google OAuth: token exchange failed", await tokenRes.text());
      return NextResponse.redirect(`${appUrl}/login?error=google_auth_failed`);
    }

    const tokens = await tokenRes.json();

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!profileRes.ok) {
      console.error("Google OAuth: profile fetch failed", await profileRes.text());
      return NextResponse.redirect(`${appUrl}/login?error=google_auth_failed`);
    }

    const profile = await profileRes.json() as {
      sub: string;
      email: string;
      email_verified: boolean;
      name: string;
      picture?: string;
    };

    if (!profile.email) {
      console.error("Google OAuth: profile missing email");
      return NextResponse.redirect(`${appUrl}/login?error=google_auth_failed`);
    }

    // Normalize the same way login/register do, so a Google account never
    // creates a case-variant duplicate of an existing local account.
    const email = profile.email.trim().toLowerCase();

    let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });

    if (!user) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        // Only auto-link to an existing account if Google itself vouches for
        // the email — otherwise this is a path to hijacking someone else's
        // account by registering a Google identity with their address.
        if (!profile.email_verified) {
          console.error(`Google OAuth: refusing to link unverified email to existing account (${email})`);
          return NextResponse.redirect(`${appUrl}/login?error=google_email_unverified`);
        }
        user = await prisma.user.update({
          where: { id: existing.id },
          data: {
            googleId: profile.sub,
            emailVerified: true,
            avatar: existing.avatar || profile.picture || null,
          },
        });
      } else {
        const randomPassword = await hashPassword(randomBytes(32).toString("hex"));
        user = await prisma.user.create({
          data: {
            email,
            password: randomPassword,
            name: profile.name || email.split("@")[0],
            role: "user",
            googleId: profile.sub,
            emailVerified: true,
            avatar: profile.picture || null,
          },
        });
      }
    }

    const jwt = await createToken({ userId: user.id, email: user.email, role: user.role });
    await setAuthCookie(jwt);

    const response = NextResponse.redirect(`${appUrl}/products`);
    response.cookies.delete("google_oauth_state");
    return response;
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(`${appUrl}/login?error=google_auth_failed`);
  }
}
