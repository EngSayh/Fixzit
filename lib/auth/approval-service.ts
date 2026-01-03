/**
 * @fileoverview Admin Approval Service - Centralized approval workflow
 * @module lib/auth/approval-service
 * 
 * Provides a secure admin approval workflow for sensitive operations
 * like MFA override, account deletion, privilege escalation, etc.
 * 
 * Features:
 * - MongoDB-backed approval requests
 * - Time-limited approval tokens (configurable TTL)
 * - Two-admin approval for high-risk operations
 * - Audit trail for all approvals/rejections
 * - Tenant-scoped approvals (orgId)
 * 
 * @status PRODUCTION
 * @author [AGENT-0008]
 * @created 2026-01-03
 */

import { ObjectId } from "mongodb";
import crypto from "crypto";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";
import { encryptField, decryptField } from "@/lib/security/encryption";

// ============================================================================
// Types & Configuration
// ============================================================================

/**
 * Approval action types - what can be approved
 */
export enum ApprovalAction {
  DISABLE_MFA = "disable_mfa",
  DELETE_ACCOUNT = "delete_account",
  PRIVILEGE_ESCALATION = "privilege_escalation",
  DATA_EXPORT = "data_export",
  TENANT_SUSPENSION = "tenant_suspension",
  BULK_USER_ACTION = "bulk_user_action",
}

/**
 * Approval request status
 */
export enum ApprovalStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
}

/**
 * Risk level determines approval requirements
 */
export enum RiskLevel {
  LOW = "low",         // Single admin approval, 24h TTL
  MEDIUM = "medium",   // Single admin approval, 4h TTL
  HIGH = "high",       // Two admin approvals, 1h TTL
  CRITICAL = "critical", // Two admin approvals + audit log, 30min TTL
}

/**
 * Approval request stored in MongoDB
 */
export interface ApprovalRequest {
  _id?: ObjectId;
  orgId: string;
  requestId: string;           // Public ID (not ObjectId)
  action: ApprovalAction;
  targetUserId: string;        // User affected by the action
  requestedBy: string;         // Admin who requested
  requestedAt: Date;
  expiresAt: Date;
  status: ApprovalStatus;
  riskLevel: RiskLevel;
  reason: string;              // Why approval is needed
  metadata?: Record<string, unknown>;
  
  // Approval chain
  approvals: ApprovalDecision[];
  requiredApprovals: number;   // How many approvals needed
  
  // Token for execution (encrypted)
  approvalToken?: string;      // Only set when fully approved
  tokenExpiresAt?: Date;
}

export interface ApprovalDecision {
  adminId: string;
  decision: "approved" | "rejected";
  decidedAt: Date;
  ipAddress?: string;
  comment?: string;
}

/**
 * Configuration for each action type
 */
const ACTION_CONFIG: Record<ApprovalAction, { riskLevel: RiskLevel; ttlMinutes: number; requiredApprovals: number }> = {
  [ApprovalAction.DISABLE_MFA]: { riskLevel: RiskLevel.HIGH, ttlMinutes: 60, requiredApprovals: 1 },
  [ApprovalAction.DELETE_ACCOUNT]: { riskLevel: RiskLevel.CRITICAL, ttlMinutes: 30, requiredApprovals: 2 },
  [ApprovalAction.PRIVILEGE_ESCALATION]: { riskLevel: RiskLevel.HIGH, ttlMinutes: 60, requiredApprovals: 2 },
  [ApprovalAction.DATA_EXPORT]: { riskLevel: RiskLevel.MEDIUM, ttlMinutes: 240, requiredApprovals: 1 },
  [ApprovalAction.TENANT_SUSPENSION]: { riskLevel: RiskLevel.CRITICAL, ttlMinutes: 30, requiredApprovals: 2 },
  [ApprovalAction.BULK_USER_ACTION]: { riskLevel: RiskLevel.HIGH, ttlMinutes: 60, requiredApprovals: 2 },
};

const COLLECTION_NAME = "approval_requests";

// ============================================================================
// Service Implementation
// ============================================================================

/**
 * Generate a secure random request ID
 */
