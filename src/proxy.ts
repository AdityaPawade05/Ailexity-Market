import { NextRequest, NextResponse } from "next/server";

const WINDOW_MS = 60_000;

// Per-route limits (requests per minute per IP)
const ROUTE_LIMITS: Record<string, number> = {
  "/api/auth/login": 10,
  "/api/auth/register": 5,
  "/api/auth/forgot-password": 5,
  "/api/auth/reset-password": 5,
  "/api/auth/verify-email": 10,
  "/api/auth/resend-verification": 3,
  "/api/ai/chat": 20,
  "/api/ai/generate-description": 15,
};
const DEFAULT_API_LIMIT = 120;

// CSRF is not checked on these routes (called by unauthenticated users or external triggers)
const CSRF_EXEMPT = new Set([
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api/auth/resend-verification",
]);

// In-memory store — resets per Edge instance (good enough for burst protection)
const store = new Map<string, { count: number; resetAt: number }>();

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (entry && now < entry.resetAt) {
    if (entry.count >= limit) return false;
    entry.count++;
  } else {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
  }

  // Prune stale entries periodically to avoid unbounded growth
  if (store.size > 10_000) {
    for (const [k, v] of store) {
      if (now >= v.resetAt) store.delete(k);
    }
  }

  return true;
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/")) {
    // ── CSRF protection ──────────────────────────────────────────────────────
    // For state-changing methods on non-exempt routes, validate that the request
    // Origin matches the server host. This blocks cross-origin CSRF attacks.
    const method = req.method;
    if (
      ["POST", "PUT", "PATCH", "DELETE"].includes(method) &&
      !CSRF_EXEMPT.has(pathname)
    ) {
      const origin = req.headers.get("origin");
      if (origin) {
        const host =
          req.headers.get("x-forwarded-host") ??
          req.headers.get("host") ??
          "";
        let originHost: string;
        try {
          originHost = new URL(origin).host;
        } catch {
          return new NextResponse(
            JSON.stringify({ error: "CSRF validation failed" }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          );
        }
        if (originHost !== host) {
          return new NextResponse(
            JSON.stringify({ error: "CSRF validation failed" }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          );
        }
      }
      // No Origin header → server-to-server call → allowed
    }

    // ── Rate limiting ─────────────────────────────────────────────────────────
    const ip = getIp(req);
    const limit = ROUTE_LIMITS[pathname] ?? DEFAULT_API_LIMIT;
    const key = `${ip}:${pathname}`;

    if (!checkRateLimit(key, limit)) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests — please slow down." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "60",
          },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
