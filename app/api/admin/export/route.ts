import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb-unified";
import mongoose from "mongoose";

const ExportSchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
  collections: z.array(z.string()).optional(),
});

/**
 * GET /api/admin/export
 * Export database collections to JSON or CSV format
 * SUPER_ADMIN only - scoped to organization
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const orgId = session.user.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "json";
    const collectionsParam = searchParams.get("collections");

    const parseResult = ExportSchema.safeParse({
      format,
      collections: collectionsParam ? collectionsParam.split(",") : undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Define exportable collections
    const allCollections = [
      "work_orders",
      "properties",
      "vendors",
      "units",
      "invoices",
      "users",
      "tenancies",
      "maintenancelogs",
      "revenuelogs",
    ];

    const requestedCollections = parseResult.data.collections || allCollections;

    // Validate requested collections
    const validCollections = requestedCollections.filter((c) => allCollections.includes(c.toLowerCase()));

    if (validCollections.length === 0) {
      return NextResponse.json({ error: "No valid collections specified" }, { status: 400 });
    }

    const exportData: Record<string, unknown[]> = {};
    const orgObjectId = new mongoose.Types.ObjectId(orgId);

    for (const collectionName of validCollections) {
      const collection = mongoose.connection.collection(collectionName);

      // Query with org_id filter for multi-tenant isolation
      const documents = await collection.find({ org_id: orgObjectId }).toArray();

      exportData[collectionName] = documents;
    }

    if (parseResult.data.format === "csv") {
      // Convert to CSV format
      const csvData = convertToCSV(exportData);

      return new NextResponse(csvData, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="export_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // Return JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="export_${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    logger.error("Error exporting data", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: `Export failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

/**
 * Convert export data to CSV format
 * Each collection becomes a section in the CSV
 */
function convertToCSV(data: Record<string, unknown[]>): string {
  const lines: string[] = [];

  for (const [collectionName, documents] of Object.entries(data)) {
    if (documents.length === 0) continue;

    // Add collection header
    lines.push(`\n# ${collectionName.toUpperCase()}`);
    lines.push(`# Count: ${documents.length}`);

    // Get all unique headers from documents
    const headers = new Set<string>();
    documents.forEach((doc) => {
      if (doc && typeof doc === "object") {
        Object.keys(doc as Record<string, unknown>).forEach((key) => headers.add(key));
      }
    });

    const headerArray = Array.from(headers);

    // Add CSV header row
    lines.push(headerArray.map((h) => `"${h}"`).join(","));

    // Add data rows
    documents.forEach((doc) => {
      const row = headerArray.map((header) => {
        const value = (doc as Record<string, unknown>)[header];
        if (value === null || value === undefined) return "";
        if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      lines.push(row.join(","));
    });

    lines.push(""); // Empty line between collections
  }

  return lines.join("\n");
}

/**
 * POST /api/admin/export
 * Trigger an async export job for large datasets
 * SUPER_ADMIN only
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = ExportSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.issues.map((i) => i.message).join(", ") },
        { status: 400 }
      );
    }

    // For now, redirect to GET endpoint
    // In production, this would queue a background job for large exports
    const url = new URL(request.url);
    url.searchParams.set("format", parseResult.data.format);
    if (parseResult.data.collections) {
      url.searchParams.set("collections", parseResult.data.collections.join(","));
    }

    return NextResponse.json({
      message: "Export job queued. Use GET endpoint for immediate download.",
      downloadUrl: `${url.pathname}?${url.searchParams.toString()}`,
    });
  } catch (error) {
    logger.error("Error queuing export", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: `Export failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
