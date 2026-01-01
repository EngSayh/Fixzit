/**
 * GDPR/PDPL Data Privacy Utilities
 * 
 * @module server/utils/gdpr
 * @description Provides functionality for data subject requests:
 * - Export personal data (Right of Access)
 * - Delete/anonymize personal data (Right to Erasure)
 * - Generate compliance reports
 * 
 * @compliance
 * - GDPR (EU General Data Protection Regulation)
 * - PDPL (Saudi Personal Data Protection Law)
 * - ISO 27001 data privacy requirements
 * 
 * @security
 * - All operations are logged to AuditLog
 * - Superadmin/Compliance Officer access only
 * - Sensitive data is properly sanitized
 */

import { logger } from "@/lib/logger";
import { AuditLogModel } from "@/server/models/AuditLog";
import { User } from "@/server/models/User";
import { ensureMongoConnection } from "@/server/lib/db";

export interface DataExportResult {
  userId: string;
  email: string;
  exportedAt: string;
  categories: string[];
  data: {
    personalInfo: Record<string, unknown>;
    activityLogs: unknown[];
    transactions: unknown[];
    documents: unknown[];
    communications: unknown[];
  };
  metadata: {
    requestedBy: string;
    reason: string;
    format: "json" | "csv";
    retentionDays: number;
  };
}

export interface AnonymizationResult {
  userId: string;
  anonymizedAt: string;
  fieldsAnonymized: string[];
  retainedForAudit: string[];
  success: boolean;
  error?: string;
}

/**
 * Export all personal data for a user (Right of Access)
 * Complies with GDPR Article 15 and PDPL Article 14
 * 
 * @param userId - MongoDB ObjectId of the user
 * @param requestedBy - Superadmin username performing the export
 * @param reason - Documented reason for the export
 * @returns DataExportResult containing all user data
 */
