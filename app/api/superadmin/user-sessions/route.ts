/**
 * @fileoverview Superadmin User Sessions API
 * @description Retrieves active user sessions for superadmin portal
 * @route GET /api/superadmin/user-sessions
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/user-sessions
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb-unified";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { User } from "@/server/models/User";
import { logger } from "@/lib/logger";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

/**
 * GET /api/superadmin/user-sessions
 * Retrieves list of users with recent activity as "sessions"
 */
export async function GET(request: NextRequest) {
  try {
    // Verify superadmin session
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    // Get users with recent activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const query = {
      "security.lastLogin": { $gte: thirtyDaysAgo },
    };

    const [users, total] = await Promise.all([
      User.find(query)
        .select("_id email username phone professional.role status security.lastLogin org_id personal.firstName personal.lastName")
        .sort({ "security.lastLogin": -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    // Transform users to session format
    // Determine if session is "active" based on lastLogin within the last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const sessions = users.map((user) => {
      const firstName = user.personal?.firstName || "";
      const lastName = user.personal?.lastName || "";
      const displayName = firstName || lastName 
        ? `${firstName} ${lastName}`.trim() 
        : user.username || user.email?.split("@")[0] || "Unknown";
      
      const lastLoginDate = user.security?.lastLogin ? new Date(user.security.lastLogin) : null;
      const isActive = lastLoginDate ? lastLoginDate >= thirtyMinutesAgo : false;
      
      return {
        _id: user._id.toString(),
        sessionId: `session_${user._id.toString().slice(-8)}`,
        userId: user._id.toString(),
        userName: displayName,
        userEmail: user.email || "",
        userRole: user.professional?.role || "USER",
        status: user.status || "ACTIVE",
        tenantName: "", // Would need org lookup
        device: "Unknown", // Would need session tracking
        browser: "Unknown", // Would need session tracking
        os: "Unknown", // Would need session tracking
        // UI expects 'ip', not 'ipAddress'
        ip: "", // Would need session tracking
        ipAddress: "", // Keep for backward compatibility
        location: "", // Would need IP geolocation service
        // UI expects 'startedAt', not just 'loginTime'
        startedAt: user.security?.lastLogin,
        loginTime: user.security?.lastLogin,
        lastActive: user.security?.lastLogin,
        expiresAt: user.security?.lastLogin
          ? new Date(new Date(user.security.lastLogin).getTime() + 24 * 60 * 60 * 1000)
          : null,
        // UI expects these fields
        pagesVisited: 0, // Would need activity tracking
        actionsPerformed: 0, // Would need activity tracking
        isActive, // Based on lastLogin within 30 minutes
      };
    });

    return NextResponse.json(
      {
        sessions,
        total,
        page,
        pages: Math.ceil(total / limit),
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin User Sessions] Error fetching sessions", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to fetch user sessions" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
