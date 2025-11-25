/* domain/fm/fm.behavior.ts
 * Fixzit Facility Management: unified behaviors for Cursor + Mongo (Mongoose)
 * 
 * STRICT v4 COMPLIANT - Governance V5/V6 Aligned
 * 
 * This file implements the canonical RBAC matrix from STRICT v4 specification,
 * fully aligned with Master System Governance V5 and Sidebar Specs V6.
 * 
 * Key Components:
 * - 9 Canonical Roles (Super Admin, Admin, Corporate Owner, Team Member, 
 *   Technician, Property Manager, Tenant, Vendor, Guest)
 * - 12 Modules (Dashboard, Work Orders, Properties, Finance, HR, Administration,
 *   CRM, Marketplace, Support, Compliance & Legal, Reports & Analytics, System Management)
 * - Complete Role→Module→Action access matrix
 * - ABAC guards with org-scoping and ownership checks
 * - Work Order state machine with FSM transitions
 * - Approvals DSL with delegation and escalation
 * - SLA policies and notification rules
 * - Mongoose schemas for MongoDB persistence
 * 
 * Role Scope Distinction:
 * - SUPER_ADMIN: Cross-org access (isSuperAdmin: true in database)
 * - ADMIN: Org-scoped full access (isSuperAdmin: false, filtered by orgId)
 * - All others: Org-scoped with module/action restrictions
 * 
 * Legacy aliases maintained for backward compatibility but deprecated.
 * Use canonical role names in new code.
 */

import mongoose, { Schema, Types } from "mongoose";

/* =========================
 * 1) Enums & Constants
 * ========================= */

export enum Role {
  // STRICT v4 Canonical Roles
  SUPER_ADMIN = "SUPER_ADMIN", // Platform operator, cross-org access
  ADMIN = "ADMIN", // Tenant admin, org-scoped full access
  CORPORATE_OWNER = "CORPORATE_OWNER", // Portfolio owner, org-scoped
  TEAM_MEMBER = "TEAM_MEMBER", // Corporate staff/employee, operational role
  TECHNICIAN = "TECHNICIAN", // Field worker, assigned WOs only
  PROPERTY_MANAGER = "PROPERTY_MANAGER", // Manages subset of properties
  TENANT = "TENANT", // End-user, own units only
  VENDOR = "VENDOR", // External service provider
  GUEST = "GUEST", // Public visitor, no auth
  
  // Legacy aliases for backward compatibility (deprecated, use canonical names above)
  /** @deprecated Use ADMIN instead */
  CORPORATE_ADMIN = "ADMIN",
  /** @deprecated Use TEAM_MEMBER with module restrictions instead */
  MANAGEMENT = "TEAM_MEMBER",
  /** @deprecated Use TEAM_MEMBER with Finance module access instead */
  FINANCE = "TEAM_MEMBER",
  /** @deprecated Use TEAM_MEMBER with HR module access instead */
  HR = "TEAM_MEMBER",
  /** @deprecated Use TEAM_MEMBER instead */
  EMPLOYEE = "TEAM_MEMBER",
  /** @deprecated Use CORPORATE_OWNER instead */
  PROPERTY_OWNER = "CORPORATE_OWNER",
  /** @deprecated Role removed in STRICT v4 */
  OWNER_DEPUTY = "PROPERTY_MANAGER",
}

export enum Plan {
  STARTER = "STARTER",
  STANDARD = "STANDARD",
  PRO = "PRO",
  ENTERPRISE = "ENTERPRISE",
}

/** FM modules (STRICT v4 - matches Governance V5/V6 tabs) */
export enum ModuleKey {
  DASHBOARD = "DASHBOARD",
  WORK_ORDERS = "WORK_ORDERS",
  PROPERTIES = "PROPERTIES",
  FINANCE = "FINANCE",
  HR = "HR",
  ADMINISTRATION = "ADMINISTRATION",
  CRM = "CRM",
  MARKETPLACE = "MARKETPLACE",
  SUPPORT = "SUPPORT",
  COMPLIANCE = "COMPLIANCE", // Compliance & Legal
  REPORTS = "REPORTS", // Reports & Analytics
  SYSTEM_MANAGEMENT = "SYSTEM_MANAGEMENT",
}

