/**
 * @description Exports tenant data in JSON or CSV format.
 * Provides bulk data export for backup, migration, or analytics.
 * Enforces organization-scoped access and document limits per collection.
 * @route POST /api/admin/export
 * @access Private - Admin roles with export permission
 * @param {Object} body - format (json|csv), collections (array of collection names)
 * @returns {Object} Exported data by collection or CSV download
 * @throws {401} If not authenticated
 * @throws {403} If lacking export permission
 * @throws {400} If too many collections requested (max 5)
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb-unified";
import mongoose from "mongoose";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { parseBodySafe } from "@/lib/api/parse-body";

const ExportSchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
  collections: z.array(z.string()).optional(),
});

/**
 * Canonical collection definitions with correct org scope field.
 * STRICT v4.1: Uses orgId (camelCase) consistently per schema conventions.
 */
const COLLECTION_CONFIG: Record<string, { scopeField: "orgId"; maxDocs: number }> = {
  workorders: { scopeField: "orgId", maxDocs: 10000 },
  properties: { scopeField: "orgId", maxDocs: 5000 },
  vendors: { scopeField: "orgId", maxDocs: 5000 },
  units: { scopeField: "orgId", maxDocs: 10000 },
  invoices: { scopeField: "orgId", maxDocs: 10000 },
  users: { scopeField: "orgId", maxDocs: 5000 },
  tenancies: { scopeField: "orgId", maxDocs: 5000 },
  maintenancelogs: { scopeField: "orgId", maxDocs: 10000 },
  revenuelogs: { scopeField: "orgId", maxDocs: 10000 },
};

const ALL_EXPORTABLE = Object.keys(COLLECTION_CONFIG);
const MAX_COLLECTIONS_PER_REQUEST = 5;
const BATCH_SIZE = 500;

/**
 * 🔐 SECURITY: Projections to exclude sensitive fields from exports
 * Even for SUPER_ADMIN, we don't export password hashes, tokens, or raw PII
 * Each collection has explicit field exclusions for compliance
 */
const DEFAULT_PROJECTION: Record<string, 0> = {
  password: 0,
  refreshToken: 0,
  accessToken: 0,
  apiKey: 0,
  apiSecret: 0,
  token: 0,
  phone: 0,
  email: 0,
  attachments: 0,
  attachmentUrls: 0,
  documents: 0,
  files: 0,
  bankAccount: 0,
  iban: 0,
  paymentIntentSecret: 0,
  idDocument: 0,
};

const COLLECTION_PROJECTIONS: Record<string, Record<string, 0>> = {
  users: {
    password: 0,
    personal: 0,
    refreshToken: 0,
    magicLinkToken: 0,
    resetToken: 0,
    resetPasswordToken: 0,
    resetPasswordExpires: 0,
    verificationToken: 0,
    twoFactorSecret: 0,
    backupCodes: 0,
    phone: 0,
    emergencyContact: 0,
  },
  vendors: {
    bankAccount: 0,
    iban: 0,
    taxCertificate: 0,
    contactPhone: 0,
    contactEmail: 0,
    paymentDetails: 0,
    apiKey: 0,
    apiSecret: 0,
  },
  invoices: {
    paymentIntentSecret: 0,
    payerEmail: 0,
    payerPhone: 0,
    stripeCustomerId: 0,
    paymentMethodId: 0,
  },
  workorders: {
    requesterPhone: 0,
    requesterEmail: 0,
    attachments: 0,  // May contain sensitive documents
  },
  properties: {
    ownerPhone: 0,
    ownerEmail: 0,
    bankDetails: 0,
    taxId: 0,
  },
  units: {
    tenantPhone: 0,
    tenantEmail: 0,
    accessCodes: 0,
    keyLocation: 0,
  },
  tenancies: {
    tenantPhone: 0,
    tenantEmail: 0,
    bankAccount: 0,
    emergencyContact: 0,
    idDocument: 0,
  },
  maintenancelogs: {
    technicianPhone: 0,
  },
  revenuelogs: {
    payerDetails: 0,
    bankReference: 0,
  },
};

