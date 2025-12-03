import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SupportTicket } from "@/server/models/SupportTicket";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import crypto from "crypto";

import { smartRateLimit } from "@/server/security/rateLimit";
import {
  zodValidationError,
  rateLimitError,
} from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";

const createSchema = z.object({
  subject: z.string().min(4),
  module: z.enum(["FM", "Souq", "Aqar", "Account", "Billing", "Other"]),
  type: z.enum(["Bug", "Feature", "Complaint", "Billing", "Access", "Other"]),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
  category: z
    .enum([
      "Technical",
      "Feature Request",
      "Billing",
      "Account",
      "General",
      "Bug Report",
    ])
    .default("General"),
  subCategory: z
    .enum([
      "Bug Report",
      "Performance Issue",
      "UI Error",
      "API Error",
      "Database Error",
      "New Feature",
      "Enhancement",
      "Integration",
      "Customization",
      "Mobile App",
      "Invoice Issue",
      "Payment Error",
      "Subscription",
      "Refund",
      "Pricing",
      "Login Issue",
      "Password Reset",
      "Profile Update",
      "Permissions",
      "Access Denied",
      "Documentation",
      "Training",
      "Support",
      "Feedback",
      "Other",
      "Critical Bug",
      "Minor Bug",
      "Cosmetic Issue",
      "Data Error",
      "Security Issue",
    ])
    .default("Other"),
  text: z.string().min(5),
  requester: z
    .object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional(),
    })
    .optional(),
});

/**
 * @openapi
 * /api/support/tickets:
 *   get:
 *     summary: support/tickets operations
 *     tags: [support]
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
  try {
    const user = await getSessionUser(req).catch(() => null);
    if (!user) {
      return createSecureResponse({ error: "Unauthorized" }, 401, req);
    }
    const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    await connectToDatabase();
    const body = createSchema.parse(await req.json());

    // Generate cryptographically secure ticket code
    const uuid = crypto
      .randomUUID()
      .replace(/-/g, "")
      .slice(0, 8)
      .toUpperCase();
    const code = `SUP-${new Date().getFullYear()}-${uuid}`;

    const ticket = await SupportTicket.create({
      orgId: user?.orgId,
      code,
      subject: body.subject,
      module: body.module,
      type: body.type,
      priority: body.priority,
      category: body.category,
      subCategory: body.subCategory,
      status: "New",
      createdBy: user?.id,
      requester: user ? undefined : body.requester,
      messages: [
        {
          byUserId: user?.id,
          byRole: user ? "USER" : "GUEST",
          text: body.text,
          at: new Date(),
        },
      ],
    });

    return createSecureResponse(ticket, 201, req);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, req);
    }
    logger.error(
      "Support ticket creation failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse(
      { error: "Failed to create support ticket" },
      500,
      req,
    );
  }
}

// Admin list with filters
export async function GET(req: NextRequest) {
  try {
    // Handle authentication separately to return 401 instead of 500
    let user;
    try {
      user = await getSessionUser(req);
      const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, user.orgId, user.id), 60, 60_000);
      if (!rl.allowed) {
        return rateLimitError();
      }
    } catch (authError) {
      logger.error(
        "Authentication failed:",
        authError instanceof Error ? authError.message : "Unknown error",
      );
      return createSecureResponse({ error: "Unauthorized" }, 401, req);
    }

    await connectToDatabase();

    if (
      !user ||
      !["SUPER_ADMIN", "ADMIN", "CORPORATE_ADMIN"].includes(user.role)
    ) {
      return createSecureResponse({ error: "Forbidden" }, 403, req);
    }
    const sp = new URL(req.url).searchParams;
    const status = sp.get("status") || undefined;
    const moduleKey = sp.get("module") || undefined;
    const type = sp.get("type") || undefined;
    const priority = sp.get("priority") || undefined;
    const page = Math.max(1, Number(sp.get("page") || 1));
    const limit = Math.min(100, Number(sp.get("limit") || 20));
    const match: Record<string, unknown> = {};
    const isGlobalAdmin = ["SUPER_ADMIN", "CORPORATE_ADMIN", "ADMIN"].includes(user.role);
    if (!isGlobalAdmin) {
      match.orgId = user.orgId;
    }
    if (status) match.status = status;
    if (moduleKey) match.module = moduleKey;
    if (type) match.type = type;
    if (priority) match.priority = priority;

    const [items, total] = await Promise.all([
      SupportTicket.find(match)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      SupportTicket.countDocuments(match),
    ]);
    return NextResponse.json({ items, page, limit, total });
  } catch (error) {
    logger.error(
      "Support tickets query failed:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse(
      { error: "Failed to fetch support tickets" },
      500,
      req,
    );
  }
}