export enum SubmoduleKey {
  // Work Orders
  WO_CREATE = "WO_CREATE",
  WO_TRACK_ASSIGN = "WO_TRACK_ASSIGN",
  WO_PM = "WO_PM", // Preventive Maintenance
  WO_SERVICE_HISTORY = "WO_SERVICE_HISTORY",
  // Properties
  PROP_LIST = "PROP_LIST",
  PROP_UNITS_TENANTS = "PROP_UNITS_TENANTS",
  PROP_LEASES = "PROP_LEASES",
  PROP_INSPECTIONS = "PROP_INSPECTIONS",
  PROP_DOCUMENTS = "PROP_DOCUMENTS",
}

export type Action =
  | "view"
  | "create"
  | "update"
  | "delete"
  | "comment"
  | "upload_media"
  | "assign"
  | "schedule"
  | "dispatch"
  | "submit_estimate"
  | "attach_quote"
  | "request_approval"
  | "approve"
  | "reject"
  | "request_changes"
  | "start_work"
  | "pause_work"
  | "complete_work"
  | "close"
  | "reopen"
  | "export"
  | "share"
  | "link_finance"
  | "link_hr"
  | "link_marketplace"
  | "post_finance";

/** SLA priorities (policy values are configurable per org) */
export const SLA = {
  P1: { responseMins: 30, resolutionHours: 6 },
  P2: { responseMins: 120, resolutionHours: 24 },
  P3: { responseMins: 480, resolutionHours: 72 },
} as const;

/** Default plan gates (tweak to match your pricing) */
export const PLAN_GATES: Record<
  Plan,
  Partial<Record<SubmoduleKey, boolean>>
> = {
  [Plan.STARTER]: {
    WO_CREATE: true,
    WO_TRACK_ASSIGN: true,
    WO_PM: false,
    WO_SERVICE_HISTORY: true,
    PROP_LIST: true,
    PROP_UNITS_TENANTS: true,
    PROP_LEASES: false,
    PROP_INSPECTIONS: false,
    PROP_DOCUMENTS: true,
  },
  [Plan.STANDARD]: {
    WO_CREATE: true,
    WO_TRACK_ASSIGN: true,
    WO_PM: true,
    WO_SERVICE_HISTORY: true,
    PROP_LIST: true,
    PROP_UNITS_TENANTS: true,
    PROP_LEASES: true,
    PROP_INSPECTIONS: true,
    PROP_DOCUMENTS: true,
  },
  [Plan.PRO]: {
    WO_CREATE: true,
    WO_TRACK_ASSIGN: true,
    WO_PM: true,
    WO_SERVICE_HISTORY: true,
    PROP_LIST: true,
    PROP_UNITS_TENANTS: true,
    PROP_LEASES: true,
    PROP_INSPECTIONS: true,
    PROP_DOCUMENTS: true,
  },
  [Plan.ENTERPRISE]: {
    WO_CREATE: true,
    WO_TRACK_ASSIGN: true,
    WO_PM: true,
    WO_SERVICE_HISTORY: true,
    PROP_LIST: true,
    PROP_UNITS_TENANTS: true,
    PROP_LEASES: true,
    PROP_INSPECTIONS: true,
    PROP_DOCUMENTS: true,
  },
};

/* =========================
 * 2) Role → Module access (STRICT v4 Matrix)
 * ========================= */

export const ROLE_MODULE_ACCESS: Record<
  Role,
  Partial<Record<ModuleKey, boolean>>