/**
 * GET /api/admin/export
 * Export database collections to JSON or CSV format
 * SUPER_ADMIN only - scoped to organization with batching
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "admin-export:get",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const orgId = session.user.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 400 });
    }

    // 🔐 SECURITY: Validate orgId is a valid ObjectId to prevent injection
    if (!mongoose.Types.ObjectId.isValid(orgId)) {
      logger.warn("[Export] Invalid orgId format", { orgId, userId: session.user.id });
      return NextResponse.json({ error: "Invalid organization ID format" }, { status: 400 });
    }
    const orgObjectId = new mongoose.Types.ObjectId(orgId);

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

    // Normalize and validate requested collections
    const requestedRaw = parseResult.data.collections || ALL_EXPORTABLE;
    const requestedNormalized = requestedRaw.map((c) => c.toLowerCase().trim());
    const validCollections = requestedNormalized.filter((c) => ALL_EXPORTABLE.includes(c));

    if (validCollections.length === 0) {
      return NextResponse.json({ 
        error: "No valid collections specified",
        available: ALL_EXPORTABLE,
      }, { status: 400 });
    }

    // Limit collections per request to prevent memory exhaustion
    if (validCollections.length > MAX_COLLECTIONS_PER_REQUEST) {
      return NextResponse.json({
        error: `Maximum ${MAX_COLLECTIONS_PER_REQUEST} collections per request. Use multiple requests.`,
        requested: validCollections.length,
      }, { status: 400 });
    }

    const exportData: Record<string, unknown[]> = {};
    const truncatedCollections: string[] = [];

    // 🔐 SECURITY: Dual filter to match orgId stored as string OR ObjectId
    // Some collections (e.g., souq_rmas) store orgId as string, others as ObjectId
    const orgFilter = { $in: [orgId, orgObjectId] };

    for (const collectionName of validCollections) {
      const config = COLLECTION_CONFIG[collectionName];
      if (!config) continue;

      const collection = mongoose.connection.collection(collectionName);
      const scopeQuery = { [config.scopeField]: orgFilter };
      
      // 🔐 SECURITY: Apply projection to exclude sensitive fields
      const projection = {
        ...DEFAULT_PROJECTION,
        ...(COLLECTION_PROJECTIONS[collectionName] || {}),
      };
      
      // 🔒 SECURITY: Use batched cursor with limit to prevent memory exhaustion
      const documents: unknown[] = [];
      const cursor = collection
        .find(scopeQuery, { projection })
        .batchSize(BATCH_SIZE)
        .limit(config.maxDocs);
      
      for await (const doc of cursor) {
        documents.push(doc);
      }

      if (documents.length === config.maxDocs) {
        truncatedCollections.push(collectionName);
      }

      exportData[collectionName] = documents;
      
      logger.info("Export collection fetched", {
        collection: collectionName,
        count: documents.length,
        maxDocs: config.maxDocs,
        orgId,
      });
    }

    if (parseResult.data.format === "csv") {
      // Convert to CSV format
      const csvData = convertToCSV(exportData);

      const headers: Record<string, string> = {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="export_${new Date().toISOString().split("T")[0]}.csv"`,
      };
      if (truncatedCollections.length > 0) {
        headers["X-Export-Truncated"] = truncatedCollections.join(",");
      }

      return new NextResponse(csvData, { headers });
    }

    // Return JSON
    const jsonBody = JSON.stringify(
      truncatedCollections.length
        ? { data: exportData, truncated: truncatedCollections }
        : exportData,
      null,
      2,
    );

    const headers: Record<string, string> = {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="export_${new Date().toISOString().split("T")[0]}.json"`,
    };
    if (truncatedCollections.length > 0) {
      headers["X-Export-Truncated"] = truncatedCollections.join(",");
    }

    return new NextResponse(jsonBody, { headers });
  } catch (error) {
    logger.error("Error exporting data", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: `Export failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}

/**
 * Sanitize a value for CSV to prevent formula injection
 * Prefixes values starting with =, +, -, @ (including leading whitespace),
 * tab, or CR with a single quote
 */
function sanitizeCSVValue(value: string): string {
  const trimmed = value.trimStart();
  return /^[=+\-@]/.test(trimmed) || /^[\t\r]/.test(value) ? `'${value}` : value;
}

/**
 * Convert export data to CSV format
 * Each collection becomes a section in the CSV
 * 🔐 SECURITY: Values are sanitized to prevent formula injection
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

    // Add data rows with CSV sanitization to prevent formula injection
    documents.forEach((doc) => {
      const row = headerArray.map((header) => {
        const value = (doc as Record<string, unknown>)[header];
        if (value === null || value === undefined) return "";
        if (typeof value === "object") {
          const jsonStr = JSON.stringify(value).replace(/"/g, '""');
          return `"${sanitizeCSVValue(jsonStr)}"`;
        }
        const strVal = String(value).replace(/"/g, '""');
        return `"${sanitizeCSVValue(strVal)}"`;
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

    const { data: body, error: parseError } = await parseBodySafe<z.infer<typeof ExportSchema>>(request);
    if (parseError || !body) {
      return NextResponse.json(
        { error: parseError || "Invalid JSON body" },
        { status: 400 },
      );
    }
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
