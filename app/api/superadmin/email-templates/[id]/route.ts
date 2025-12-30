/**
 * @fileoverview Superadmin Email Template by ID API
 * @description GET/PUT/DELETE individual email template
 * @route GET/PUT/DELETE /api/superadmin/email-templates/[id]
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/email-templates/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { EmailTemplate } from "@/server/models/EmailTemplate";
import { z } from "zod";
import { isValidObjectId } from "mongoose";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

interface RouteContext {
  params: Promise<{ id: string }>;
}

const TEMPLATE_CATEGORIES = [
  "auth",
  "notification",
  "billing",
  "workorder",
  "subscription",
  "marketing",
  "system",
] as const;

const VariableSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  required: z.boolean().optional(),
  defaultValue: z.string().max(500).optional(),
});

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.enum(TEMPLATE_CATEGORIES).optional(),
  subject: z.string().min(1).max(500).optional(),
  subjectAr: z.string().max(500).optional(),
  bodyHtml: z.string().min(1).optional(),
  bodyHtmlAr: z.string().optional(),
  bodyText: z.string().optional(),
  bodyTextAr: z.string().optional(),
  variables: z.array(VariableSchema).optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/superadmin/email-templates/[id]
 * Get a specific email template
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-email-template-id:get",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await context.params;
    
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid template ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const template = await EmailTemplate.findById(id).lean();
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    return NextResponse.json(
      { template },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:EmailTemplate] Error fetching template", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * PUT /api/superadmin/email-templates/[id]
 * Update an email template
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-email-template-id:put",
    requests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid template ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const body = await request.json();
    const validation = UpdateTemplateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Increment version on update
    const template = await EmailTemplate.findByIdAndUpdate(
      id,
      { 
        $set: validation.data,
        $inc: { version: 1 },
      },
      { new: true, runValidators: true }
    ).lean();

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    logger.info("[Superadmin:EmailTemplate] Template updated", {
      templateId: id,
      updates: Object.keys(validation.data),
      newVersion: template.version,
      by: session.username,
    });

    return NextResponse.json(
      { template, message: "Template updated successfully" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:EmailTemplate] Error updating template", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * DELETE /api/superadmin/email-templates/[id]
 * Delete an email template
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-email-template-id:delete",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await context.params;

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid template ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Check if it's a system template
    const existing = await EmailTemplate.findById(id).lean();
    if (existing?.isSystem) {
      return NextResponse.json(
        { error: "Cannot delete system templates" },
        { status: 403, headers: ROBOTS_HEADER }
      );
    }

    const template = await EmailTemplate.findByIdAndDelete(id);
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    logger.info("[Superadmin:EmailTemplate] Template deleted", {
      templateId: id,
      templateKey: template.key,
      by: session.username,
    });

    return NextResponse.json(
      { message: "Template deleted successfully" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:EmailTemplate] Error deleting template", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