> = {
  // Super Admin: Full access to ALL modules, cross-org (isSuperAdmin: true)
  [Role.SUPER_ADMIN]: {
    DASHBOARD: true,
    WORK_ORDERS: true,
    PROPERTIES: true,
    FINANCE: true,
    HR: true,
    ADMINISTRATION: true,
    CRM: true,
    MARKETPLACE: true,
    SUPPORT: true,
    COMPLIANCE: true,
    REPORTS: true,
    SYSTEM_MANAGEMENT: true,
  },
  
  // Admin (Tenant Admin / Corporate Admin): Full access within their org (isSuperAdmin: false)
  [Role.ADMIN]: {
    DASHBOARD: true,
    WORK_ORDERS: true,
    PROPERTIES: true,
    FINANCE: true,
    HR: true,
    ADMINISTRATION: true,
    CRM: true,
    MARKETPLACE: true,
    SUPPORT: true,
    COMPLIANCE: true,
    REPORTS: true,
    SYSTEM_MANAGEMENT: true,
  },
  
  // Corporate Owner: Full module access but may have DoA restrictions on dangerous actions
  [Role.CORPORATE_OWNER]: {
    DASHBOARD: true,
    WORK_ORDERS: true,
    PROPERTIES: true,
    FINANCE: true,
    HR: true,
    ADMINISTRATION: true,
    CRM: true,
    MARKETPLACE: true,
    SUPPORT: true,
    COMPLIANCE: true,
    REPORTS: true,
    SYSTEM_MANAGEMENT: true, // Can be restricted via DoA for risky config
  },
  
  // Team Member: Operational staff (Dashboard, Work Orders, CRM, Support, Reports only)
  // Finance Officer / HR Officer are Team Members with module-specific access
  [Role.TEAM_MEMBER]: {
    DASHBOARD: true,
    WORK_ORDERS: true,
    PROPERTIES: false,
    FINANCE: false, // Finance Officer gets this via specific permission
    HR: false, // HR Officer gets this via specific permission
    ADMINISTRATION: false,
    CRM: true,
    MARKETPLACE: false,
    SUPPORT: true,
    COMPLIANCE: false,
    REPORTS: true,
    SYSTEM_MANAGEMENT: false,
  },
  
  // Technician: Field worker (Dashboard, Work Orders, Support, Reports - personal stats)
  [Role.TECHNICIAN]: {
    DASHBOARD: true,
    WORK_ORDERS: true,
    PROPERTIES: false,
    FINANCE: false,
    HR: false,
    ADMINISTRATION: false,
    CRM: false,
    MARKETPLACE: false,
    SUPPORT: true,
    COMPLIANCE: false,
    REPORTS: true, // Personal performance stats only
    SYSTEM_MANAGEMENT: false,
  },
  
  // Property Manager: Manages property portfolio (Dashboard, Work Orders, Properties, Support, Reports)
  [Role.PROPERTY_MANAGER]: {
    DASHBOARD: true,
    WORK_ORDERS: true,
    PROPERTIES: true,
    FINANCE: false,
    HR: false,
    ADMINISTRATION: false,
    CRM: false,
    MARKETPLACE: false,
    SUPPORT: true,
    COMPLIANCE: false,
    REPORTS: true,
    SYSTEM_MANAGEMENT: false,
  },
  
  // Tenant: End-user (Dashboard, Work Orders, Properties - own units, Marketplace, Support, Reports)
  [Role.TENANT]: {
    DASHBOARD: true,
    WORK_ORDERS: true,
    PROPERTIES: true, // Own unit/property only
    FINANCE: false,
    HR: false,
    ADMINISTRATION: false,
    CRM: false,
    MARKETPLACE: true,
    SUPPORT: true,
    COMPLIANCE: false,
    REPORTS: true, // Own history/statements only
    SYSTEM_MANAGEMENT: false,
  },
  
  // Vendor: External service provider (Dashboard, Work Orders - assigned only, Marketplace, Support, Reports)
  [Role.VENDOR]: {
    DASHBOARD: true,
    WORK_ORDERS: true, // Only WOs tied to their vendor account
    PROPERTIES: false,
    FINANCE: false,
    HR: false,
    ADMINISTRATION: false,
    CRM: false,
    MARKETPLACE: true,
    SUPPORT: true,
    COMPLIANCE: false,
    REPORTS: true, // Vendor performance only
    SYSTEM_MANAGEMENT: false,
  },
  
  // Guest: Public visitor (Dashboard - public landing only)
  [Role.GUEST]: {
    DASHBOARD: true, // Public landing/dashboard only
    WORK_ORDERS: false,
    PROPERTIES: false,
    FINANCE: false,
    HR: false,
    ADMINISTRATION: false,
    CRM: false,
    MARKETPLACE: false,
    SUPPORT: false,
    COMPLIANCE: false,
    REPORTS: false,
    SYSTEM_MANAGEMENT: false,
  },
};

/* =========================
 * 3) Role × Submodule → Actions (RBAC core)
 * ========================= */
/** Actions that only assigned technicians can perform */
export const TECHNICIAN_ASSIGNED_ACTIONS: Action[] = [
  "start_work",
  "pause_work",
  "complete_work",
  "submit_estimate",
  "attach_quote",
];

