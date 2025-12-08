import { timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

type HeaderSource = Pick<Headers, "get"> | NextRequest | Request;

/**
 * Verify a shared secret passed via header using a constant-time comparison.
 * Returns false when the expected secret is missing.
 */
export function verifySecretHeader(
  source: HeaderSource,
  headerName: string,
  expectedSecret?: string,
): boolean {
  if (!expectedSecret) return false;

  const headers =
    "get" in source ? source : ("headers" in source ? source.headers : undefined);
  if (!headers) return false;

  const provided = headers.get(headerName);
  if (!provided || provided.length !== expectedSecret.length) {
    return false;
  }

  try {
    const providedBuffer = Buffer.from(provided, "utf-8");
    const secretBuffer = Buffer.from(expectedSecret, "utf-8");
    return timingSafeEqual(providedBuffer, secretBuffer);
  } catch {
    return false;
  }
}
