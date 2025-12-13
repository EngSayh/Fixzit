import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";

type ParseJsonOptions = {
  route: string;
  schemaName?: string;
};

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

/**
 * Parse and validate JSON bodies with structured telemetry.
 * Returns { ok: false, response } on parse/validation errors.
 */
export async function parseJsonBody<T>(
  req: NextRequest,
  schema: z.Schema<T>,
  opts: ParseJsonOptions,
): Promise<ParseResult<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    logger.warn("[parseJsonBody] Malformed JSON", {
      route: opts.route,
      error,
    });
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid JSON body", code: "invalid_json" },
        { status: 400 },
      ),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    logger.warn("[parseJsonBody] Validation failed", {
      route: opts.route,
      schema: opts.schemaName,
      issues: parsed.error.issues.map((i) => i.message).slice(0, 5),
    });
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Validation failed",
          code: "invalid_payload",
          issues: parsed.error.flatten(),
        },
        { status: 422 },
      ),
    };
  }

  return { ok: true, data: parsed.data };
}