type ActionsBySubmodule = Partial<Record<SubmoduleKey, Action[]>>;
export const ROLE_ACTIONS: Record<Role, ActionsBySubmodule> = {
  // Super Admin: Full actions on all submodules (cross-org access via isSuperAdmin: true)
  [Role.SUPER_ADMIN]: {
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: [
      "view",
      "assign",
      "schedule",
      "dispatch",
      "update",
      "export",
      "share",
      "post_finance",
    ],
    WO_PM: ["view", "create", "update", "export"],
    WO_SERVICE_HISTORY: ["view", "export"],
    PROP_LIST: ["view", "create", "update", "delete", "export"],
    PROP_UNITS_TENANTS: ["view", "update", "export"],
    PROP_LEASES: ["view", "create", "update", "export"],
    PROP_INSPECTIONS: ["view", "create", "update", "export"],
    PROP_DOCUMENTS: ["view", "create", "update", "export"],
  },
  
  // Admin: Full actions within their org (org-scoped via isSuperAdmin: false)
  [Role.ADMIN]: {
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: [
      "view",
      "assign",
      "schedule",
      "dispatch",
      "update",
      "export",
      "share",
      "post_finance",
    ],
    WO_PM: ["view", "create", "update", "export"],
    WO_SERVICE_HISTORY: ["view", "export"],
    PROP_LIST: ["view", "create", "update", "delete", "export"],
    PROP_UNITS_TENANTS: ["view", "update", "export"],
    PROP_LEASES: ["view", "create", "update", "export"],
    PROP_INSPECTIONS: ["view", "create", "update", "export"],
    PROP_DOCUMENTS: ["view", "create", "update", "export"],
  },
  
  // Corporate Owner: Portfolio management with approval authority
  [Role.CORPORATE_OWNER]: {
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: ["view", "approve", "reject", "request_changes", "export"],
    WO_PM: ["view"],
    WO_SERVICE_HISTORY: ["view", "export"],
    PROP_LIST: ["view", "create", "update", "export"],
    PROP_UNITS_TENANTS: ["view", "update", "export"],
    PROP_LEASES: ["view", "create", "update", "export"],
    PROP_INSPECTIONS: ["view", "create", "update", "export"],
    PROP_DOCUMENTS: ["view", "create", "update", "export"],
  },
  
  // Team Member: Operational staff, create and manage WOs
  [Role.TEAM_MEMBER]: {
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: ["view", "assign", "update", "export", "post_finance"],
    WO_PM: ["view", "create", "update", "export"],
  },
  
  // Technician: Field worker, assigned WOs only
  [Role.TECHNICIAN]: {
    WO_CREATE: ["view", "comment"],
    WO_TRACK_ASSIGN: [
      "view",
      "update",
      ...TECHNICIAN_ASSIGNED_ACTIONS,
      "upload_media",
    ],
    WO_PM: ["view", "update"],
    WO_SERVICE_HISTORY: ["view"],
  },
  
  // Property Manager: Manages properties and related WOs
  [Role.PROPERTY_MANAGER]: {
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: [
      "view",
      "assign",
      "schedule",
      "dispatch",
      "update",
      "export",
      "share",
    ],
    WO_PM: ["view", "export"],
    WO_SERVICE_HISTORY: ["view", "export"],
    PROP_LIST: ["view", "update", "export"],
    PROP_UNITS_TENANTS: ["view", "update", "export"],
    PROP_LEASES: ["view", "export"],
    PROP_INSPECTIONS: ["view", "create", "update", "export"],
    PROP_DOCUMENTS: ["view", "create", "update", "export"],
  },
  
  // Tenant: End-user, own units only
  [Role.TENANT]: {
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: ["view", "comment"],
    WO_PM: ["view"],
    WO_SERVICE_HISTORY: ["view"],
    PROP_LIST: ["view"],
    PROP_UNITS_TENANTS: ["view"],
  },
  
  // Vendor: External service provider
  [Role.VENDOR]: {
    WO_CREATE: ["view", "comment"],
    WO_TRACK_ASSIGN: [
      "view",
      "submit_estimate",
      "attach_quote",
      "upload_media",
      "complete_work",
    ],
    WO_PM: ["view"],
    WO_SERVICE_HISTORY: ["view"],
  },
  
  // Guest: No actions
  [Role.GUEST]: {},
};

/* =========================
 * 4) ABAC Guard (scope + plan + ownership)
 * ========================= */

export type ResourceCtx = {
  orgId: string;
  propertyId?: string;
  unitId?: string;
  createdBy?: string;
  ownerUserId?: string;
  technicianUserId?: string;
  requesterUserId?: string;
  plan: Plan;
  role: Role;
  userId: string;
  isOrgMember: boolean;
  isSuperAdmin?: boolean;
  isOwnerOfProperty?: boolean;
  isTechnicianAssigned?: boolean;
  uploadedMedia?: Array<"BEFORE" | "DURING" | "AFTER" | "QUOTE">;
};

