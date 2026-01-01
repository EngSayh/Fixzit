/**
 * GDPR Data Privacy API
 * 
 * @route POST /api/superadmin/gdpr/export - Export user data
 * @route POST /api/superadmin/gdpr/anonymize - Anonymize user data
 * @access Superadmin only
 * @module api/superadmin/gdpr
 * 
 * @compliance
 * - GDPR (EU General Data Protection Regulation)
 * - PDPL (Saudi Personal Data Protection Law)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { exportUserData, anonymizeUserData } from "@/server/utils/gdpr";
import { logger } from "@/lib/logger";
import { z } from "zod";

const ExportSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  reason: z.string().optional().default("Data subject access request"),
});

const AnonymizeSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  reason: z.string().optional().default("Data subject deletion request"),
  confirmEmail: z.string().min(1, "Confirmation email is required"),
});

/**
 * POST /api/superadmin/gdpr
 * Handle GDPR data requests (export or anonymize)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify superadmin session
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const action = body.action as string;

    if (action === "export") {
      // Handle data export request
      const validation = ExportSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.issues[0]?.message || "Invalid request" },
          { status: 400 }
        );
      }

      const { userId, reason } = validation.data;
      
      logger.info("GDPR export request initiated", {
        userId,
        requestedBy: session.username,
      });

      const result = await exportUserData(userId, session.username, reason);

      return NextResponse.json({
        success: true,
        message: "Data export completed successfully",
        data: result,
      });

    } else if (action === "anonymize") {
      // Handle data anonymization (deletion) request
      const validation = AnonymizeSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.issues[0]?.message || "Invalid request" },
          { status: 400 }
        );
      }

      const { userId, reason } = validation.data;

      logger.info("GDPR anonymization request initiated", {
        userId,
        requestedBy: session.username,
      });

      const result = await anonymizeUserData(userId, session.username, reason);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Anonymization failed" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "User data anonymized successfully",
        data: result,
      });

    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'export' or 'anonymize'" },
        { status: 400 }
      );
    }

  } catch (error) {
    logger.error("GDPR API error", { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/superadmin/gdpr
 * Get GDPR compliance status and information
 */
export async function GET(request: NextRequest) {
  try {
    // Verify superadmin session
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      compliance: {
        gdprEnabled: true,
        pdplEnabled: true,
        dataRetentionDays: 2555, // 7 years for financial data
        exportRetentionDays: 30,
        anonymizationSupported: true,
      },
      capabilities: {
        export: {
          description: "Export all personal data for a user (Right of Access)",
          endpoint: "POST /api/superadmin/gdpr",
          bodyExample: { action: "export", userId: "<user_id>", reason: "Data subject request" },
        },
        anonymize: {
          description: "Anonymize user data (Right to Erasure)",
          endpoint: "POST /api/superadmin/gdpr",
          bodyExample: { action: "anonymize", userId: "<user_id>", reason: "Deletion request", confirmEmail: "<user_email>" },
        },
      },
      lastUpdated: "2025-12-31",
    });

  } catch (error) {
    logger.error("GDPR info API error", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
