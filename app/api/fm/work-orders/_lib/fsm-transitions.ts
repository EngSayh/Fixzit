/**
 * @fileoverview FSM Transition Helpers
 * @description Role mapping, status mapping, and transition guards for FM work orders
 * @module api/fm/work-orders/_lib/fsm-transitions
 */

import {
  Role as FMRole,
  Plan as FMPlan,
  WOStatus,
  type ResourceCtx,
} from "@/domain/fm/fm.behavior";
import type { WORK_ORDER_FSM } from "@/domain/fm/fm.behavior";

// ============================================================================
// Role and Status Mapping
// ============================================================================

// LEGACY-003 FIX: Use canonical STRICT v4 FM roles (not deprecated aliases)
export const ROLE_ALIASES: Record<string, FMRole> = {
  // Admin roles → ADMIN
  ADMIN: FMRole.ADMIN,
  CORPORATE_ADMIN: FMRole.ADMIN,
  
  // Management roles → TEAM_MEMBER or PROPERTY_MANAGER
  MANAGER: FMRole.TEAM_MEMBER,
  FM_MANAGER: FMRole.PROPERTY_MANAGER,
  PROPERTY_MANAGER: FMRole.PROPERTY_MANAGER,
  DISPATCHER: FMRole.TEAM_MEMBER,
  
  // Owner roles → CORPORATE_OWNER
  OWNER: FMRole.CORPORATE_OWNER,
  PROPERTY_OWNER: FMRole.CORPORATE_OWNER,
  OWNER_DEPUTY: FMRole.PROPERTY_MANAGER, // Deputy acts as Property Manager
  
  // Other mappings
  CUSTOMER: FMRole.TENANT,
  SUPPORT: FMRole.TEAM_MEMBER,
  AUDITOR: FMRole.TEAM_MEMBER,
  
  // Business function roles → TEAM_MEMBER
  FINANCE: FMRole.TEAM_MEMBER,
  HR: FMRole.TEAM_MEMBER,
  PROCUREMENT: FMRole.TEAM_MEMBER,
};

export const PLAN_ALIASES: Record<string, FMPlan> = {
  STARTER: FMPlan.STARTER,
  FREE: FMPlan.STARTER,
  BASIC: FMPlan.STARTER,
  STANDARD: FMPlan.STANDARD,
  DEFAULT: FMPlan.STANDARD,
  PRO: FMPlan.PRO,
  PROFESSIONAL: FMPlan.PRO,
  PREMIUM: FMPlan.PRO,
  ENTERPRISE: FMPlan.ENTERPRISE,
  CUSTOM: FMPlan.ENTERPRISE,
};

export const LEGACY_STATUS_MAP: Record<string, WOStatus> = {
  DRAFT: WOStatus.NEW,
  SUBMITTED: WOStatus.ASSESSMENT,
  ASSIGNED: WOStatus.ASSESSMENT,
  OPEN: WOStatus.ASSESSMENT,
  ON_HOLD: WOStatus.ASSESSMENT,
  APPROVED: WOStatus.APPROVED,
  VERIFIED: WOStatus.QUALITY_CHECK,
  COMPLETED: WOStatus.WORK_COMPLETE,
  FINISHED: WOStatus.WORK_COMPLETE,
  IN_PROGRESS: WOStatus.IN_PROGRESS,
  PENDING_APPROVAL: WOStatus.PENDING_APPROVAL,
  CANCELLED: WOStatus.CLOSED,
  CLOSED: WOStatus.CLOSED,
  WORK_COMPLETE: WOStatus.WORK_COMPLETE,
  QUALITY_CHECK: WOStatus.QUALITY_CHECK,
  FINANCIAL_POSTING: WOStatus.FINANCIAL_POSTING,
};

/**
 * Check if a value is a valid WOStatus
 */
export function isWOStatus(value: unknown): value is WOStatus {
  if (typeof value !== "string") return false;
  return (Object.values(WOStatus) as string[]).includes(value);
}

/**
 * Convert input to WOStatus, handling legacy status names
 */
export function toWorkOrderStatus(input: unknown): WOStatus | null {
  if (isWOStatus(input)) return input;
  if (typeof input !== "string") return null;
  const normalized = input.toUpperCase();
  return LEGACY_STATUS_MAP[normalized] ?? null;
}

/**
 * Map session role to FM role
 */
export function mapSessionRole(role?: string | null): FMRole | null {
  if (!role) return null;
  const normalized = role.trim().toUpperCase();
  if ((Object.values(FMRole) as string[]).includes(normalized)) {
    return normalized as FMRole;
  }
  return ROLE_ALIASES[normalized] ?? null;
}

/**
 * Resolve subscription plan
 * SEC-003 FIX: Use STARTER as default (least privilege principle)
 */
export function resolvePlan(plan?: string | null): FMPlan {
  if (!plan) return FMPlan.STARTER;
  const normalized = plan.toUpperCase();
  return PLAN_ALIASES[normalized] ?? FMPlan.STARTER;
}

/**
 * Check if transition requires media uploads and validate
 */
export function getTransitionGuardFailure(
  transition: (typeof WORK_ORDER_FSM.transitions)[number],
  ctx: ResourceCtx,
): string | null {
  if (transition.requireMedia?.length) {
    const missing = transition.requireMedia.filter(
      (media) => !ctx.uploadedMedia?.includes(media),
    );
    if (missing.length) {
      return `${missing.join(" & ")} media required before continuing`;
    }
  }

  if (transition.guard === "technicianAssigned" && !ctx.isTechnicianAssigned) {
    return "Assign a technician before performing this transition";
  }

  return null;
}
