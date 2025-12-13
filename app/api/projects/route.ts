/**
 * @fileoverview Projects API (Test Environment)
 * @description Test-only endpoint for Playwright E2E tests - manages construction/renovation projects with in-memory storage
 * @route GET /api/projects - List all projects
 * @route POST /api/projects - Create a new project
 * @access Private - Requires authentication, TEST_ENV only
 * @module projects
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

/**
 * SECURITY: This is a TEST-ONLY endpoint for Playwright E2E tests.
 * It uses in-memory storage and is NOT suitable for production.
 * The endpoint is locked to NODE_ENV=test or PLAYWRIGHT_TESTS=true.
 */

// Environment check - must be test environment
const IS_TEST_ENV = process.env.NODE_ENV === "test" || process.env.PLAYWRIGHT_TESTS === "true";

// In-memory store for test runs (Playwright uses mock headers)
const projects: Array<Record<string, unknown>> = [];

const locationSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
});

const projectSchema = z.object({
  name: z.string().min(1, "name required"),
  description: z.string().optional(),
  type: z.enum([
    "NEW_CONSTRUCTION",
    "RENOVATION",
    "MAINTENANCE",
    "PLANNING",
  ]),
  propertyId: z.string().optional(),
  location: locationSchema.optional(),
  timeline: z
    .object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      duration: z.number().optional(),
    })
    .optional(),
  budget: z
    .object({
      total: z.number(),
      currency: z.string().optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
});

// SECURITY FIX: Only parse x-user header in test environment
// In production, always use getSessionUser for proper authentication
async function getAuthenticatedUser(req: NextRequest): Promise<
  | { id: string; orgId: string; tenantId?: string }
  | null
> {
  // In test environment (NODE_ENV=test), allow x-user header for Playwright
  if (IS_TEST_ENV) {
    const header = req.headers.get("x-user");
    if (header) {
      try {
        const parsed = JSON.parse(header);
        if (parsed && parsed.id) {
          return {
            id: parsed.id,
            orgId: parsed.orgId || "test-org",
            tenantId: parsed.tenantId,
          };
        }
      } catch {
        // Invalid header, fall through to session auth
      }
    }
  }

  // Production: Use proper session authentication
  try {
    const user = await getSessionUser(req);
    return {
      id: user.id,
      orgId: user.orgId,
      tenantId: user.tenantId,
    };
  } catch {
    return null;
  }
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function notFound() {
  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

export async function POST(req: NextRequest) {
  // SECURITY: This endpoint is test-only - return 404 in production
  if (!IS_TEST_ENV) {
    return notFound();
  }
  enforceRateLimit(req, { requests: 10, windowMs: 60_000, keyPrefix: "test:projects" });

  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const result = projectSchema.safeParse(body);
  if (!result.success) {
    const { fieldErrors, formErrors } = result.error.flatten();
    return NextResponse.json(
      { error: { fieldErrors, formErrors } },
      { status: 422 },
    );
  }

  const data = result.data;
  const code = `PRJ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const now = new Date().toISOString();

  const record = {
    _id: code,
    code,
    tenantId: user.tenantId || user.orgId || "tenant-default",
    createdBy: user.id,
    status: "PLANNING",
    progress: {
      overall: 0,
      schedule: 0,
      quality: 0,
      cost: 0,
      lastUpdated: now,
    },
    name: data.name,
    description: data.description ?? "",
    type: data.type,
    propertyId: data.propertyId,
    location: data.location,
    budget: {
      total: data.budget?.total ?? 0,
      currency: data.budget?.currency || "SAR",
    },
    timeline: data.timeline ?? {},
    tags: data.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };

  projects.push(record);

  return NextResponse.json(record, { status: 201 });
}

export async function GET(req: NextRequest) {
  // SECURITY: This endpoint is test-only - return 404 in production
  if (!IS_TEST_ENV) {
    return notFound();
  }
  enforceRateLimit(req, { requests: 30, windowMs: 60_000, keyPrefix: "test:projects:list" });

  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("limit")) || 20),
  );
  const type = url.searchParams.get("type");
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search");

  let items = projects.filter(
    (p) => p.tenantId === (user.tenantId || user.orgId || "tenant-default"),
  );

  if (type) {
    items = items.filter((p) => p.type === type);
  }
  if (status) {
    items = items.filter((p) => p.status === status);
  }
  if (search) {
    items = items.filter(
      (p) =>
        String(p.name || "").includes(search) ||
        String(p.description || "").includes(search),
    );
  }

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const paged = items.slice(start, start + limit);

  return NextResponse.json({
    items: paged,
    page,
    limit,
    total,
    pages,
  });
}
