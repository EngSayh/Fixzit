/**
 * Centralized Fixzit AI Assistant Type Definitions
 * Based on Blueprint Bible roles matrix and Design System specifications
 * 
 * 🔒 STRICT v4.1 COMPLIANT - Aligned with domain/fm/fm.behavior.ts canonical Role enum
 */

import { Role, SubRole } from "@/domain/fm/fm-lite";

// Re-export canonical Role and SubRole from the single source of truth (client-safe)
export { Role, SubRole };

/**
 * Legacy role type union - DEPRECATED
 * Use Role enum from domain/fm/fm.behavior.ts instead.
 * 
 * STRICT v4.1 Canonical Roles:
 * - SUPER_ADMIN: Platform operator, cross-org access
 * - ADMIN: Tenant admin, org-scoped full access (alias: CORPORATE_ADMIN)
 * - CORPORATE_OWNER: Portfolio owner (alias: PROPERTY_OWNER, OWNER)
 * - TEAM_MEMBER: Corporate staff (alias: MANAGEMENT, FINANCE, HR, EMPLOYEE)
 *   - Requires SubRole for specialization: FINANCE_OFFICER, HR_OFFICER, SUPPORT_AGENT, OPERATIONS_MANAGER
 * - TECHNICIAN: Field worker
 * - PROPERTY_MANAGER: Manages subset of properties (alias: FM_MANAGER)
 * - TENANT: End-user (alias: CUSTOMER)
 * - VENDOR: External service provider
 * - GUEST: Public visitor (alias: AUDITOR, VIEWER)
 * 
 * @deprecated Import { Role } from "@/domain/fm/fm.behavior" instead
 */
export type LegacyRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "CORPORATE_OWNER"
  | "TEAM_MEMBER"
  | "TECHNICIAN"
  | "PROPERTY_MANAGER"
  | "TENANT"
  | "VENDOR"
  | "GUEST"
  // Legacy aliases (mapped to canonical roles above)
  | "CORPORATE_ADMIN" // → ADMIN
  | "MANAGEMENT" // → TEAM_MEMBER (requires SubRole)
  | "FINANCE" // → TEAM_MEMBER + SubRole.FINANCE_OFFICER
  | "HR" // → TEAM_MEMBER + SubRole.HR_OFFICER
  | "CORPORATE_EMPLOYEE" // → TEAM_MEMBER
  | "PROPERTY_OWNER" // → CORPORATE_OWNER
  | "FM_MANAGER" // → PROPERTY_MANAGER
  | "PROCUREMENT" // → TEAM_MEMBER
  | "EMPLOYEE" // → TEAM_MEMBER
  | "CUSTOMER" // → TENANT
  | "OWNER" // → CORPORATE_OWNER
  | "AUDITOR"; // → GUEST (least privilege)

// Session profile with locale and directionality for RTL support
export interface SessionProfile {
  userId: string;
  name: string;
  email: string;
  role: Role;
  subRole?: SubRole; // STRICT v4.1: Sub-role for Team Member specialization
  orgId: string | null;
  locale: "ar" | "en";
  dir: "rtl" | "ltr";
}

// Chat message structure
export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  intent?: Intent;
  dataClass?: DataClass;
  sources?: KnowledgeSource[];
}

// Intent classification for message routing
export type Intent =
  | "GENERAL"
  | "PERSONAL"
  | "APARTMENT_SEARCH"
  | "DISPATCH"
  | "UPLOAD_PHOTO"
  | "APPROVE_QUOTATION"
  | "OWNER_STATEMENTS"
  | "SCHEDULE_VISIT"
  | "CREATE_WORK_ORDER"
  | "LIST_MY_TICKETS";

// Data classification for RBAC enforcement
export type DataClass =
  | "PUBLIC"
  | "TENANT_SCOPED"
  | "OWNER_SCOPED"
  | "ORG_FINANCIALS"
  | "FINANCE"
  | "HR"
  | "INTERNAL"
  | "SENSITIVE";

// Session context for backend processing
export interface SessionContext {
  userId: string | null;
  orgId: string | null;
  role: Role;
  subRole?: SubRole;
  locale: "en" | "ar";
  tenantId?: string;
}

// Knowledge base source for RAG
export interface KnowledgeSource {
  id: string;
  title: string;
  score: number;
  source?: string;
  excerpt?: string;
}

// Policy evaluation result
export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  dataClass?: DataClass;
}

// Tool execution result
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  requiresAuth?: boolean;
}

// Apartment search result (guest-safe)
export interface ApartmentSearchResult {
  unitId?: string; // Only for authenticated users
  bedrooms: number;
  bathrooms: number;
  area: number;
  rent: number;
  currency: string;
  city: string;
  district?: string;
  propertyName?: string;
  available: boolean;
  agentContact?: string; // Only for authenticated users
  features?: string[];
}

// AI Assistant Enhancement Guide
export interface AIAssistantEnhancement {
  featureId: string;
  description: string;
  impact: "LOW" | "MEDIUM" | "HIGH";
  effort: "LOW" | "MEDIUM" | "HIGH";
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
}
