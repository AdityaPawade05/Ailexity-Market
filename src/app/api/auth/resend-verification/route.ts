import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    // Don't reveal whether the account exists
    if (!user || user.emailVerified) {
      return NextResponse.json({ success: true });
    }

    const verifyToken = randomBytes(32).toString("hex");
    const verifyTokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { verifyToken, verifyTokenExp },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await sendEmail({
      to: user.email,
      subject: "Verify your Ailexity Market email",
      html: `
        <h2>Verify your email</h2>
        <p>Hi ${user.name}, here is your new verification link.</p>
        <p>This link expires in 24 hours.</p>
        <br/>
        <a href="${appUrl}/verify-email?token=${verifyToken}" style="background:#f59e0b;color:white;padding:10px 16px;text-decoration:none;border-radius:6px;font-weight:bold;">
          Verify Email
        </a>
        <p style="margin-top:20px;font-size:12px;color:#666;">If you didn't request this, ignore this email.</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
