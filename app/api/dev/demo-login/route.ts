import { NextRequest, NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

import { logger } from "@/lib/logger";
/**
 * Type for developer credential payload from dev-only module
 * Ensures type safety when calling findLoginPayloadByRole
 * Note: email is required in practice but typed as optional in DemoCredential
 */
type DevCredentialPayload = {
  email?: string; // Made optional to match DemoCredential type
  password: string;
  loginType?: "personal" | "corporate";
  employeeNumber?: string;
  orgId?: string;
  preferredPath?: string;
};

/**
 * Server-side demo login endpoint
 * - Looks up server-only credentials by role
 * - Calls your internal /api/auth/login on the same origin
 * - Forwards Set-Cookie so the browser session is established
 * - Returns JSON { ok?, status?, preferredPath? } to the client
 */
export async function POST(req: NextRequest) {
  const rateLimitResponse = enforceRateLimit(req, { requests: 5, windowMs: 60_000, keyPrefix: "dev:demo-login" });
  if (rateLimitResponse) return rateLimitResponse;

  // SECURITY: Demo login ONLY allowed in strict development mode
  // CRITICAL: This endpoint bypasses authentication and should NEVER be production-accessible
  if (process.env.NODE_ENV !== "development") {
    logger.error(
      "[SECURITY] Demo login attempted in non-development environment",
      {
        nodeEnv: process.env.NODE_ENV,
        clientIp:
          req.headers.get("x-forwarded-for") ||
          req.headers.get("x-real-ip") ||
          "unknown",
      },
    );
    return withNoStore(
      NextResponse.json({ error: "Not available" }, { status: 404 }),
    );
  }

  // Gate early — dev only
  // Dynamically import dev-only module (won't be bundled in production)
  let ENABLED = false;
  let findLoginPayloadByRole: (
    role: string,
  ) => DevCredentialPayload | null = () => null;

  try {
    // We use a dynamic import to ensure this file is never bundled in production
    const credentialsModule = await import(
      /* webpackIgnore: true */ "@/dev/credentials.server"
    );
    ENABLED = credentialsModule.ENABLED ?? false;
    findLoginPayloadByRole = credentialsModule.findLoginPayloadByRole;
  } catch (e) {
    // Module not available (e.g., production build) - fail gracefully
    logger.error("[Dev Demo Login] Failed to load credentials module:", { e });
    return withNoStore(
      NextResponse.json({ error: "Demo not enabled" }, { status: 403 }),
    );
  }

  if (!ENABLED || typeof findLoginPayloadByRole !== "function") {
    return withNoStore(
      NextResponse.json({ error: "Demo not enabled" }, { status: 403 }),
    );
  }

  // Parse body safely
  const body = await safeParseJson<{ role?: unknown }>(req);
  const role =
    typeof body.role === "string" && body.role.trim() ? body.role.trim() : null;
  if (!role) {
    return withNoStore(
      NextResponse.json({ error: "role is required" }, { status: 400 }),
    );
  }

  // Resolve credential payload (server-only)
  const payload = findLoginPayloadByRole(role);
  if (!payload) {
    return withNoStore(
      NextResponse.json({ error: "Unknown role" }, { status: 404 }),
    );
  }

  // Validate email is present (required for login)
  if (!payload.email) {
    logger.error("[Dev Demo Login] Payload missing required email field", {
      role,
    });
    return withNoStore(
      NextResponse.json(
        { error: "Invalid demo account configuration" },
        { status: 500 },
      ),
    );
  }

  // Prepare login data (password never leaves the server)
  const loginData =
    payload.loginType === "personal"
      ? {
          email: payload.email,
          password: payload.password,
          loginType: "personal" as const,
        }
      : {
          employeeNumber: payload.employeeNumber,
          password: payload.password,
          loginType: "corporate" as const,
        };

  try {
    // Always hit same-origin API so cookies are set for the client's site
    const url = new URL("/api/auth/login", req.nextUrl.origin);

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      // forward incoming cookies (if any)
      cookie: req.headers.get("cookie") ?? "",
      // optional: flag for observability
      "x-dev-login": "1",
    };
    if (payload.orgId) headers["x-org-id"] = payload.orgId;

    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(loginData),
      redirect: "manual", // don't auto-follow redirects; we only need cookies + body
    });

    const data = await safeJsonFromResponse(resp);
    const res = withNoStore(
      NextResponse.json(
        { ...data, preferredPath: payload.preferredPath },
        { status: resp.status },
      ),
    );

    // Forward ALL Set-Cookie headers (handles multiple cookies)
    forwardSetCookies(resp, res);

    return res;
  } catch (error) {
    logger.error("[Dev Demo Login] Error:", error as Error);
    return withNoStore(
      NextResponse.json(
        {
          error: "Login failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      ),
    );
  }
}

/* ---------------- helpers ---------------- */

function withNoStore<T extends NextResponse>(res: T): T {
  res.headers.set("Cache-Control", "no-store");
  return res;
}

async function safeParseJson<T>(req: NextRequest): Promise<Partial<T>> {
  try {
    // Stricter content-type guard - only parse if content-type starts with application/json
    const ct = req.headers.get("content-type") || "";
    if (!ct.startsWith("application/json")) {
      logger.warn(
        "[Dev Demo Login] safeParseJson: Received non-JSON content-type",
        { contentType: ct },
      );
      return {};
    }
    return (await req.json()) as Partial<T>;
  } catch (e) {
    logger.error("[Dev Demo Login] safeParseJson: Failed to parse body", { e });
    return {};
  }
}

async function safeJsonFromResponse(resp: Response) {
  try {
    const ct = resp.headers.get("content-type") || "";
    if (!ct.toLowerCase().startsWith("application/json")) {
      return { ok: resp.ok, status: resp.status };
    }
    return await resp.json();
  } catch {
    // Handle cases where content-type is json but body is empty
    return { ok: resp.ok, status: resp.status };
  }
}

/**
 * Forward all Set-Cookie headers from the upstream response to the NextResponse.
 * Works in Node runtimes that support headers.getSetCookie(); falls back gracefully.
 */
function forwardSetCookies(upstream: Response, downstream: NextResponse) {
  const getSetCookie: undefined | (() => string[]) =
    upstream.headers.getSetCookie?.bind(upstream.headers);

  if (typeof getSetCookie === "function") {
    const cookies = getSetCookie();
    for (const c of cookies) {
      downstream.headers.append("set-cookie", c);
    }
  } else {
    // Fallback: forward a single Set-Cookie if present (don't split on commas: expires contains commas)
    const single = upstream.headers.get("set-cookie");
    if (single) {
      downstream.headers.set("set-cookie", single);
    }
  }
}