export function can(
  submodule: SubmoduleKey,
  action: Action,
  ctx: ResourceCtx,
): boolean {
  // 1) Plan gate
  if (!PLAN_GATES[ctx.plan]?.[submodule]) return false;

  // 2) Role action allow-list
  const allowed = ROLE_ACTIONS[ctx.role]?.[submodule];
  if (!allowed?.includes(action)) return false;

  // 3) Ownership / scope checks (row-level security)
  // Super Admin bypasses org checks (cross-org access)
  if (!ctx.isOrgMember && ctx.role !== Role.SUPER_ADMIN) return false;

  // Tenant: strict ownership - can only access own units/WOs
  if (ctx.role === Role.TENANT && action !== "create") {
    return ctx.requesterUserId === ctx.userId;
  }

  // Corporate Owner / Property Manager: must own/manage the property
  if (
    ctx.role === Role.CORPORATE_OWNER ||
    ctx.role === Role.PROPERTY_MANAGER
  ) {
    if (ctx.propertyId && !(ctx.isOwnerOfProperty || ctx.isSuperAdmin)) {
      return false;
    }
  }

  // Technician: certain actions require assignment
  if (
    ctx.role === Role.TECHNICIAN &&
    TECHNICIAN_ASSIGNED_ACTIONS.includes(action)
  ) {
    return !!ctx.isTechnicianAssigned;
  }

  return true;
}

/* =========================
 * 5) Work Order State Machine (FSM)
 * ========================= */

export enum WOStatus {
  NEW = "NEW",
  ASSESSMENT = "ASSESSMENT",
  ESTIMATE_PENDING = "ESTIMATE_PENDING",
  QUOTATION_REVIEW = "QUOTATION_REVIEW",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  APPROVED = "APPROVED",
  IN_PROGRESS = "IN_PROGRESS",
  WORK_COMPLETE = "WORK_COMPLETE",
  QUALITY_CHECK = "QUALITY_CHECK",
  FINANCIAL_POSTING = "FINANCIAL_POSTING",
  CLOSED = "CLOSED",
}

/** FSM transition definition with optional RBAC action enforcement */
type TransitionDef = {
  from: string;
  to: string;
  by: Role[];
  action?: Action;
  requireMedia?: Array<"BEFORE" | "AFTER">;
  guard?: "technicianAssigned";
  optional?: boolean;
};

export const WORK_ORDER_FSM: {
  requiredMediaByStatus: Partial<
    Record<string, ReadonlyArray<"BEFORE" | "AFTER">>
  >;
  transitions: TransitionDef[];
  sla: typeof SLA;
} = {
  requiredMediaByStatus: {
    ASSESSMENT: ["BEFORE"],
    WORK_COMPLETE: ["AFTER"],
  },
  transitions: [
    {
      from: "NEW",
      to: "ASSESSMENT",
      by: [Role.EMPLOYEE, Role.CORPORATE_ADMIN, Role.MANAGEMENT, Role.HR],
    },
    {
      from: "ASSESSMENT",
      to: "ESTIMATE_PENDING",
      by: [Role.TECHNICIAN],
      requireMedia: ["BEFORE"],
    },
    {
      from: "ESTIMATE_PENDING",
      to: "QUOTATION_REVIEW",
      by: [Role.TECHNICIAN],
      action: "attach_quote",
    },
    {
      from: "QUOTATION_REVIEW",
      to: "PENDING_APPROVAL",
      by: [Role.EMPLOYEE, Role.CORPORATE_ADMIN],
      action: "request_approval",
    },
    {
      from: "PENDING_APPROVAL",
      to: "APPROVED",
      by: [
        Role.PROPERTY_OWNER,
        Role.OWNER_DEPUTY,
        Role.MANAGEMENT,
        Role.FINANCE,
      ],
      action: "approve",
    },
    {
      from: "APPROVED",
      to: "IN_PROGRESS",
      by: [Role.TECHNICIAN],
      action: "start_work",
    },
    {
      from: "IN_PROGRESS",
      to: "WORK_COMPLETE",
      by: [Role.TECHNICIAN],
      action: "complete_work",
      requireMedia: ["AFTER"],
    },
    {
      from: "WORK_COMPLETE",
      to: "QUALITY_CHECK",
      by: [Role.MANAGEMENT, Role.PROPERTY_OWNER],
      optional: true,
    },
    {
      from: "QUALITY_CHECK",
      to: "FINANCIAL_POSTING",
      by: [Role.EMPLOYEE, Role.CORPORATE_ADMIN],
    },
    {
      from: "WORK_COMPLETE",
      to: "FINANCIAL_POSTING",
      by: [Role.EMPLOYEE, Role.CORPORATE_ADMIN],
    },
    {
      from: "FINANCIAL_POSTING",
      to: "CLOSED",
      by: [Role.EMPLOYEE, Role.CORPORATE_ADMIN],
      action: "post_finance",
    },
  ],
  sla: SLA,
};

