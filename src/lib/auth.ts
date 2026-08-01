import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(password, hashed);
}

export async function createToken(payload: { userId: string; email: string; role: string }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    // Only accept session tokens minted by createToken — other JWTs signed with
    // the same secret (e.g. password-reset tokens) must not act as sessions.
    if (
      typeof payload.userId !== "string" ||
      typeof payload.role !== "string" ||
      payload.purpose !== undefined
    ) {
      return null;
    }
    return payload as { userId: string; email: string; role: string };
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ailexity-token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;

  // Re-check ban status on every request (not just at login) so a ban takes
  // effect immediately for an already-issued token, not just future logins.
  const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { banned: true } });
  if (!user || user.banned) return null;

  return payload;
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set("ailexity-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete("ailexity-token");
}
