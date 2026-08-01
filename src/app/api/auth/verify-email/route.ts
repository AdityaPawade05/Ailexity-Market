import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken, setAuthCookie } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { verifyToken: token } });

  if (!user) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 400 });
  }

  if (user.emailVerified) {
    return NextResponse.json({ alreadyVerified: true });
  }

  if (user.verifyTokenExp && user.verifyTokenExp < new Date()) {
    return NextResponse.json({ error: "Link expired. Request a new one." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, verifyToken: null, verifyTokenExp: null },
  });

  const jwt = await createToken({ userId: user.id, email: user.email, role: user.role });
  await setAuthCookie(jwt);

  return NextResponse.json({ success: true });
}
