/**
 * Standardized HTTP response helpers with correlation IDs
 * @module lib/api/http
 */
import { NextResponse } from 'next/server';

export type ErrorPayload = {
  name?: string;
  code?: string | number;
  userMessage: string;
  devMessage?: string;
  correlationId: string;
};

/**
 * Wraps handler with correlation ID for request tracing
 * @param fn Handler function that receives correlationId
 * @returns Promise of handler result
 */
export function withCorrelation<T>(fn: (correlationId: string) => Promise<T>): Promise<T> {
  const correlationId = crypto.randomUUID();
  return fn(correlationId);
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new NextResponse(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/**
 * Success response with optional correlation ID
 */
export function ok(data: unknown, ctx?: { correlationId?: string }, status = 200) {
  return json({ ...(data as Record<string, unknown> ?? {}), ...(ctx?.correlationId ? { correlationId: ctx.correlationId } : {}) }, status);
}

/**
 * Error response with standardized shape
 */
export function error(
  userMessage: string,
  status: number,
  ctx?: { code?: string; devMessage?: string; correlationId?: string }
) {
  const payload: ErrorPayload = {
    name: 'Error',
    code: ctx?.code ?? status,
    userMessage,
    devMessage: ctx?.devMessage,
    correlationId: ctx?.correlationId ?? crypto.randomUUID(),
  };
  return json({ error: payload }, status);
}

type ErrorContext = { code?: string; devMessage?: string; correlationId?: string };

export const badRequest = (m: string, ctx?: ErrorContext) => error(m, 400, ctx);
export const unauthorized = (m: string, ctx?: ErrorContext) => error(m, 401, ctx);
export const forbidden = (m: string, ctx?: ErrorContext) => error(m, 403, ctx);
export const notFound = (m: string, ctx?: ErrorContext) => error(m, 404, ctx);
export const serverError = (m: string, ctx?: ErrorContext) => error(m, 500, ctx);
