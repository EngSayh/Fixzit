/**
 * Zod Validation Schemas for Souq Claims
 *
 * Centralized validation schemas for A-to-Z guarantee claims.
 * Provides type-safe validation with detailed error messages.
 * 
 * TD-001-2: Schema validation for Claims routes
 * @see server/models/souq/ClaimsOrder.ts
 * @see app/api/souq/claims/route.ts
 * 
 * @author [AGENT-0008]
 * @created 2026-01-05
 */

import { z } from "zod";

/**
 * Valid claim types as defined in ClaimService
 */
export const ClaimTypeEnum = z.enum([
  "item_not_received",
  "defective_item",
  "wrong_item",
  "not_as_described",
  "missing_parts",
  "counterfeit",
]);
export type ClaimType = z.infer<typeof ClaimTypeEnum>;

/**
 * Valid claim statuses
 */
export const ClaimStatusEnum = z.enum([
  "draft",
  "pending",
  "under_review",
  "awaiting_seller_response",
  "seller_responded",
  "investigating",
  "escalated",
  "approved",
  "rejected",
  "refunded",
  "closed",
  "cancelled",
]);
export type ClaimStatus = z.infer<typeof ClaimStatusEnum>;

/**
 * Valid request types for claims
 */
export const RequestTypeEnum = z.enum([
  "refund",
  "replacement",
  "partial_refund",
]);
export type RequestType = z.infer<typeof RequestTypeEnum>;

/**
 * Evidence item schema
 */
export const ClaimEvidenceSchema = z.object({
  type: z.enum(["image", "document", "video"]).default("image"),
  url: z.string().url("Evidence URL must be a valid URL"),
  description: z.string().max(500, "Description must not exceed 500 characters").optional(),
  uploadedAt: z.string().datetime().optional(),
});
export type ClaimEvidence = z.infer<typeof ClaimEvidenceSchema>;

/**
 * Create claim request schema
 * Used by POST /api/souq/claims
 */
export const CreateClaimSchema = z.object({
  orderId: z
    .string()
    .min(1, "Order ID is required")
    .regex(/^[a-f0-9]{24}$/i, "Invalid order ID format"),
  reason: z
    .string()
    .min(1, "Reason is required")
    .max(100, "Reason must not exceed 100 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must not exceed 2000 characters"),
  requestedAmount: z
    .number()
    .positive("Requested amount must be positive")
    .max(1000000, "Requested amount exceeds maximum"),
  requestType: RequestTypeEnum,
  evidence: z.array(ClaimEvidenceSchema).max(10, "Maximum 10 evidence items allowed").optional(),
});
export type CreateClaimInput = z.infer<typeof CreateClaimSchema>;

/**
 * Update claim request schema
 * Used by PATCH /api/souq/claims/[id]
 */
export const UpdateClaimSchema = z.object({
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must not exceed 2000 characters")
    .optional(),
  requestedAmount: z
    .number()
    .positive("Requested amount must be positive")
    .max(1000000, "Requested amount exceeds maximum")
    .optional(),
  requestType: RequestTypeEnum.optional(),
  additionalEvidence: z.array(ClaimEvidenceSchema).max(10).optional(),
});
export type UpdateClaimInput = z.infer<typeof UpdateClaimSchema>;

/**
 * Seller response schema
 * Used by POST /api/souq/claims/[id]/response
 */
export const SellerResponseSchema = z.object({
  accepted: z.boolean(),
  response: z
    .string()
    .min(10, "Response must be at least 10 characters")
    .max(2000, "Response must not exceed 2000 characters"),
  proposedResolution: z.enum(["full_refund", "partial_refund", "replacement", "reject"]).optional(),
  proposedAmount: z.number().positive().optional(),
  evidence: z.array(ClaimEvidenceSchema).max(10).optional(),
}).refine(
  (data) => {
    // If not accepting, proposedResolution is not required
    // If accepting with partial_refund, proposedAmount is required
    if (data.accepted && data.proposedResolution === "partial_refund") {
      return data.proposedAmount !== undefined && data.proposedAmount > 0;
    }
    return true;
  },
  {
    message: "Proposed amount is required for partial refund",
    path: ["proposedAmount"],
  }
);
export type SellerResponseInput = z.infer<typeof SellerResponseSchema>;

/**
 * Admin decision schema
 * Used by POST /api/souq/claims/[id]/decision
 */
export const AdminDecisionSchema = z.object({
  decision: z.enum(["approve", "reject", "escalate"]),
  resolution: z.enum(["full_refund", "partial_refund", "replacement", "no_action"]).optional(),
  amount: z.number().positive().optional(),
  reason: z
    .string()
    .min(10, "Reason must be at least 10 characters")
    .max(1000, "Reason must not exceed 1000 characters"),
  internalNotes: z.string().max(2000).optional(),
}).refine(
  (data) => {
    // If approving with partial_refund, amount is required
    if (data.decision === "approve" && data.resolution === "partial_refund") {
      return data.amount !== undefined && data.amount > 0;
    }
    return true;
  },
  {
    message: "Amount is required for partial refund",
    path: ["amount"],
  }
);
export type AdminDecisionInput = z.infer<typeof AdminDecisionSchema>;

/**
 * Appeal schema
 * Used by POST /api/souq/claims/[id]/appeal
 */
export const AppealSchema = z.object({
  reason: z
    .string()
    .min(20, "Appeal reason must be at least 20 characters")
    .max(2000, "Appeal reason must not exceed 2000 characters"),
  newEvidence: z.array(ClaimEvidenceSchema).max(5).optional(),
});
export type AppealInput = z.infer<typeof AppealSchema>;

/**
 * Bulk admin action schema
 * Used by POST /api/souq/claims/admin/bulk
 */
export const BulkAdminActionSchema = z.object({
  claimIds: z
    .array(z.string().regex(/^[a-f0-9]{24}$/i, "Invalid claim ID format"))
    .min(1, "At least one claim ID required")
    .max(50, "Maximum 50 claims per bulk action"),
  action: z.enum(["assign", "escalate", "close", "reopen"]),
  assignTo: z.string().regex(/^[a-f0-9]{24}$/i).optional(),
  reason: z.string().max(500).optional(),
}).refine(
  (data) => {
    // If action is assign, assignTo is required
    if (data.action === "assign") {
      return data.assignTo !== undefined;
    }
    return true;
  },
  {
    message: "assignTo is required for assign action",
    path: ["assignTo"],
  }
);
export type BulkAdminActionInput = z.infer<typeof BulkAdminActionSchema>;

/**
 * Validate and parse claim creation request
 * Returns { success: true, data } or { success: false, error }
 */
export function validateCreateClaim(input: unknown) {
  return CreateClaimSchema.safeParse(input);
}

/**
 * Validate and parse seller response
 */
export function validateSellerResponse(input: unknown) {
  return SellerResponseSchema.safeParse(input);
}

/**
 * Validate and parse admin decision
 */
export function validateAdminDecision(input: unknown) {
  return AdminDecisionSchema.safeParse(input);
}
