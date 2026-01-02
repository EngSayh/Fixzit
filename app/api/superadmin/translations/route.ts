/**
 * @fileoverview Superadmin Translations API
 * @description GET/POST translation keys with auto-seeding
 * @route GET/POST /api/superadmin/translations
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/translations
 * @agent [AGENT-001-A]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { Translation } from "@/server/models/Translation";
import { z } from "zod";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

/**
 * Escape special regex characters to prevent ReDoS attacks.
 * User input could contain patterns like (a+)+$ that cause catastrophic backtracking.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const TRANSLATION_STATUSES = ["draft", "pending_review", "approved", "published"] as const;

const CreateTranslationSchema = z.object({
  key: z.string().min(1).max(200),
  namespace: z.string().min(1).max(50).default("common"),
  context: z.string().max(500).optional(),
  values: z.object({
    en: z.string(),
    ar: z.string(),
  }).passthrough(), // Allow other locales
  status: z.enum(TRANSLATION_STATUSES).optional(),
  category: z.string().max(50).optional(),
  isRTL: z.boolean().optional(),
  variables: z.array(z.string().max(50)).max(20).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

// Default translations to seed
const DEFAULT_TRANSLATIONS = [
  {
    key: "buttons.save",
    namespace: "common",
    values: { en: "Save", ar: "حفظ" },
    status: "published" as const,
    category: "buttons",
    isSystem: true,
  },
  {
    key: "buttons.cancel",
    namespace: "common",
    values: { en: "Cancel", ar: "إلغاء" },
    status: "published" as const,
    category: "buttons",
    isSystem: true,
  },
  {
    key: "buttons.delete",
    namespace: "common",
    values: { en: "Delete", ar: "حذف" },
    status: "published" as const,
    category: "buttons",
    isSystem: true,
  },
  {
    key: "buttons.edit",
    namespace: "common",
    values: { en: "Edit", ar: "تعديل" },
    status: "published" as const,
    category: "buttons",
    isSystem: true,
  },
  {
    key: "buttons.add",
    namespace: "common",
    values: { en: "Add", ar: "إضافة" },
    status: "published" as const,
    category: "buttons",
    isSystem: true,
  },
  {
    key: "buttons.submit",
    namespace: "common",
    values: { en: "Submit", ar: "إرسال" },
    status: "published" as const,
    category: "buttons",
    isSystem: true,
  },
  {
    key: "labels.name",
    namespace: "common",
    values: { en: "Name", ar: "الاسم" },
    status: "published" as const,
    category: "labels",
    isSystem: true,
  },
  {
    key: "labels.email",
    namespace: "common",
    values: { en: "Email", ar: "البريد الإلكتروني" },
    status: "published" as const,
    category: "labels",
    isSystem: true,
  },
  {
    key: "labels.phone",
    namespace: "common",
    values: { en: "Phone", ar: "الهاتف" },
    status: "published" as const,
    category: "labels",
    isSystem: true,
  },
  {
    key: "messages.success",
    namespace: "common",
    values: { en: "Operation completed successfully", ar: "تمت العملية بنجاح" },
    status: "published" as const,
    category: "messages",
    isSystem: true,
  },
  {
    key: "messages.error",
    namespace: "common",
    values: { en: "An error occurred", ar: "حدث خطأ" },
    status: "published" as const,
    category: "messages",
    isSystem: true,
  },
  {
    key: "errors.required",
    namespace: "validation",
    values: { en: "This field is required", ar: "هذا الحقل مطلوب" },
    status: "published" as const,
    category: "errors",
    isSystem: true,
  },
  {
    key: "errors.invalid_email",
    namespace: "validation",
    values: { en: "Invalid email address", ar: "عنوان البريد الإلكتروني غير صالح" },
    status: "published" as const,
    category: "errors",
    isSystem: true,
  },
];

async function seedDefaultTranslations(): Promise<void> {
  try {
    const existingCount = await Translation.countDocuments({ isSystem: true });
    if (existingCount > 0) return;

    await Translation.insertMany(DEFAULT_TRANSLATIONS, { ordered: false });
    logger.info("[Superadmin:Translations] Seeded default translations", {
      count: DEFAULT_TRANSLATIONS.length,
    });
  } catch (error) {
    if (error instanceof Error && !error.message.includes("duplicate key")) {
      logger.warn("[Superadmin:Translations] Error seeding translations", {
        error: error.message,
      });
    }
  }
}

/**
 * GET /api/superadmin/translations
 * List all translations
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-translations:get",
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
    await seedDefaultTranslations();

    const { searchParams } = new URL(request.url);
    const namespace = searchParams.get("namespace");
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    const query: Record<string, unknown> = {};
    if (namespace) {
      query.namespace = namespace;
    }
    if (status && TRANSLATION_STATUSES.includes(status as typeof TRANSLATION_STATUSES[number])) {
      query.status = status;
    }
    if (category) {
      query.category = category;
    }
    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { key: { $regex: escapedSearch, $options: "i" } },
        { "values.en": { $regex: escapedSearch, $options: "i" } },
        { "values.ar": { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const [translations, total] = await Promise.all([
      Translation.find(query)
        .sort({ namespace: 1, key: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Translation.countDocuments(query),
    ]);

    // Get unique namespaces and categories for filters
    const [namespaces, categories] = await Promise.all([
      Translation.distinct("namespace"),
      Translation.distinct("category"),
    ]);

    return NextResponse.json(
      {
        translations,
        namespaces,
        categories: categories.filter(Boolean),
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
    logger.error("[Superadmin:Translations] Error fetching translations", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * POST /api/superadmin/translations
 * Create a new translation
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-translations:post",
    requests: 20,
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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }
    const validation = CreateTranslationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Check for duplicate
    const existing = await Translation.findOne({
      key: validation.data.key,
      namespace: validation.data.namespace,
    });
    if (existing) {
      return NextResponse.json(
        { error: `Translation '${validation.data.namespace}.${validation.data.key}' already exists` },
        { status: 409, headers: ROBOTS_HEADER }
      );
    }

    const translation = await Translation.create({
      ...validation.data,
      isSystem: false,
      lastEditedBy: session.username,
    });

    logger.info("[Superadmin:Translations] Translation created", {
      translationId: translation._id.toString(),
      key: translation.key,
      namespace: translation.namespace,
      by: session.username,
    });

    return NextResponse.json(
      { translation, message: "Translation created successfully" },
      { status: 201, headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Translations] Error creating translation", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
