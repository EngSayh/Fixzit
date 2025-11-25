/* domain/fm/fm.behavior.ts
 * Fixzit Facility Management: unified behaviors for Cursor + Mongo (Mongoose)
 * Covers: enums/types, plan gates, role→module→action matrix, ABAC guards,
 * WO state machine, approvals DSL, SLAs, notifications/deep links,
 * Mongoose schemas, seeds, and smoke tests.
 */

import mongoose, { Schema, Types } from "mongoose";

/* =========================
 * 1) Enums & Constants
 * ========================= */

export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  CORPORATE_ADMIN = "CORPORATE_ADMIN",
  MANAGEMENT = "MANAGEMENT",
  FINANCE = "FINANCE",
  HR = "HR",
  EMPLOYEE = "EMPLOYEE", // corporate employee (dispatcher/coordinator)
  PROPERTY_OWNER = "PROPERTY_OWNER",
  OWNER_DEPUTY = "OWNER_DEPUTY",
  TECHNICIAN = "TECHNICIAN",
  TENANT = "TENANT",
  VENDOR = "VENDOR",
  GUEST = "GUEST",
}

export enum Plan {
  STARTER = "STARTER",
  STANDARD = "STANDARD",
  PRO = "PRO",
  ENTERPRISE = "ENTERPRISE",
}

/** FM modules + submodules (matches Governance V5/V6 tabs) */
export enum ModuleKey {
  WORK_ORDERS = "WORK_ORDERS",
  PROPERTIES = "PROPERTIES",
  HR = "HR",
  FINANCE = "FINANCE",
  MARKETPLACE = "MARKETPLACE",
  SUPPORT = "SUPPORT",
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
 * 2) Role → Module access
 * ========================= */

export const ROLE_MODULE_ACCESS: Record<
  Role,
  Partial<Record<ModuleKey, boolean>>
> = {
  [Role.SUPER_ADMIN]: {
    WORK_ORDERS: true,
    PROPERTIES: true,
    HR: true,
    FINANCE: true,
    MARKETPLACE: true,
    SUPPORT: true,
  },
  [Role.CORPORATE_ADMIN]: {
    WORK_ORDERS: true,
    PROPERTIES: true,
    HR: true,
    FINANCE: true,
    MARKETPLACE: true,
    SUPPORT: true,
  },
  [Role.MANAGEMENT]: {
    WORK_ORDERS: true,
    PROPERTIES: true,
    FINANCE: true,
    SUPPORT: true,
  },
  [Role.FINANCE]: {
    WORK_ORDERS: true,
    PROPERTIES: true,
    FINANCE: true,
  },
  [Role.HR]: {
    WORK_ORDERS: true,
    HR: true,
  },
  [Role.EMPLOYEE]: {
    WORK_ORDERS: true,
    PROPERTIES: true,
    SUPPORT: true,
  },
  [Role.PROPERTY_OWNER]: {
    WORK_ORDERS: true,
    PROPERTIES: true,
    FINANCE: true,
    SUPPORT: true,
  },
  [Role.OWNER_DEPUTY]: {
    WORK_ORDERS: true,
    PROPERTIES: true,
    SUPPORT: true,
  },
  [Role.TECHNICIAN]: {
    WORK_ORDERS: true,
    SUPPORT: true,
  },
  [Role.TENANT]: {
    WORK_ORDERS: true,
    PROPERTIES: true,
    MARKETPLACE: true,
    SUPPORT: true,
  },
  [Role.VENDOR]: {
    WORK_ORDERS: true,
    MARKETPLACE: true,
    SUPPORT: true,
  },
  [Role.GUEST]: { SUPPORT: true },
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
    ],
    WO_PM: ["view", "create", "update", "export"],
    WO_SERVICE_HISTORY: ["view", "export"],
    PROP_LIST: ["view", "create", "update", "delete", "export"],
    PROP_UNITS_TENANTS: ["view", "update", "export"],
    PROP_LEASES: ["view", "create", "update", "export"],
    PROP_INSPECTIONS: ["view", "create", "update", "export"],
    PROP_DOCUMENTS: ["view", "create", "update", "export"],
  },
  [Role.CORPORATE_ADMIN]: {
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
  [Role.MANAGEMENT]: {
    WO_CREATE: ["view", "comment"],
    WO_TRACK_ASSIGN: [
      "view",
      "update",
      "export",
      "share",
      "approve",
      "reject",
      "request_changes",
    ],
    WO_PM: ["view", "export"],
    WO_SERVICE_HISTORY: ["view", "export"],
    PROP_LIST: ["view", "export"],
    PROP_UNITS_TENANTS: ["view", "export"],
    PROP_LEASES: ["view", "export"],
    PROP_INSPECTIONS: ["view", "export"],
    PROP_DOCUMENTS: ["view", "export"],
  },
  [Role.FINANCE]: {
    WO_CREATE: ["view", "comment"],
    WO_TRACK_ASSIGN: ["view", "approve", "reject", "request_changes", "export"],
    WO_PM: ["view"],
    WO_SERVICE_HISTORY: ["view", "export"],
    PROP_LIST: ["view", "export"],
    PROP_UNITS_TENANTS: ["view", "export"],
    PROP_LEASES: ["view", "export"],
    PROP_INSPECTIONS: ["view"],
    PROP_DOCUMENTS: ["view", "export"],
  },
  [Role.HR]: {
    WO_CREATE: ["view", "comment"],
    WO_TRACK_ASSIGN: ["view", "schedule", "dispatch", "update", "export"],
    WO_PM: ["view"],
    WO_SERVICE_HISTORY: ["view"],
  },
  [Role.EMPLOYEE]: {
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: ["view", "assign", "update", "export", "post_finance"],
    WO_PM: ["view", "create", "update", "export"],
  },
  [Role.PROPERTY_OWNER]: {
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
  [Role.OWNER_DEPUTY]: {
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: ["view", "approve", "reject", "request_changes", "export"],
    WO_PM: ["view"],
    WO_SERVICE_HISTORY: ["view"],
    PROP_LIST: ["view", "update"],
    PROP_UNITS_TENANTS: ["view", "update"],
    PROP_INSPECTIONS: ["view", "create", "update"],
    PROP_DOCUMENTS: ["view", "create", "update"],
  },
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
  [Role.TENANT]: {
    WO_CREATE: ["view", "create", "upload_media", "comment"],
    WO_TRACK_ASSIGN: ["view", "comment"],
    WO_PM: ["view"],
    WO_SERVICE_HISTORY: ["view"],
    PROP_LIST: ["view"],
    PROP_UNITS_TENANTS: ["view"],
  },
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
  if (!ctx.isOrgMember && ctx.role !== Role.SUPER_ADMIN) return false;

  if (ctx.role === Role.TENANT && action !== "create") {
    // Tenants can only access their own work orders - enforce strict ownership
    return ctx.requesterUserId === ctx.userId;
  }

  // Property owners/deputies must own the property being accessed
  if (ctx.role === Role.PROPERTY_OWNER || ctx.role === Role.OWNER_DEPUTY) {
    if (ctx.propertyId && !(ctx.isOwnerOfProperty || ctx.isSuperAdmin)) {
      return false;
    }
  }

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