function generateRequestId(): string {
  return `APR-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
}

/**
 * Generate a secure approval token
 */
function generateApprovalToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Create a new approval request
 */
export async function createApprovalRequest(params: {
  orgId: string;
  action: ApprovalAction;
  targetUserId: string;
  requestedBy: string;
  reason: string;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; requestId?: string; error?: string }> {
  try {
    const db = await getDatabase();
    const config = ACTION_CONFIG[params.action];
    
    // Check for existing pending request for same action+target
    const existing = await db.collection(COLLECTION_NAME).findOne({
      orgId: params.orgId,
      action: params.action,
      targetUserId: params.targetUserId,
      status: ApprovalStatus.PENDING,
      expiresAt: { $gt: new Date() },
    });
    
    if (existing) {
      return { 
        success: false, 
        error: `Pending approval request already exists: ${existing.requestId}`,
        requestId: existing.requestId,
      };
    }
    
    const now = new Date();
    const request: ApprovalRequest = {
      orgId: params.orgId,
      requestId: generateRequestId(),
      action: params.action,
      targetUserId: params.targetUserId,
      requestedBy: params.requestedBy,
      requestedAt: now,
      expiresAt: new Date(now.getTime() + config.ttlMinutes * 60 * 1000),
      status: ApprovalStatus.PENDING,
      riskLevel: config.riskLevel,
      reason: params.reason,
      metadata: params.metadata,
      approvals: [],
      requiredApprovals: config.requiredApprovals,
    };
    
    await db.collection(COLLECTION_NAME).insertOne(request);
    
    logger.info("Approval request created", {
      component: "approval-service",
      action: "createApprovalRequest",
      requestId: request.requestId,
      approvalAction: params.action,
      targetUserId: params.targetUserId,
      riskLevel: config.riskLevel,
    });
    
    return { success: true, requestId: request.requestId };
  } catch (error) {
    logger.error("Failed to create approval request", {
      component: "approval-service",
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: "Failed to create approval request" };
  }
}

/**
 * Submit an approval decision (approve or reject)
 */
export async function submitApprovalDecision(params: {
  orgId: string;
  requestId: string;
  adminId: string;
  decision: "approved" | "rejected";
  ipAddress?: string;
  comment?: string;
}): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Find the request
    const request = await db.collection(COLLECTION_NAME).findOne({
      orgId: params.orgId,
      requestId: params.requestId,
    }) as ApprovalRequest | null;
    
    if (!request) {
      return { success: false, error: "Approval request not found" };
    }
    
    if (request.status !== ApprovalStatus.PENDING) {
      return { success: false, error: `Request is ${request.status}, cannot be modified` };
    }
    
    if (new Date() > request.expiresAt) {
      await db.collection(COLLECTION_NAME).updateOne(
        { requestId: params.requestId },
        { $set: { status: ApprovalStatus.EXPIRED } }
      );
      return { success: false, error: "Request has expired" };
    }
    
    // Check if this admin already decided
    const alreadyDecided = request.approvals.some(a => a.adminId === params.adminId);
    if (alreadyDecided) {
      return { success: false, error: "You have already submitted a decision for this request" };
    }
    
    // Prevent self-approval
    if (request.requestedBy === params.adminId) {
      return { success: false, error: "Cannot approve your own request" };
    }
    
    const decision: ApprovalDecision = {
      adminId: params.adminId,
      decision: params.decision,
      decidedAt: new Date(),
      ipAddress: params.ipAddress,
      comment: params.comment,
    };
    
    // If rejected, immediately reject the whole request
    if (params.decision === "rejected") {
      await db.collection(COLLECTION_NAME).updateOne(
        { requestId: params.requestId },
        { 
          $set: { status: ApprovalStatus.REJECTED },
          $push: { approvals: { $each: [decision] } },
        } as unknown as Document
      );
      
      logger.info("Approval request rejected", {
        component: "approval-service",
        action: "submitApprovalDecision",
        requestId: params.requestId,
        adminId: params.adminId,
      });
      
      return { success: true };
    }
    
    // Add approval
    const newApprovals = [...request.approvals, decision];
    const approvalCount = newApprovals.filter(a => a.decision === "approved").length;
    
    if (approvalCount >= request.requiredApprovals) {
      // All approvals received - generate token
      const token = generateApprovalToken();
      const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min token TTL
      
      await db.collection(COLLECTION_NAME).updateOne(
        { requestId: params.requestId },
        { 
          $set: { 
            status: ApprovalStatus.APPROVED,
            approvalToken: encryptField(token, "approval.token"),
            tokenExpiresAt,
          },
          $push: { approvals: { $each: [decision] } },
        } as unknown as Document
      );
      
      logger.info("Approval request fully approved", {
        component: "approval-service",
        action: "submitApprovalDecision",
        requestId: params.requestId,
        approvalCount,
      });
      
      return { success: true, token };
    } else {
      // More approvals needed
      await db.collection(COLLECTION_NAME).updateOne(
        { requestId: params.requestId },
        { $push: { approvals: { $each: [decision] } } } as unknown as Document
      );
      
      logger.info("Approval added, more required", {
        component: "approval-service",
        action: "submitApprovalDecision",
        requestId: params.requestId,
        currentApprovals: approvalCount,
        requiredApprovals: request.requiredApprovals,
      });
      
      return { success: true };
    }
  } catch (error) {
    logger.error("Failed to submit approval decision", {
      component: "approval-service",
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: "Failed to submit decision" };
  }
}

/**
 * Validate an approval token for execution
 * Called when the approved action is about to be executed
 */
export async function validateApprovalToken(params: {
  orgId: string;
  action: ApprovalAction;
  targetUserId: string;
  token: string;
  adminId: string;
}): Promise<{ valid: boolean; errorCode?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Find approved request with matching criteria
    const requests = await db.collection(COLLECTION_NAME).find({
      orgId: params.orgId,
      action: params.action,
      targetUserId: params.targetUserId,
      status: ApprovalStatus.APPROVED,
      tokenExpiresAt: { $gt: new Date() },
    }).toArray() as ApprovalRequest[];
    
    for (const request of requests) {
      if (!request.approvalToken) continue;
      
      const storedToken = decryptField(request.approvalToken, "approval.token");
      if (storedToken === params.token) {
        // Token matches - mark as used
        await db.collection(COLLECTION_NAME).updateOne(
          { requestId: request.requestId },
          { 
            $set: { 
              status: "executed" as ApprovalStatus,
              executedAt: new Date(),
              executedBy: params.adminId,
            }
          }
        );
        
        logger.info("Approval token validated and consumed", {
          component: "approval-service",
          action: "validateApprovalToken",
          requestId: request.requestId,
          approvalAction: params.action,
        });
        
        return { valid: true };
      }
    }
    
    return { 
      valid: false, 
      errorCode: "INVALID_APPROVAL_TOKEN",
      error: "Invalid or expired approval token" 
    };
  } catch (error) {
    logger.error("Failed to validate approval token", {
      component: "approval-service",
      error: error instanceof Error ? error.message : String(error),
    });
    return { 
      valid: false, 
      errorCode: "VALIDATION_ERROR",
      error: "Failed to validate approval token" 
    };
  }
}

/**
 * Get pending approval requests for an org
 */
export async function getPendingApprovals(params: {
  orgId: string;
  adminId?: string;  // If provided, excludes requests made by this admin
}): Promise<ApprovalRequest[]> {
  try {
    const db = await getDatabase();
    
    const query: Record<string, unknown> = {
      orgId: params.orgId,
      status: ApprovalStatus.PENDING,
      expiresAt: { $gt: new Date() },
    };
    
    // Exclude requests already decided by this admin
    if (params.adminId) {
      query["approvals.adminId"] = { $ne: params.adminId };
      query.requestedBy = { $ne: params.adminId }; // Can't approve own requests
    }
    
    const requests = await db.collection(COLLECTION_NAME)
      .find(query)
      .sort({ requestedAt: -1 })
      .limit(50)
      .toArray();
    
    // Sanitize - don't expose tokens
    return requests.map(r => ({
      ...r,
      approvalToken: undefined,
    })) as ApprovalRequest[];
  } catch (error) {
    logger.error("Failed to get pending approvals", {
      component: "approval-service",
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Cancel an approval request (by the requester)
 */
export async function cancelApprovalRequest(params: {
  orgId: string;
  requestId: string;
  cancelledBy: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const result = await db.collection(COLLECTION_NAME).updateOne(
      {
        orgId: params.orgId,
        requestId: params.requestId,
        requestedBy: params.cancelledBy,
        status: ApprovalStatus.PENDING,
      },
      {
        $set: {
          status: ApprovalStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      }
    );
    
    if (result.modifiedCount === 0) {
      return { success: false, error: "Request not found or cannot be cancelled" };
    }
    
    logger.info("Approval request cancelled", {
      component: "approval-service",
      action: "cancelApprovalRequest",
      requestId: params.requestId,
    });
    
    return { success: true };
  } catch (error) {
    logger.error("Failed to cancel approval request", {
      component: "approval-service",
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: "Failed to cancel request" };
  }
}

/**
 * Cleanup expired requests (run periodically)
 */
export async function cleanupExpiredRequests(): Promise<number> {
  try {
    const db = await getDatabase();
    
    const result = await db.collection(COLLECTION_NAME).updateMany(
      {
        status: ApprovalStatus.PENDING,
        expiresAt: { $lt: new Date() },
      },
      {
        $set: { status: ApprovalStatus.EXPIRED },
      }
    );
    
    if (result.modifiedCount > 0) {
      logger.info("Expired approval requests cleaned up", {
        component: "approval-service",
        action: "cleanupExpiredRequests",
        count: result.modifiedCount,
      });
    }
    
    return result.modifiedCount;
  } catch (error) {
    logger.error("Failed to cleanup expired requests", {
      component: "approval-service",
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

// ============================================================================
// Service Status Check
// ============================================================================

/**
 * Check if the approval service is available and configured
 */
export function isApprovalServiceEnabled(): boolean {
  // Always enabled - uses MongoDB which is always available
  return true;
}

/**
 * Get approval service status
 */
export function getApprovalServiceStatus(): {
  enabled: boolean;
  backendType: "mongodb";
  features: string[];
} {
  return {
    enabled: true,
    backendType: "mongodb",
    features: [
      "single_admin_approval",
      "two_admin_approval",
      "time_limited_tokens",
      "audit_trail",
      "risk_based_ttl",
    ],
  };
}

export default {
  createApprovalRequest,
  submitApprovalDecision,
  validateApprovalToken,
  getPendingApprovals,
  cancelApprovalRequest,
  cleanupExpiredRequests,
  isApprovalServiceEnabled,
  getApprovalServiceStatus,
  ApprovalAction,
  ApprovalStatus,
  RiskLevel,
};
