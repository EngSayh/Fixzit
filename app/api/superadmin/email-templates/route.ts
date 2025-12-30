/**
 * @fileoverview Superadmin Email Templates API
 * @description CRUD for email template configurations
 * @route GET/POST /api/superadmin/email-templates
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/email-templates
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { EmailTemplate } from "@/server/models/EmailTemplate";
import { z } from "zod";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

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
  required: z.boolean().optional().default(false),
  defaultValue: z.string().max(500).optional(),
});

const CreateTemplateSchema = z.object({
  key: z.string().min(1).max(100).regex(/^[a-z0-9_-]+$/, "Key must be alphanumeric with underscores/dashes"),
  name: z.string().min(1).max(200),
  category: z.enum(TEMPLATE_CATEGORIES),
  subject: z.string().min(1).max(500),
  subjectAr: z.string().max(500).optional(),
  bodyHtml: z.string().min(1),
  bodyHtmlAr: z.string().optional(),
  bodyText: z.string().optional(),
  bodyTextAr: z.string().optional(),
  variables: z.array(VariableSchema).optional(),
  isActive: z.boolean().optional().default(true),
});

// Default templates to seed
const DEFAULT_TEMPLATES = [
  {
    key: "welcome",
    name: "Welcome Email",
    category: "auth",
    subject: "Welcome to Fixzit!",
    subjectAr: "مرحباً بك في فكسيت!",
    bodyHtml: `<h1>Welcome, {{userName}}!</h1><p>Thank you for joining Fixzit.</p>`,
    bodyHtmlAr: `<h1>مرحباً، {{userName}}!</h1><p>شكراً لانضمامك إلى فكسيت.</p>`,
    variables: [{ name: "userName", description: "User's display name", required: true }],
    isSystem: true,
  },
  {
    key: "password_reset",
    name: "Password Reset",
    category: "auth",
    subject: "Reset Your Password",
    subjectAr: "إعادة تعيين كلمة المرور",
    bodyHtml: `<p>Click <a href="{{resetLink}}">here</a> to reset your password.</p>`,
    bodyHtmlAr: `<p>انقر <a href="{{resetLink}}">هنا</a> لإعادة تعيين كلمة المرور.</p>`,
    variables: [{ name: "resetLink", description: "Password reset URL", required: true }],
    isSystem: true,
  },
  {
    key: "invoice_generated",
    name: "Invoice Generated",
    category: "billing",
    subject: "Invoice #{{invoiceNumber}} Generated",
    subjectAr: "تم إنشاء الفاتورة #{{invoiceNumber}}",
    bodyHtml: `<p>Your invoice #{{invoiceNumber}} for {{amount}} is ready.</p>`,
    bodyHtmlAr: `<p>فاتورتك #{{invoiceNumber}} بقيمة {{amount}} جاهزة.</p>`,
    variables: [
      { name: "invoiceNumber", required: true },
      { name: "amount", required: true },
    ],
    isSystem: true,
  },
];

/**
 * Seed default templates if collection is empty
 */
async function seedDefaultTemplatesIfEmpty(): Promise<void> {
  // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Platform-wide templates
  const count = await EmailTemplate.countDocuments({});
  if (count === 0) {
    logger.info("[EmailTemplates] Seeding default templates");
    await EmailTemplate.insertMany(DEFAULT_TEMPLATES);
  }
}

/**
 * GET /api/superadmin/email-templates
 * List all email templates
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-email-templates:get",
    requests: 30,
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
    await seedDefaultTemplatesIfEmpty();

    // Parse query params
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    // Build query
    const query: Record<string, unknown> = {};
    if (category && TEMPLATE_CATEGORIES.includes(category as typeof TEMPLATE_CATEGORIES[number])) {
      query.category = category;
    }

    // SUPER_ADMIN: Platform-wide templates (no tenant scope needed)
    const templates = await EmailTemplate.find(query)
      .sort({ category: 1, name: 1 })
      .lean();

    logger.debug("[Superadmin:EmailTemplates] Fetched templates", {
      count: templates.length,
      category,
      by: session.username,
    });

    return NextResponse.json(
      { templates },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:EmailTemplates] Error fetching templates", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * POST /api/superadmin/email-templates
 * Create a new email template
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-email-templates:post",
    requests: 10,
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

    const body = await request.json();
    const validation = CreateTemplateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Check for duplicate key
    // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Platform-wide templates
    const existing = await EmailTemplate.findOne({ key: validation.data.key });
    if (existing) {
      return NextResponse.json(
        { error: `Template with key '${validation.data.key}' already exists` },
        { status: 409, headers: ROBOTS_HEADER }
      );
    }

    const template = await EmailTemplate.create(validation.data);

    logger.info("[Superadmin:EmailTemplates] Template created", {
      templateId: template._id,
      key: template.key,
      category: template.category,
      by: session.username,
    });

    return NextResponse.json(
      { template, message: "Email template created successfully" },
      { status: 201, headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:EmailTemplates] Error creating template", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
