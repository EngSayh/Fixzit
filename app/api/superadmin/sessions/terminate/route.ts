/**
 * @fileoverview Superadmin Session Termination API
 * @description Terminate user sessions (force logout)
 * @route POST /api/superadmin/sessions/terminate
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/sessions/terminate
 * @since FEAT-0032 [AGENT-001-A]
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import {
  revokeSession,
  revokeAllUserSessions,
} from "@/server/models/RevokedSession";
import { logger } from "@/lib/logger";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

/**
 * POST /api/superadmin/sessions/terminate
 * Terminate a specific session or all sessions for a user
 *
 * @body userId - User ID to terminate sessions for
 * @body sessionId - Optional specific session ID to terminate
 * @body terminateAll - If true, terminate all sessions for the user
 * @body reason - Reason for termination
 * @body notes - Optional notes for audit
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const { userId, sessionId, terminateAll, reason, notes, orgId, sessionIp } =
      body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    // orgId is required for tenant isolation
    if (!orgId || typeof orgId !== "string") {
      return NextResponse.json(
        { error: "orgId is required for tenant isolation" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const validReasons = [
      "manual",
      "security_incident",
      "password_change",
      "account_disabled",
      "bulk_revoke",
    ];
    const normalizedReason =
      typeof reason === "string" && validReasons.includes(reason)
        ? reason
        : "manual";

    await connectDb();

    if (terminateAll) {
      // Revoke all sessions for the user
      const count = await revokeAllUserSessions({
        userId,
        orgId,
        reason: normalizedReason as
          | "manual"
          | "security_incident"
          | "password_change"
          | "account_disabled"
          | "bulk_revoke",
        revokedBy: session.username,
        notes: typeof notes === "string" ? notes : undefined,
      });

      logger.info("[Superadmin] All user sessions terminated", {
        userId,
        reason: normalizedReason,
        admin: session.username,
        count,
      });

      return NextResponse.json(
        {
          success: true,
          message: "All sessions terminated",
          count,
        },
        { headers: ROBOTS_HEADER }
      );
    }

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json(
        { error: "sessionId is required (or set terminateAll: true)" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    // Revoke specific session
    // JWT expires in 15 minutes, so set expiry accordingly
    const jwtExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await revokeSession({
      sessionId,
      userId,
      orgId,
      reason: normalizedReason as
        | "manual"
        | "security_incident"
        | "password_change"
        | "account_disabled"
        | "bulk_revoke",
      revokedBy: session.username,
      sessionIp: typeof sessionIp === "string" ? sessionIp : undefined,
      jwtExpiresAt,
      notes: typeof notes === "string" ? notes : undefined,
    });

    logger.info("[Superadmin] Session terminated", {
      sessionId,
      userId,
      reason: normalizedReason,
      admin: session.username,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Session terminated",
        sessionId,
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin Sessions] Error terminating session", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to terminate session" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
