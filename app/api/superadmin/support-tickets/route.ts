/**
 * @fileoverview Superadmin Support Tickets API
 * @description Cross-tenant support ticket management
 * @route GET /api/superadmin/support-tickets
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/support-tickets
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { SupportTicket } from "@/server/models/SupportTicket";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

/**
 * GET /api/superadmin/support-tickets
 * List all support tickets across tenants with filtering and pagination
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-support-tickets:get",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const ticketModule = searchParams.get("module");

    // Parse and validate pagination with NaN protection
    const parsedPage = parseInt(searchParams.get("page") || "1", 10);
    const parsedLimit = parseInt(searchParams.get("limit") || "50", 10);
    const page = Number.isNaN(parsedPage) ? 1 : Math.max(1, Math.floor(parsedPage));
    const limit = Number.isNaN(parsedLimit) ? 50 : Math.min(100, Math.max(1, Math.floor(parsedLimit)));
    const skip = (page - 1) * limit;

    // Build query filter
    const filter: Record<string, unknown> = {};
    if (status && status !== "all") {
      // Map "open" to active statuses
      if (status === "open") {
        filter.status = { $in: ["New", "Open", "Waiting"] };
      } else if (status === "closed") {
        filter.status = { $in: ["Resolved", "Closed"] };
      } else {
        filter.status = status;
      }
    }
    if (priority && priority !== "all") {
      filter.priority = priority;
    }
    if (ticketModule && ticketModule !== "all") {
      filter.module = ticketModule;
    }

    // Query tickets across all tenants (superadmin privilege)
    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("code subject module type priority category status requester createdAt resolvedAt orgId")
        .lean(),
      SupportTicket.countDocuments(filter),
    ]);

    logger.debug("[Superadmin:SupportTickets] Tickets fetched", {
      superadminUsername: session.username,
      total,
      page,
      limit,
      filters: { status, priority, module: ticketModule },
    });

    return NextResponse.json(
      {
        tickets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:SupportTickets] Failed to fetch tickets", { error });
    return NextResponse.json(
      { error: "Failed to fetch support tickets" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