/* =========================
 * 6) Approvals DSL (Delegation, Escalation, Parallel/Sequential)
 * ========================= */

export type ApprovalRule = {
  name: string;
  when: {
    category?: string[];
    amountGte?: number;
    propertyOwnerRequired?: boolean;
  };
  require: Array<{ role: Role; count?: number }>;
  parallelWith?: Array<{ role: Role; count?: number }>;
  timeoutHours?: number;
  escalateTo?: Role[];
  delegateTo?: Role[];
};

export const APPROVAL_POLICIES: ApprovalRule[] = [
  {
    name: "Default < 1,000",
    when: { amountGte: 0 },
    require: [{ role: Role.PROPERTY_OWNER, count: 1 }],
    timeoutHours: 24,
    escalateTo: [Role.OWNER_DEPUTY, Role.MANAGEMENT],
    delegateTo: [Role.OWNER_DEPUTY],
  },
  {
    name: "Mid 1,000–10,000 HVAC/Plumbing",
    when: {
      amountGte: 1000,
      category: ["HVAC", "Plumbing"],
      propertyOwnerRequired: true,
    },
    require: [
      { role: Role.PROPERTY_OWNER, count: 1 },
      { role: Role.MANAGEMENT, count: 1 },
    ],
    timeoutHours: 24,
    escalateTo: [Role.CORPORATE_ADMIN],
    delegateTo: [Role.OWNER_DEPUTY],
  },
  {
    name: "High ≥ 10,000 Any",
    when: { amountGte: 10000 },
    require: [
      { role: Role.PROPERTY_OWNER, count: 1 },
      { role: Role.MANAGEMENT, count: 1 },
    ],
    parallelWith: [{ role: Role.FINANCE, count: 1 }],
    timeoutHours: 24,
    escalateTo: [Role.CORPORATE_ADMIN],
    delegateTo: [Role.OWNER_DEPUTY],
  },
];

/* =========================
 * 7) Notifications & Deep-links
 * ========================= */

export const NOTIFY = {
  onTicketCreated: ["TENANT", "TECHNICIAN", "EMPLOYEE"],
  onAssign: ["TECHNICIAN"],
  onApprovalRequested: [
    "PROPERTY_OWNER",
    "OWNER_DEPUTY",
    "MANAGEMENT",
    "FINANCE",
  ],
  onApproved: ["TECHNICIAN", "TENANT"],
  onClosed: ["TENANT", "PROPERTY_OWNER"],
  channels: ["push", "email", "sms", "whatsapp"],
  deepLinks: {
    approval: "fixzit://approvals/quote/:quotationId",
    ownerStatement: "fixzit://financials/statements/property/:propertyId",
  },
};

/* =========================
 * 8) Mongoose Schemas (Mongo)
 * ========================= */

const OrganizationSchema = new Schema(
  {
    name: String,
    subscription_plan: {
      type: String,
      enum: Object.values(Plan),
      required: true,
    },
  },
  { timestamps: true },
);

const UserSchema = new Schema(
  {
    name: String,
    email: { type: String, index: true },
    role: { type: String, enum: Object.values(Role), index: true },
    org_id: { type: Types.ObjectId, ref: "Organization", index: true },
  },
  { timestamps: true },
);

const PropertySchema = new Schema(
  {
    name: String,
    address: String,
    owner_user_id: { type: Types.ObjectId, ref: "User" },
    deputy_user_id: { type: Types.ObjectId, ref: "User" },
    org_id: { type: Types.ObjectId, ref: "Organization", index: true },
  },
  { timestamps: true },
);

const UnitSchema = new Schema(
  {
    unit_number: String,
    property_id: { type: Types.ObjectId, ref: "Property", index: true },
  },
  { timestamps: true },
);