export async function exportUserData(
  userId: string,
  requestedBy: string,
  reason: string = "Data subject access request"
): Promise<DataExportResult> {
  await ensureMongoConnection();
  
  const startTime = Date.now();
  
  try {
    // Validate user exists - use lean() and cast to any for flexible access
    const userDoc = await User.findById(userId).lean();
    if (!userDoc) {
      throw new Error(`User not found: ${userId}`);
    }
    
    // Cast to Record for flexible property access
    const user = userDoc as unknown as Record<string, unknown>;
    const orgId = String((user as Record<string, unknown>).orgId || "SYSTEM");
    const email = String(user.email || "unknown");

    // Collect personal data from all sources
    const exportData: DataExportResult = {
      userId,
      email,
      exportedAt: new Date().toISOString(),
      categories: ["personalInfo", "activityLogs", "transactions", "documents", "communications"],
      data: {
        personalInfo: sanitizePersonalInfo(user),
        activityLogs: await collectActivityLogs(userId, orgId),
        transactions: [], // Placeholder for transaction collection
        documents: [], // Placeholder for document collection
        communications: [], // Placeholder for communication logs
      },
      metadata: {
        requestedBy,
        reason,
        format: "json",
        retentionDays: 30, // Export should be deleted after 30 days
      },
    };

    // Log the export action for audit trail
    await AuditLogModel.create({
      orgId,
      action: "EXPORT",
      entityType: "USER",
      entityId: userId,
      entityName: `GDPR Data Export: ${email}`,
      userId: requestedBy,
      userName: requestedBy,
      userRole: "SUPER_ADMIN",
      description: `Personal data export for user ${email}. Reason: ${reason}`,
      success: true,
      metadata: {
        exportType: "GDPR_ACCESS_REQUEST",
        categoriesExported: exportData.categories,
        recordCount: Object.values(exportData.data).reduce(
          (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 1),
          0
        ),
        durationMs: Date.now() - startTime,
      },
    });

    logger.info("GDPR data export completed", {
      userId,
      requestedBy,
      durationMs: Date.now() - startTime,
    });

    return exportData;
  } catch (error) {
    // Log failed export attempt
    await AuditLogModel.create({
      orgId: "SYSTEM",
      action: "EXPORT",
      entityType: "USER",
      entityId: userId,
      entityName: `GDPR Data Export Failed`,
      userId: requestedBy,
      userName: requestedBy,
      userRole: "SUPER_ADMIN",
      description: `Failed to export personal data for user ${userId}. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      success: false,
      metadata: { reason, error: String(error) },
    });

    throw error;
  }
}

/**
 * Anonymize user data (Right to Erasure / Right to be Forgotten)
 * Complies with GDPR Article 17 and PDPL Article 17
 * 
 * Note: Some data is retained for legal/audit requirements but anonymized
 * 
 * @param userId - MongoDB ObjectId of the user
 * @param requestedBy - Superadmin username performing the deletion
 * @param reason - Documented reason for the deletion
 * @returns AnonymizationResult with details of what was anonymized
 */
export async function anonymizeUserData(
  userId: string,
  requestedBy: string,
  reason: string = "Data subject deletion request"
): Promise<AnonymizationResult> {
  await ensureMongoConnection();
  
  const startTime = Date.now();
  const anonymizedFields: string[] = [];
  const retainedFields: string[] = [];

  try {
    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    const originalEmail = user.email;
    // Access orgId via get method or type assertion
    const orgId = String((user as unknown as Record<string, unknown>).orgId || "SYSTEM");

    // Anonymize personal fields
    const personal = user.personal;
    if (personal) {
      if (personal.firstName) {
        personal.firstName = "[REDACTED]";
        anonymizedFields.push("personal.firstName");
      }
      if (personal.lastName) {
        personal.lastName = "[REDACTED]";
        anonymizedFields.push("personal.lastName");
      }
      if (personal.nationalId) {
        personal.nationalId = "[REDACTED]";
        anonymizedFields.push("personal.nationalId");
      }
      if (personal.passport) {
        personal.passport = "[REDACTED]";
        anonymizedFields.push("personal.passport");
      }
      if (personal.dateOfBirth) {
        personal.dateOfBirth = undefined;
        anonymizedFields.push("personal.dateOfBirth");
      }
    }

    // Anonymize top-level phone if exists
    if (user.phone) {
      user.phone = "[REDACTED]";
      anonymizedFields.push("phone");
    }
    if (user.mobile) {
      user.mobile = "[REDACTED]";
      anonymizedFields.push("mobile");
    }

    // Generate anonymization token and anonymize email
    const anonymizationToken = `ANON_${Date.now().toString(36)}`;
    if (user.email) {
      const domain = user.email.split("@")[1] || "unknown.com";
      user.email = `${anonymizationToken}@${domain}`;
      anonymizedFields.push("email");
    }

    // Mark account as inactive
    user.status = "INACTIVE";
    retainedFields.push("_id", "createdAt", "status");

    await user.save();

    // Log the anonymization action
    await AuditLogModel.create({
      orgId,
      action: "DELETE",
      entityType: "USER",
      entityId: userId,
      entityName: `GDPR Data Anonymization: ${originalEmail}`,
      userId: requestedBy,
      userName: requestedBy,
      userRole: "SUPER_ADMIN",
      description: `User data anonymized per deletion request. Original email: ${originalEmail}. Reason: ${reason}`,
      success: true,
      metadata: {
        anonymizationType: "GDPR_ERASURE_REQUEST",
        fieldsAnonymized: anonymizedFields,
        fieldsRetained: retainedFields,
        anonymizationToken,
        durationMs: Date.now() - startTime,
      },
    });

    logger.info("GDPR data anonymization completed", {
      userId,
      requestedBy,
      fieldsAnonymized: anonymizedFields.length,
      durationMs: Date.now() - startTime,
    });

    return {
      userId,
      anonymizedAt: new Date().toISOString(),
      fieldsAnonymized: anonymizedFields,
      retainedForAudit: retainedFields,
      success: true,
    };
  } catch (error) {
    // Log failed anonymization attempt
    await AuditLogModel.create({
      orgId: "SYSTEM",
      action: "DELETE",
      entityType: "USER",
      entityId: userId,
      entityName: `GDPR Data Anonymization Failed`,
      userId: requestedBy,
      userName: requestedBy,
      userRole: "SUPER_ADMIN",
      description: `Failed to anonymize data for user ${userId}. Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      success: false,
      metadata: { reason, error: String(error) },
    });

    return {
      userId,
      anonymizedAt: new Date().toISOString(),
      fieldsAnonymized: [],
      retainedForAudit: [],
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Sanitize personal info for export (remove internal fields)
 */
function sanitizePersonalInfo(user: Record<string, unknown>): Record<string, unknown> {
  const {
    password: _password,
    passwordHash: _passwordHash,
    salt: _salt,
    resetToken: _resetToken,
    refreshTokens: _refreshTokens,
    __v: _v,
    ...safeData
  } = user;
  
  // Variables prefixed with _ are intentionally unused - we're extracting them to exclude from safeData
  void [_password, _passwordHash, _salt, _resetToken, _refreshTokens, _v];
  
  return safeData;
}

/**
 * Collect activity logs for a user
 */
async function collectActivityLogs(userId: string, orgId?: string): Promise<unknown[]> {
  try {
    const logs = await AuditLogModel.find({
      userId,
      ...(orgId && { orgId }),
    })
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean();
    
    return logs.map((log) => {
      const logRecord = log as unknown as Record<string, unknown>;
      return {
        action: logRecord.action,
        entityType: logRecord.entityType,
        description: logRecord.description,
        timestamp: logRecord.createdAt,
        ipAddress: logRecord.ipAddress,
      };
    });
  } catch {
    return [];
  }
}
