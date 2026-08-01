import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email: rawEmail, password, name } = await request.json();

    if (!rawEmail || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    // Normalize so "User@Example.com" and "user@example.com" are one account.
    const email = String(rawEmail).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    const hashed = await hashPassword(password);
    const verifyToken = randomBytes(32).toString("hex");
    const verifyTokenExp = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    await prisma.user.create({
      data: {
        email,
        password: hashed,
        name,
        role: "user",
        emailVerified: false,
        verifyToken,
        verifyTokenExp,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await sendEmail({
      to: email,
      subject: "Verify your Ailexity Market email",
      html: `
        <h2>Welcome to Ailexity Market, ${name}!</h2>
        <p>Click the button below to verify your email address and activate your account.</p>
        <p>This link expires in 24 hours.</p>
        <br/>
        <a href="${appUrl}/verify-email?token=${verifyToken}" style="background:#f59e0b;color:white;padding:10px 16px;text-decoration:none;border-radius:6px;font-weight:bold;">
          Verify Email
        </a>
        <p style="margin-top:20px;font-size:12px;color:#666;">If you didn't create an account, you can ignore this email.</p>
      `,
    });

    return NextResponse.json({ needsVerification: true, email });
  } catch (error) {
    // Unique-constraint race: two simultaneous registrations for the same email.
    if ((error as { code?: string })?.code === "P2002") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