const TenancySchema = new Schema(
  {
    unit_id: { type: Types.ObjectId, ref: "Unit" },
    tenant_user_id: { type: Types.ObjectId, ref: "User" },
    start_date: Date,
    end_date: Date,
  },
  { timestamps: true },
);

const WorkOrderSchema = new Schema(
  {
    title: String,
    description: String,
    priority: { type: String, enum: ["P1", "P2", "P3"], index: true },
    status: { type: String, enum: Object.values(WOStatus), index: true },
    unit_id: { type: Types.ObjectId, ref: "Unit" },
    property_id: { type: Types.ObjectId, ref: "Property", index: true },
    created_by_user_id: { type: Types.ObjectId, ref: "User" },
    technician_user_id: { type: Types.ObjectId, ref: "User" },
    org_id: { type: Types.ObjectId, ref: "Organization", index: true },
    chargeable: Boolean,
    estimated_cost: Number,
    actual_cost: Number,
  },
  { timestamps: true },
);

const AttachmentSchema = new Schema(
  {
    work_order_id: { type: Types.ObjectId, ref: "WorkOrder", index: true },
    file_url: String,
    role: { type: String, enum: ["BEFORE", "DURING", "AFTER", "QUOTE"] },
    org_id: { type: Types.ObjectId, ref: "Organization", index: true },
  },
  { timestamps: true },
);

const QuotationSchema = new Schema(
  {
    work_order_id: { type: Types.ObjectId, ref: "WorkOrder", index: true },
    amount: Number,
    status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"] },
    approved_by_user_id: { type: Types.ObjectId, ref: "User" },
    org_id: { type: Types.ObjectId, ref: "Organization", index: true },
    line_items: [
      {
        description: String,
        qty: Number,
        price: Number,
        source: { type: String, enum: ["MARKETPLACE", "CUSTOM"] },
      },
    ],
  },
  { timestamps: true },
);

const ApprovalSchema = new Schema(
  {
    quotation_id: { type: Types.ObjectId, ref: "Quotation", index: true },
    approver_user_id: { type: Types.ObjectId, ref: "User" },
    decision: {
      type: String,
      enum: ["APPROVED", "REJECTED", "CHANGES_REQUESTED"],
    },
    comments: String,
    org_id: { type: Types.ObjectId, ref: "Organization", index: true },
  },
  { timestamps: true },
);

const FinancialTxnSchema = new Schema(
  {
    amount: Number,
    type: {
      type: String,
      enum: ["INVOICE", "PAYMENT", "EXPENSE", "SUBSCRIPTION_FEE"],
    },
    description: String,
    property_id: { type: Types.ObjectId, ref: "Property", index: true },
    work_order_id: { type: Types.ObjectId, ref: "WorkOrder", index: true },
    org_id: { type: Types.ObjectId, ref: "Organization", index: true },
    status: { type: String, enum: ["OPEN", "PAID", "VOID"] },
  },
  { timestamps: true },
);

const PMPlanSchema = new Schema(
  {
    name: String,
    frequency: {
      type: String,
      enum: ["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"],
    },
    asset_ids: [{ type: Types.ObjectId }],
    checklist: [String],
    next_run_at: Date,
    responsible_team: [String],
    org_id: { type: Types.ObjectId, ref: "Organization", index: true },
  },
  { timestamps: true },
);

const InspectionSchema = new Schema(
  {
    property_id: { type: Types.ObjectId, ref: "Property" },
    unit_id: { type: Types.ObjectId, ref: "Unit" },
    type: String,
    checklist: [{ item: String, severity: String, ok: Boolean }],
    assignee_user_id: { type: Types.ObjectId, ref: "User" },
    signoff: { by: { type: Types.ObjectId, ref: "User" }, at: Date },
    org_id: { type: Types.ObjectId, ref: "Organization", index: true },
  },
  { timestamps: true },
);

const DocumentSchema = new Schema(
  {
    title: String,
    doc_type: String,
    version: String,
    effective: Date,
    expiry: Date,
    tags: [String],
    linked: [{ entity: String, id: Types.ObjectId }],
    org_id: { type: Types.ObjectId, ref: "Organization", index: true },
  },
  { timestamps: true },
);

export const FMOrganization =
  mongoose.models.FMOrganization ??
  mongoose.model("FMOrganization", OrganizationSchema);
export const FMUser =
  mongoose.models.FMUser ?? mongoose.model("FMUser", UserSchema);
export const FMProperty =
  mongoose.models.FMProperty ?? mongoose.model("FMProperty", PropertySchema);
