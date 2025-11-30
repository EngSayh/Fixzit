import { cookies, headers } from "next/headers";
import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { Types } from "mongoose";
import { randomUUID } from "node:crypto";
import { objectIdFrom } from "./objectIds";
import { requireEnv, TEST_JWT_SECRET } from "../env";

export interface MarketplaceRequestContext {
  tenantKey: string;
  orgId: Types.ObjectId;
  userId?: Types.ObjectId;
  role?: string;
  correlationId?: string;
}

async function decodeToken(token?: string | null) {
  if (!token) {
    return undefined;
  }
  try {
    const secret = new TextEncoder().encode(
      requireEnv("JWT_SECRET", { testFallback: TEST_JWT_SECRET }),
    );
    // Verify JWT with algorithm constraint for security
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
      clockTolerance: 5, // 5 second tolerance for clock skew
    });
    return payload;
  } catch {
    // Failed to decode marketplace JWT payload
    return undefined;
  }
}

async function readHeaderValue(
  req: NextRequest | Request | null | undefined,
  key: string,
) {
  if (req) {
    const value = req.headers.get(key);
    if (value) return value;
  }

  try {
    const serverHeaders = await headers();
    return serverHeaders.get(key) ?? undefined;
  } catch {
    // Marketplace context header fallback failed
    return undefined;
  }
}

async function readCookieValue(
  req: NextRequest | null | undefined,
  key: string,
) {
  if (req) {
    const cookie = req.cookies.get(key)?.value;
    if (cookie) return cookie;
  }

  try {
    const cookieStore = await cookies();
    return cookieStore.get(key)?.value;
  } catch {
    // Marketplace context cookie fallback failed
    return undefined;
  }
}

export async function resolveMarketplaceContext(
  req?: NextRequest | Request | null,
): Promise<MarketplaceRequestContext> {
  const headerOrg =
    (await readHeaderValue(req ?? null, "x-org-id")) ||
    (await readHeaderValue(req ?? null, "x-tenant-id"));
  const cookieOrg =
    (await readCookieValue(
      req instanceof NextRequest ? req : null,
      "fixzit_org",
    )) ||
    (await readCookieValue(
      req instanceof NextRequest ? req : null,
      "fixzit_tenant",
    ));

  const token = await readCookieValue(
    req instanceof NextRequest ? req : null,
    "fixzit_auth",
  );
  const payload = (await decodeToken(token)) as
    | Record<string, unknown>
    | undefined;

  const tenantKey = (headerOrg ||
    cookieOrg ||
    (payload as Record<string, unknown> | undefined)?.tenantId ||
    process.env.MARKETPLACE_DEFAULT_TENANT ||
    "demo-tenant") as string;
  const orgId = objectIdFrom(
    ((payload as Record<string, unknown> | undefined)?.orgId as
      | string
      | undefined) || tenantKey,
  );
  const userId = (payload as Record<string, unknown> | undefined)?.id
    ? objectIdFrom((payload as Record<string, unknown>).id as string)
    : undefined;
  const professional = (payload as Record<string, unknown> | undefined)
    ?.professional as Record<string, unknown> | undefined;
  const role =
    ((payload as Record<string, unknown> | undefined)?.role as
      | string
      | undefined) ||
    (professional?.role as string | undefined) ||
    "BUYER";

  return {
    tenantKey,
    orgId,
    userId,
    role,
    correlationId: randomUUID(),
  };
}
