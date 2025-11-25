import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";

import { rateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";

import { logger } from "@/lib/logger";
/**
 * @openapi
 * /api/qa/reconnect:
 *   get:
 *     summary: qa/reconnect operations
 *     tags: [qa]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    // Force database reconnection by accessing it
    await connectToDatabase();
    logger.info("🔄 Database reconnected successfully");

    return NextResponse.json({
      success: true,
      message: "Database reconnected successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(
      "❌ Database reconnection failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return NextResponse.json(
      {
        success: false,
        error: "Database reconnection failed",
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
