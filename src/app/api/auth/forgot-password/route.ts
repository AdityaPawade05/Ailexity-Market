import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";
import { sendEmail } from "@/lib/email";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret_for_development_only"
);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) {
      // Don't leak whether user exists, just return success
      return NextResponse.json({ success: true });
    }

    const token = await new SignJWT({ userId: user.id, email: user.email, purpose: "password-reset" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(JWT_SECRET);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <h2>Reset your password</h2>
        <p>You requested a password reset for your Ailexity Market account.</p>
        <p>Click the link below to set a new password. This link expires in 15 minutes.</p>
        <br/>
        <a href="${resetLink}" style="background:#f59e0b;color:white;padding:10px 16px;text-decoration:none;border-radius:6px;font-weight:bold;">
          Reset Password
        </a>
        <p style="margin-top:20px;font-size:12px;color:#666;">If you did not request this, please ignore this email.</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
