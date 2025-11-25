/**
 * Standardized HTTP response helpers with correlation IDs
 * @module lib/api/http
 */
import { NextResponse } from "next/server";

export type ErrorPayload = {
  name?: string;
  code?: string | number;
  userMessage: string;
  devMessage?: string;
  correlationId: string;
};

/**
 * Success response with correlation ID
 * NOTE: correlationId is REQUIRED (no fallback) to force compile-time checks
 */
export function ok(
  data: unknown,
  ctx: { correlationId: string },
  status = 200,
): NextResponse {
  // Handle arrays and primitives correctly (don't use spread on non-objects)
  let payload: unknown;

  if (Array.isArray(data)) {
    // Wrap arrays in { items: [...] } to maintain structure
    payload = {
      items: data,
      correlationId: ctx.correlationId,
    };
  } else if (typeof data === "object" && data !== null) {
    // Spread objects and add correlationId
    payload = {
      ...(data as Record<string, unknown>),
      correlationId: ctx.correlationId,
    };
  } else {
    // Wrap primitives in { data: value }
    payload = {
      data,
      correlationId: ctx.correlationId,
    };
  }

  return NextResponse.json(payload, { status });
}

/**
 * Error response with standardized shape
 * NOTE: correlationId is REQUIRED (no fallback)
 */
export function error(
  userMessage: string,
  status: number,
  ctx: { correlationId: string; code?: string; devMessage?: string },
): NextResponse {
  const payload: ErrorPayload = {
    name: "Error",
    code: ctx.code ?? status,
    userMessage,
    devMessage: ctx.devMessage,
    correlationId: ctx.correlationId,
  };
  return NextResponse.json({ error: payload }, { status });
}

type ErrorContext = {
  correlationId: string;
  code?: string;
  devMessage?: string;
};

export const badRequest = (m: string, ctx: ErrorContext) => error(m, 400, ctx);
export const unauthorized = (m: string, ctx: ErrorContext) =>
  error(m, 401, ctx);
export const forbidden = (m: string, ctx: ErrorContext) => error(m, 403, ctx);
export const notFound = (m: string, ctx: ErrorContext) => error(m, 404, ctx);
export const serverError = (m: string, ctx: ErrorContext) => error(m, 500, ctx);
