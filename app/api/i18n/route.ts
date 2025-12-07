import { NextRequest, NextResponse } from "next/server";
import { SUPPORTED_LOCALES, type Locale } from "@/i18n/config";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

/**
 * @openapi
 * /api/i18n:
 *   post:
 *     summary: Set user locale preference
 *     tags: [i18n]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               locale:
 *                 type: string
 *                 enum: [en, ar]
 *     responses:
 *       200:
 *         description: Locale preference saved
 *       400:
 *         description: Invalid or unsupported locale
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(request: NextRequest) {
  // Rate limiting: 30 requests per minute per IP to prevent abuse
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "i18n-locale",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const body = await request.json().catch(() => ({}));
  const locale = body?.locale as Locale | undefined;

  if (!locale || !SUPPORTED_LOCALES.includes(locale)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Persist the locale choice in a cookie so the middleware and layout can read it
  const response = NextResponse.json({ ok: true });
  response.cookies.set("locale", locale, {
    path: "/",
    sameSite: "lax",
  });
  response.cookies.set("fxz.lang", locale, {
    path: "/",
    sameSite: "lax",
  });
  response.cookies.set("fxz.locale", locale === "ar" ? "ar-SA" : "en-GB", {
    path: "/",
    sameSite: "lax",
  });
  return response;
}
