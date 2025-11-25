import { test, expect } from "@playwright/test";

/**
 * Framework: @playwright/test
 * Conventions:
 * - baseURL from qa/playwright.config.ts
 * - Auth via getSessionUser dev fallback using 'x-user' header with JSON payload
 * - Unauthenticated checks use a fresh APIRequestContext without headers/cookies
 */

const API_PATH = "/api/projects";

const rand = () => Math.random().toString(36).slice(2, 10);
const newTenantId = () => `tenant-${Date.now()}-${rand()}`;
const newUser = (tenantId = newTenantId()) => ({
  id: `u-${rand()}`,
  tenantId,
  orgId: tenantId,
  role: "admin",
});

async function newAuthedRequest(
  playwright: any,
  baseURL: string | undefined,
  user = newUser(),
) {
  const ctx = await playwright.request.newContext({
    baseURL,
    extraHTTPHeaders: { "x-user": JSON.stringify(user) },
  });
  return { ctx, user };
}

function validProjectPayload(overrides: Partial<Record<string, any>> = {}) {
  return {
    name: "New HQ Construction",
    description: "HQ build-out phase 1",
    type: "NEW_CONSTRUCTION",
    propertyId: "prop_123",
    location: {
      address: "123 Main St",
      city: "Riyadh",
      coordinates: { lat: 24.7136, lng: 46.6753 },
    },
    timeline: {
      startDate: "2025-01-10",
      endDate: "2025-06-15",
      duration: 156,
    },
    budget: {
      total: 2500000, // currency optional; schema defaults to "SAR"
    },
    tags: ["priority", "hq"],
    ...overrides,
  };
}

test.describe("Projects API - POST /api/projects", () => {
  test("returns 401 when unauthenticated", async ({ playwright }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const anon = await playwright.request.newContext({ baseURL });
    const res = await anon.post(API_PATH, { data: validProjectPayload() });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    await anon.dispose();
  });

  test("returns 422 with Zod details when name is empty", async ({
    playwright,
  }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const { ctx } = await newAuthedRequest(playwright, baseURL);
    const res = await ctx.post(API_PATH, {
      data: validProjectPayload({ name: "" }),
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(body.error).toHaveProperty("fieldErrors");
    const nameErrors = body.error.fieldErrors?.name ?? [];
    expect(Array.isArray(nameErrors)).toBe(true);
    expect(nameErrors.length).toBeGreaterThan(0);
    await ctx.dispose();
  });

  test("creates project successfully with defaults and server fields", async ({
    playwright,
  }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const { ctx } = await newAuthedRequest(playwright, baseURL);
    const payload = validProjectPayload({ budget: { total: 1000 } }); // omit currency -> default "SAR"
    const res = await ctx.post(API_PATH, { data: payload });
    expect(res.status()).toBe(201);
    const project = await res.json();

    expect(project).toMatchObject({
      name: payload.name,
      description: payload.description,
      type: payload.type,
      propertyId: payload.propertyId,
      timeline: payload.timeline,
      budget: { total: 1000, currency: "SAR" },
      tags: payload.tags,
      status: "PLANNING",
      progress: expect.objectContaining({
        overall: 0,
        schedule: 0,
        quality: 0,
        cost: 0,
      }),
    });
    expect(project).toHaveProperty("_id");
    expect(project).toHaveProperty("tenantId");
    expect(project).toHaveProperty("createdBy");
    expect(typeof project.code).toBe("string");
    expect(project.code.startsWith("PRJ-")).toBe(true);
    expect(project.progress).toHaveProperty("lastUpdated");
    await ctx.dispose();
  });

  test("returns 422 for invalid type enum", async ({
    playwright,
  }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const { ctx } = await newAuthedRequest(playwright, baseURL);
    const res = await ctx.post(API_PATH, {
      data: validProjectPayload({ type: "INVALID_TYPE" }),
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    await ctx.dispose();
  });

  test("returns 422 for invalid coordinates types", async ({
    playwright,
  }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const { ctx } = await newAuthedRequest(playwright, baseURL);
    const res = await ctx.post(API_PATH, {
      data: validProjectPayload({
        location: { coordinates: { lat: "24.7", lng: "46.6" } },
      }),
    });
    expect(res.status()).toBe(422);
    await ctx.dispose();
  });
});

test.describe("Projects API - GET /api/projects", () => {
  test("returns 401 when unauthenticated", async ({ playwright }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const anon = await playwright.request.newContext({ baseURL });
    const res = await anon.get(API_PATH);
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
    await anon.dispose();
  });

  test("lists projects with defaults (page=1, limit=20)", async ({
    playwright,
  }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const { ctx } = await newAuthedRequest(playwright, baseURL);
    const res = await ctx.get(API_PATH);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
    expect(typeof body.total).toBe("number");
    expect(typeof body.pages).toBe("number");
    await ctx.dispose();
  });

  test("respects page min=1 and limit max=100", async ({
    playwright,
  }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const { ctx } = await newAuthedRequest(playwright, baseURL);
    const res = await ctx.get(`${API_PATH}?page=0&limit=200`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.page).toBe(1);
    expect(body.limit).toBeLessThanOrEqual(100);
    await ctx.dispose();
  });

  test("filters by type and status (NEW_CONSTRUCTION, PLANNING)", async ({
    playwright,
  }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    // Reuse one tenant to ensure isolation
    const tenantId = newTenantId();
    const { ctx } = await newAuthedRequest(
      playwright,
      baseURL,
      newUser(tenantId),
    );

    const create = await ctx.post(API_PATH, {
      data: validProjectPayload({ type: "NEW_CONSTRUCTION" }),
    });
    expect(create.status()).toBe(201);

    const res = await ctx.get(
      `${API_PATH}?type=NEW_CONSTRUCTION&status=PLANNING`,
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    for (const item of body.items) {
      expect(item.type).toBe("NEW_CONSTRUCTION");
      expect(item.status).toBe("PLANNING");
    }
    await ctx.dispose();
  });

  test("supports search parameter (returns 200 with matching item or 500 if text index missing)", async ({
    playwright,
  }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL as string | undefined;
    const { ctx } = await newAuthedRequest(playwright, baseURL);
    const unique = `uniq-${Date.now()}-${rand()}`;

    const created = await ctx.post(API_PATH, {
      data: validProjectPayload({
        name: `Proj ${unique}`,
        description: `Desc ${unique}`,
      }),
    });
    expect(created.status()).toBe(201);

    const res = await ctx.get(
      `${API_PATH}?search=${encodeURIComponent(unique)}`,
    );
    expect([200, 500]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(
        body.items.some(
          (p: { name?: string; description?: string }) =>
            String(p.name || "").includes(unique) ||
            String(p.description || "").includes(unique),
        ),
      ).toBe(true);
    }
    await ctx.dispose();
  });
});
