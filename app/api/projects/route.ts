import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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

function parseUser(req: NextRequest):
  | { id: string; orgId?: string | null; tenantId?: string | null }
  | null {
  const header = req.headers.get("x-user");
  if (!header) return null;
  try {
    const parsed = JSON.parse(header);
    if (parsed && parsed.id) return parsed;
  } catch {
    return null;
  }
  return null;
}

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const user = parseUser(req);
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
  const user = parseUser(req);
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
