import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Interview } from "@/server/models/ats/Interview";
import { Application } from "@/server/models/Application";
import { atsRBAC } from "@/lib/ats/rbac";
import { Types } from "mongoose";

import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";

/**
 * GET /api/ats/interviews - List interviews with filtering
 */
export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();

    // RBAC: Check permissions for reading interviews
    const authResult = await atsRBAC(req, ["interviews:read"]);
    if (!authResult.authorized) {
      return authResult.response;
    }
    const { orgId } = authResult;

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const applicationId = searchParams.get("applicationId");
    const candidateId = searchParams.get("candidateId");
    const status = searchParams.get("status");
    const stage = searchParams.get("stage");
    const from = searchParams.get("from"); // Date filter
    const to = searchParams.get("to");
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
    if (applicationId) {
      if (!Types.ObjectId.isValid(applicationId)) {
        return NextResponse.json(
          { success: false, error: "Invalid applicationId parameter" },
          { status: 400 },
        );
      }
      filter.applicationId = new Types.ObjectId(applicationId);
    }
    if (candidateId) {
      if (!Types.ObjectId.isValid(candidateId)) {
        return NextResponse.json(
          { success: false, error: "Invalid candidateId parameter" },
          { status: 400 },
        );
      }
      filter.candidateId = new Types.ObjectId(candidateId);
    }
    if (status && status !== "all") filter.status = status;
    if (stage && stage !== "all") filter.stage = stage;

    // Date range filter
    if (from || to) {
      const scheduledAt: Record<string, Date> = {};
      if (from) {
        const fromDate = new Date(from);
        if (Number.isNaN(fromDate.getTime())) {
          return NextResponse.json(
            { success: false, error: "Invalid from date" },
            { status: 400 },
          );
        }
        scheduledAt.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        if (Number.isNaN(toDate.getTime())) {
          return NextResponse.json(
            { success: false, error: "Invalid to date" },
            { status: 400 },
          );
        }
        scheduledAt.$lte = toDate;
      }
      filter.scheduledAt = scheduledAt;
    }

    const interviews = await Interview.find(filter)
      .select(
        "jobId candidateId applicationId scheduledAt duration stage status feedback interviewers location notes createdAt updatedAt",
      )
      .populate("jobId", "title department")
      .populate("candidateId", "firstName lastName email phone")
      .populate("applicationId", "stage score")
      .sort({ scheduledAt: 1 }) // Upcoming first
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Interview.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: interviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error(
      "Interviews list error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { success: false, error: "Failed to fetch interviews" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/ats/interviews - Create new interview
 */
const INTERVIEW_STAGES = [
  "screening",
  "technical",
  "hr",
  "final",
  "panel",
] as const;
const INTERVIEW_STATUSES = [
  "scheduled",
  "completed",
  "cancelled",
  "rescheduled",
  "no-show",
] as const;

export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();
    const body = await req.json();

    // RBAC: Check permissions for creating interviews
    const authResult = await atsRBAC(req, ["interviews:create"]);
    if (!authResult.authorized) {
      return authResult.response;
    }
    const { userId, orgId } = authResult;

    // Validate required fields
    if (!body.applicationId || !body.scheduledAt) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: applicationId, scheduledAt",
        },
        { status: 400 },
      );
    }

    if (!Types.ObjectId.isValid(body.applicationId)) {
      return NextResponse.json(
        { success: false, error: "Invalid applicationId" },
        { status: 400 },
      );
    }

    const application = await Application.findOne({
      _id: body.applicationId,
      orgId,
    })
      .select("jobId candidateId orgId")
      .lean();

    if (!application) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 },
      );
    }

    const scheduledAt = new Date(body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid scheduledAt date" },
        { status: 400 },
      );
    }

    const stageValue =
      body.stage && INTERVIEW_STAGES.includes(body.stage)
        ? body.stage
        : "screening";
    const statusValue =
      body.status && INTERVIEW_STATUSES.includes(body.status)
        ? body.status
        : "scheduled";
    const duration =
      typeof body.duration === "number" && body.duration > 0
        ? body.duration
        : 60;
    const interviewers = Array.isArray(body.interviewers)
      ? body.interviewers
      : [];
    const metadata =
      typeof body.metadata === "object" && body.metadata !== null
        ? body.metadata
        : {};
    const feedback =
      typeof body.feedback === "object" && body.feedback !== null
        ? body.feedback
        : undefined;

    const interviewPayload: Record<string, unknown> = {
      applicationId: new Types.ObjectId(application._id),
      jobId: application.jobId,
      candidateId: application.candidateId,
      interviewers,
      stage: stageValue,
      status: statusValue,
      scheduledAt,
      duration,
      location: body.location,
      meetingUrl: body.meetingUrl,
      notes: body.notes,
      metadata,
      orgId,
      createdBy: userId,
    };

    if (feedback) {
      interviewPayload.feedback = feedback;
    }

    const interview = await Interview.create(interviewPayload);

    return NextResponse.json(
      { success: true, data: interview },
      { status: 201 },
    );
  } catch (error) {
    logger.error(
      "Interview creation error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { success: false, error: "Failed to create interview" },
      { status: 500 },
    );
  }
}