export const FMUnit =
  mongoose.models.FMUnit ?? mongoose.model("FMUnit", UnitSchema);
export const FMTenancy =
  mongoose.models.FMTenancy ?? mongoose.model("FMTenancy", TenancySchema);
export const FMWorkOrder =
  mongoose.models.FMWorkOrder ?? mongoose.model("FMWorkOrder", WorkOrderSchema);
export const FMAttachment =
  mongoose.models.FMAttachment ??
  mongoose.model("FMAttachment", AttachmentSchema);
export const FMQuotation =
  mongoose.models.FMQuotation ?? mongoose.model("FMQuotation", QuotationSchema);
export const FMApproval =
  mongoose.models.FMApproval ?? mongoose.model("FMApproval", ApprovalSchema);
export const FMFinancialTxn =
  mongoose.models.FMFinancialTxn ??
  mongoose.model("FMFinancialTxn", FinancialTxnSchema);
export const FMPMPlan =
  mongoose.models.FMPMPlan ?? mongoose.model("FMPMPlan", PMPlanSchema);
export const FMInspection =
  mongoose.models.FMInspection ??
  mongoose.model("FMInspection", InspectionSchema);
export const FMDocument =
  mongoose.models.FMDocument ?? mongoose.model("FMDocument", DocumentSchema);

/* =========================
 * 9) Seeds & Smoke Tests
 * ========================= */

export const DEFAULT_APPROVALS = APPROVAL_POLICIES;
export const DEFAULT_SLA = SLA;

/**
 * Smoke test utility for basic RBAC and FSM checks.
 * Intended for development and maintenance validation, not for production use.
 */
export function smokeTests() {
  const tenantCtx: ResourceCtx = {
    orgId: "o1",
    plan: Plan.STANDARD,
    role: Role.TENANT,
    userId: "u1",
    isOrgMember: true,
    requesterUserId: "u1",
  };
  console.assert(
    can(SubmoduleKey.WO_CREATE, "create", tenantCtx) === true,
    "Tenant can create WO for own unit",
  );
  console.assert(
    !can(SubmoduleKey.WO_TRACK_ASSIGN, "approve", tenantCtx),
    "Tenant cannot approve quotes",
  );

  const techCtx: ResourceCtx = {
    orgId: "o1",
    plan: Plan.PRO,
    role: Role.TECHNICIAN,
    userId: "u2",
    isOrgMember: true,
    isTechnicianAssigned: true,
  };
  console.assert(
    can(SubmoduleKey.WO_TRACK_ASSIGN, "submit_estimate", techCtx),
    "Tech can submit estimate when assigned",
  );
}

/* =========================
 * 10) Helper: FSM guard example
 * ========================= */

/**
 * Check if required media attachments exist in the work order context
 */
export function hasRequiredMedia(
  ctx: ResourceCtx,
  mediaType: "BEFORE" | "AFTER",
): boolean {
  if (!ctx.uploadedMedia || ctx.uploadedMedia.length === 0) {
    return false;
  }
  return ctx.uploadedMedia.includes(mediaType);
}

/**
 * Validate FSM state transition with media and guard checks.
 * Looks up the transition in WORK_ORDER_FSM and validates it against context.
 * @param from - Starting status
 * @param to - Target status
 * @param actorRole - Role attempting the transition
 * @param ctx - Resource context with media and assignment info
 * @returns true if transition is valid and all guards pass
 */
export function canTransition(
  from: WOStatus,
  to: WOStatus,
  actorRole: Role,
  ctx: ResourceCtx,
): boolean {
  // Find the transition definition
  const transition = WORK_ORDER_FSM.transitions.find(
    (t) =>
      t.from === from && t.to === to && (t.by as Role[]).includes(actorRole),
  );

  if (!transition) return false;

  // Check required media attachments
  if (
    transition.requireMedia?.includes("BEFORE") &&
    !hasRequiredMedia(ctx, "BEFORE")
  )
    return false;
  if (
    transition.requireMedia?.includes("AFTER") &&
    !hasRequiredMedia(ctx, "AFTER")
  )
    return false;

  // Check guard condition for technician assignment
  if (transition.guard === "technicianAssigned" && !ctx.isTechnicianAssigned)
    return false;

  // Enforce RBAC for transition-specific actions
  if (transition.action) {
    if (!can(SubmoduleKey.WO_TRACK_ASSIGN, transition.action, ctx))
      return false;
  }

  return true;
}
