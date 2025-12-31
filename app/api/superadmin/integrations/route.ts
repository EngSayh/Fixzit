/**
 * @fileoverview Superadmin Integrations API
 * @description GET/POST third-party integrations with auto-seeding
 * @route GET/POST /api/superadmin/integrations
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/integrations
 * @agent [AGENT-001-A]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { Integration } from "@/server/models/Integration";
import { z } from "zod";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

const INTEGRATION_TYPES = [
  "payment",
  "sms",
  "email",
  "storage",
  "analytics",
  "erp",
  "zatca",
  "maps",
  "auth",
  "notification",
  "custom",
] as const;

const ENVIRONMENTS = ["production", "sandbox", "development"] as const;

const CreateIntegrationSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(INTEGRATION_TYPES),
  provider: z.string().min(1).max(100),
  enabled: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  credentials: z.record(z.string(), z.string()).optional(),
  webhookUrl: z.string().url().max(500).optional(),
  environment: z.enum(ENVIRONMENTS).optional(),
  version: z.string().max(50).optional(),
  features: z.array(z.string().max(100)).max(20).optional(),
});

// Default integrations to seed
const DEFAULT_INTEGRATIONS = [
  {
    name: "ZATCA E-Invoicing",
    description: "Saudi Arabia ZATCA e-invoicing compliance integration",
    type: "zatca" as const,
    provider: "zatca-fatoora",
    enabled: false,
    status: "pending_setup" as const,
    environment: "sandbox" as const,
    isSystem: true,
    features: ["e-invoice", "compliance", "clearance", "reporting"],
    config: {
      apiVersion: "v2",
      complianceMode: "phase2",
    },
  },
  {
    name: "Stripe Payments",
    description: "Stripe payment gateway for subscriptions and invoices",
    type: "payment" as const,
    provider: "stripe",
    enabled: false,
    status: "pending_setup" as const,
    environment: "sandbox" as const,
    isSystem: true,
    features: ["payments", "subscriptions", "invoices", "webhooks"],
    config: {
      apiVersion: "2024-04-10",
    },
  },
  {
    name: "Twilio SMS",
    description: "Twilio SMS messaging for notifications and OTP",
    type: "sms" as const,
    provider: "twilio",
    enabled: false,
    status: "pending_setup" as const,
    environment: "sandbox" as const,
    isSystem: true,
    features: ["sms", "otp", "notifications"],
  },
  {
    name: "SendGrid Email",
    description: "SendGrid transactional email service",
    type: "email" as const,
    provider: "sendgrid",
    enabled: false,
    status: "pending_setup" as const,
    environment: "sandbox" as const,
    isSystem: true,
    features: ["transactional", "templates", "tracking"],
  },
  {
    name: "AWS S3 Storage",
    description: "Amazon S3 for file storage and media",
    type: "storage" as const,
    provider: "aws-s3",
    enabled: false,
    status: "pending_setup" as const,
    environment: "sandbox" as const,
    isSystem: true,
    features: ["upload", "download", "presigned-urls", "cdn"],
    config: {
      region: "me-south-1",
    },
  },
  {
    name: "Google Analytics",
    description: "Google Analytics 4 for usage tracking",
    type: "analytics" as const,
    provider: "google-analytics",
    enabled: false,
    status: "pending_setup" as const,
    environment: "production" as const,
    isSystem: true,
    features: ["pageviews", "events", "conversions"],
  },
  {
    name: "Google Maps",
    description: "Google Maps for location services",
    type: "maps" as const,
    provider: "google-maps",
    enabled: false,
    status: "pending_setup" as const,
    environment: "production" as const,
    isSystem: true,
    features: ["geocoding", "places", "directions", "maps-embed"],
  },
];

async function seedDefaultIntegrations(): Promise<void> {
  try {
    const existingCount = await Integration.countDocuments({ isSystem: true });
    if (existingCount > 0) return;

    await Integration.insertMany(DEFAULT_INTEGRATIONS, { ordered: false });
    logger.info("[Superadmin:Integrations] Seeded default integrations", {
      count: DEFAULT_INTEGRATIONS.length,
    });
  } catch (error) {
    // Ignore duplicate key errors
    if (error instanceof Error && !error.message.includes("duplicate key")) {
      logger.warn("[Superadmin:Integrations] Error seeding integrations", {
        error: error.message,
      });
    }
  }
}

/**
 * GET /api/superadmin/integrations
 * List all integrations
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-integrations:get",
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
    await seedDefaultIntegrations();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const enabled = searchParams.get("enabled");
    const environment = searchParams.get("environment");

    const query: Record<string, unknown> = {};
    if (type && INTEGRATION_TYPES.includes(type as typeof INTEGRATION_TYPES[number])) {
      query.type = type;
    }
    if (enabled !== null && enabled !== undefined) {
      query.enabled = enabled === "true";
    }
    if (environment && ENVIRONMENTS.includes(environment as typeof ENVIRONMENTS[number])) {
      query.environment = environment;
    }

    const integrations = await Integration.find(query)
      .select("-credentials -webhookSecret") // Never expose credentials in list
      .sort({ type: 1, name: 1 })
      .lean();

    return NextResponse.json(
      { integrations, total: integrations.length },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Integrations] Error fetching integrations", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * POST /api/superadmin/integrations
 * Create a new integration
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-integrations:post",
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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }
    const validation = CreateIntegrationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Check for duplicate type+provider
    const existing = await Integration.findOne({
      type: validation.data.type,
      provider: validation.data.provider,
    });
    if (existing) {
      return NextResponse.json(
        { error: `Integration for ${validation.data.type}/${validation.data.provider} already exists` },
        { status: 409, headers: ROBOTS_HEADER }
      );
    }

    const integration = await Integration.create({
      ...validation.data,
      isSystem: false,
      status: "pending_setup",
      healthCheck: {
        enabled: true,
        interval: 60,
      },
    });

    logger.info("[Superadmin:Integrations] Integration created", {
      integrationId: integration._id.toString(),
      type: integration.type,
      provider: integration.provider,
      by: session.username,
    });

    // Return without credentials - use spread to avoid type issues
    const { credentials: _creds, webhookSecret: _secret, ...safeIntegration } = integration.toObject();

    return NextResponse.json(
      { integration: safeIntegration, message: "Integration created successfully" },
      { status: 201, headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Integrations] Error creating integration", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
