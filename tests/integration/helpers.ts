export const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

export class Session {
  private cookie = "";

  async login(email: string, password: string) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Login failed for ${email}: ${res.status} ${body.error ?? ""}`);
    }
    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) throw new Error(`No session cookie returned for ${email}`);
    this.cookie = setCookie.split(";")[0];
    return this;
  }

  async request(path: string, init: RequestInit = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Cookie: this.cookie,
        ...(init.headers || {}),
      },
    });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { status: res.status, body: body as Record<string, never> & Record<string, unknown> };
  }

  get(path: string) {
    return this.request(path);
  }

  post(path: string, json?: unknown) {
    return this.request(path, { method: "POST", body: json !== undefined ? JSON.stringify(json) : undefined });
  }

  patch(path: string, json?: unknown) {
    return this.request(path, { method: "PATCH", body: json !== undefined ? JSON.stringify(json) : undefined });
  }

  delete(path: string) {
    return this.request(path, { method: "DELETE" });
  }

  async walletBalance(): Promise<number> {
    const { status, body } = await this.get("/api/wallet");
    if (status !== 200) throw new Error(`wallet fetch failed: ${status}`);
    return body.balance as number;
  }
}

export async function assertServerUp() {
  try {
    const res = await fetch(`${BASE_URL}/api/products`);
    if (!res.ok) throw new Error(`status ${res.status}`);
  } catch (err) {
    throw new Error(
      `Integration tests need the dev server running at ${BASE_URL}. Start it with \`npm run dev\` first. (${err instanceof Error ? err.message : err})`
    );
  }
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}
