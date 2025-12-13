import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import YAML from "yaml";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

export const runtime = "nodejs";

const swaggerEnabled =
  (process.env.SWAGGER_UI_ENABLED ??
    process.env.NEXT_PUBLIC_SWAGGER_UI_ENABLED ??
    "true") !== "false";

export async function GET(request: NextRequest) {
  enforceRateLimit(request, { requests: 60, windowMs: 60_000, keyPrefix: "docs:openapi" });
  if (!swaggerEnabled) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  try {
    const specPath = join(process.cwd(), "openapi.yaml");
    const raw = await readFile(specPath, "utf8");
    const parsed = YAML.parse(raw);

    return NextResponse.json(parsed, {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    logger.error("[SwaggerUI] Failed to load OpenAPI spec", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load OpenAPI spec" },
      { status: 500 },
    );
  }
}
