import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCollections } from "@/lib/db/collections";
import { getSessionUser } from "@/server/middleware/withAuthRbac";

import { rateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";

import type { NotificationDoc } from "@/lib/models";
import { buildRateLimitKey } from "@/server/security/rateLimitKey";

const notificationSchema = z.object({
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum(["work-order", "vendor", "payment", "maintenance", "system"]),
  priority: z.enum(["low", "medium", "high"]),
  category: z.enum(["maintenance", "vendor", "finance", "system"]),
  targetUrl: z.string().url().optional(), // Optional deep link URL
  orgId: z.string().optional(),
});

// Valid enum values for filtering
const VALID_PRIORITIES = ["low", "medium", "high"] as const;
const VALID_CATEGORIES = [
  "maintenance",
  "vendor",
  "finance",
  "system",
] as const;

// All operations now backed by Mongo collection (tenant-scoped)

const escapeRegex = (input: string) =>
  input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     summary: notifications operations
 *     tags: [notifications]
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
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const category = searchParams.get("category") || "";
  const priority = searchParams.get("priority") || "";
  const read = searchParams.get("read") || "";
  const rawPage = Number.parseInt(searchParams.get("page") || "1", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const rawLimit = Number.parseInt(searchParams.get("limit") || "20", 10);
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;

  if (process.env.ALLOW_OFFLINE_MONGODB === "true") {
    return NextResponse.json(
      { items: [], total: 0, page, limit, hasMore: false },
      { status: 200 },
    );
  }

  let orgId: string;
  try {
    const user = await getSessionUser(req);
    const rl = rateLimit(buildRateLimitKey(req, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    orgId = user.orgId;
  } catch {
    return createSecureResponse({ error: "Unauthorized" }, 401, req);
  }

  const { notifications } = await getCollections();
  const filter: Record<string, unknown> = { orgId };
  if (q) {
    const safe = escapeRegex(q);
    filter.$or = [
      { title: { $regex: safe, $options: "i" } },
      { message: { $regex: safe, $options: "i" } },
    ];
  }
  // Validate category against enum before filtering
  if (
    category &&
    category !== "all" &&
    VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])
  ) {
    filter.category = category;
  }
  // Validate priority against enum before filtering
  if (
    priority &&
    priority !== "all" &&
    VALID_PRIORITIES.includes(priority as (typeof VALID_PRIORITIES)[number])
  ) {
    filter.priority = priority;
  }
  if (read !== "") filter.read = read === "true";

  const skip = (page - 1) * limit;
  const [rawItems, total] = await Promise.all([
    notifications
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    notifications.countDocuments(filter),
  ]);
  // 🔒 TYPE SAFETY: Serialize MongoDB documents with explicit type
  const items = rawItems.map((n) => ({
    id: String((n as { _id: unknown })._id),
    ...n,
    _id: undefined,
  }));

  return NextResponse.json({
    items,
    total,
    page,
    limit,
    hasMore: skip + items.length < total,
  });
}

export async function POST(req: NextRequest) {
  if (process.env.ALLOW_OFFLINE_MONGODB === "true") {
    return NextResponse.json(
      {
        error: "ServiceUnavailable",
        message:
          "Notifications API is disabled in ALLOW_OFFLINE_MONGODB mode. Provide MongoDB or disable offline mode.",
      },
      { status: 503 },
    );
  }

  let orgId: string;
  try {
    const user = await getSessionUser(req);
    const rl = rateLimit(buildRateLimitKey(req, user.id), 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }
    orgId = user.orgId;
  } catch {
    return createSecureResponse({ error: "Unauthorized" }, 401, req);
  }

  const body = await req.json();
  const data = notificationSchema.parse(body);
  const { notifications } = await getCollections();
  const doc: Omit<NotificationDoc, "id"> = {
    orgId,
    type: data.type,
    title: data.title,
    message: data.message,
    priority: data.priority,
    category: data.category,
    timestamp: new Date().toISOString(),
    read: false,
    archived: false,
    ...(data.targetUrl && { targetUrl: data.targetUrl }), // Include targetUrl if provided
  };

  const result = await notifications.insertOne(doc);
  return NextResponse.json({ ...doc, id: result.insertedId }, { status: 201 });
}
