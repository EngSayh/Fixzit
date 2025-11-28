import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Application } from "@/server/models/Application";
import { atsRBAC } from "@/lib/ats/rbac";
import { Types } from "mongoose";

import { rateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";

/**
 * GET /api/ats/applications - List applications with filtering
 */
export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();

    // RBAC: Check permissions for reading applications
    const authResult = await atsRBAC(req, ["applications:read"]);
    if (!authResult.authorized) {
      return authResult.response;
    }
    const { orgId } = authResult;

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const stage = searchParams.get("stage");
    const candidateId = searchParams.get("candidateId");
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");

    const page = pageParam ? Number.parseInt(pageParam, 10) : 1;
    const limitRaw = limitParam ? Number.parseInt(limitParam, 10) : 50;

    if (!Number.isFinite(page) || page < 1) {
      return NextResponse.json(
        { success: false, error: "Invalid page parameter" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(limitRaw) || limitRaw < 1) {
      return NextResponse.json(
        { success: false, error: "Invalid limit parameter" },
        { status: 400 },
      );
    }

    const limit = Math.min(limitRaw, 100);

    const filter: Record<string, unknown> = { orgId };
    if (jobId) {
      if (!Types.ObjectId.isValid(jobId)) {
        return NextResponse.json(
          { success: false, error: "Invalid jobId parameter" },
          { status: 400 },
        );
      }
      filter.jobId = new Types.ObjectId(jobId);
    }
    if (stage && stage !== "all") filter.stage = stage;
    if (candidateId) {
      if (!Types.ObjectId.isValid(candidateId)) {
        return NextResponse.json(
          { success: false, error: "Invalid candidateId parameter" },
          { status: 400 },
        );
      }
      filter.candidateId = new Types.ObjectId(candidateId);
    }

    const applications = await Application.find(filter)
      .populate("jobId", "title department location")
      .populate(
        "candidateId",
        "firstName lastName email phone skills experience",
      )
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Application.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: applications,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error(
      "Applications list error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { success: false, error: "Failed to fetch applications" },
      { status: 500 },
    );
  }
}
