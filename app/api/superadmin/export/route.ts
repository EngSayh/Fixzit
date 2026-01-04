/**
 * @fileoverview Superadmin Export API
 * @description Bulk data export for superadmin portal
 * @route GET /api/superadmin/export
 * @route POST /api/superadmin/export
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/export
 */

/* eslint-disable local/require-tenant-scope -- Superadmin route: intentionally queries across all tenants */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { connectDb } from "@/lib/mongodb-unified";
import { parseBodySafe } from "@/lib/api/parse-body";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import mongoose from "mongoose";
import { z } from "zod";

// Prevent prerendering/export of this API route
export const dynamic = "force-dynamic";

// Response headers
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

const ExportSchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
  collections: z.array(z.string()).optional(),
});

// Platform-level collections (no tenant scoping)
const PLATFORM_COLLECTIONS = [
  "organizations",
  "subscriptions",
  "subscriptiontiers",
  "featureflags",
  "auditlogs",
  "systemmessages",
];

const MAX_DOCS_PER_COLLECTION = 5000;

/**
 * GET /api/superadmin/export
 * Get available collections for export
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-export:get",
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

    // Check for format query param (for direct download)
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format");

    if (format) {
      // Redirect to POST for actual export
      return NextResponse.json(
        {
          message: "Use POST to export data",
          availableFormats: ["json", "csv"],
          availableCollections: PLATFORM_COLLECTIONS,
        },
        { headers: ROBOTS_HEADER }
      );
    }

    return NextResponse.json(
      {
        availableFormats: ["json", "csv"],
        availableCollections: PLATFORM_COLLECTIONS,
        maxDocsPerCollection: MAX_DOCS_PER_COLLECTION,
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Export] Failed to get export options", { error });
    return NextResponse.json(
      { error: "Failed to get export options" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * POST /api/superadmin/export
 * Export data from selected collections
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-export:post",
    requests: 5,
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

    const { data: body, error: parseError } = await parseBodySafe<z.infer<typeof ExportSchema>>(
      request,
      { logPrefix: "[superadmin:export]" }
    );

    if (parseError) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const parsed = ExportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid export parameters", details: parsed.error.flatten() },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const { format, collections } = parsed.data;
    const collectionsToExport = collections?.length
      ? collections.filter((c) => PLATFORM_COLLECTIONS.includes(c))
      : PLATFORM_COLLECTIONS;

    if (collectionsToExport.length === 0) {
      return NextResponse.json(
        { error: "No valid collections specified" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    const exportData: Record<string, unknown[]> = {};

    for (const collectionName of collectionsToExport) {
      try {
        const collection = mongoose.connection.collection(collectionName);
        // Superadmin export reads entire collections for platform backup - intentionally unscoped
        const docs = await collection
          .find({})
          .limit(MAX_DOCS_PER_COLLECTION)
          .toArray();
        exportData[collectionName] = docs;
      } catch (err) {
        logger.warn("[Superadmin:Export] Failed to export collection", {
          collection: collectionName,
          error: err,
        });
        exportData[collectionName] = [];
      }
    }

    logger.info("[Superadmin:Export] Export completed", {
      collections: collectionsToExport,
      format,
      by: session.username,
    });

    if (format === "csv") {
      // Generate CSV format - each collection as a separate section
      const csvParts: string[] = [];
      
      for (const [collectionName, docs] of Object.entries(exportData)) {
        if (!Array.isArray(docs) || docs.length === 0) continue;
        
        // Get all unique keys from documents
        const allKeys = new Set<string>();
        for (const doc of docs) {
          if (doc && typeof doc === "object") {
            Object.keys(doc).forEach((key) => allKeys.add(key));
          }
        }
        const headers = Array.from(allKeys);
        
        // CSV header row
        const headerRow = headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(",");
        
        // CSV data rows
        const dataRows = docs.map((doc) => {
          return headers.map((header) => {
            const value = (doc as Record<string, unknown>)[header];
            if (value === undefined || value === null) return "";
            if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(",");
        });
        
        csvParts.push(`# Collection: ${collectionName}`);
        csvParts.push(headerRow);
        csvParts.push(...dataRows);
        csvParts.push(""); // Empty line between collections
      }
      
      const csvContent = csvParts.join("\n");
      
      return new Response(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="fixzit-export-${new Date().toISOString().split("T")[0]}.csv"`,
          ...ROBOTS_HEADER,
        },
      });
    }

    return NextResponse.json(
      {
        exportedAt: new Date().toISOString(),
        format,
        collections: collectionsToExport,
        data: exportData,
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Export] Export failed", { error });
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
