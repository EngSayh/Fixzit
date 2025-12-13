import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

type Health503Options = {
  code?: string;
  retryable?: boolean;
  headers?: Record<string, string>;
  extra?: Record<string, unknown>;
};

export function health503(
  message: string,
  req?: NextRequest | { nextUrl?: { hostname?: string } },
  opts: Health503Options = {},
): NextResponse {
  const traceId = randomUUID();
  const body = {
    error: message,
    code: opts.code ?? "service_unavailable",
    retryable: opts.retryable ?? true,
    traceId,
    ...(opts.extra ?? {}),
  };
  const res = NextResponse.json(body, {
    status: 503,
    headers: {
      "x-trace-id": traceId,
      ...(opts.headers ?? {}),
    },
  });

  const host = req?.nextUrl?.hostname;
  if (host) {
    // Preserve host context for downstream logging if available
    res.headers.set("x-request-host", host);
  }

  return res;
}
