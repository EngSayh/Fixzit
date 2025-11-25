/**
 * FM Module - Unified Enums
 *
 * Single source of truth for all FM-related enumerations
 * Consolidates enums from domain/fm/fm.behavior.ts and other sources
 */

// =============================================================================
// RBAC - ROLES
// =============================================================================

/**
 * FM System Roles (from domain/fm/fm.behavior.ts)
 * Defines all user roles in the FM system with hierarchical access
 */
export enum FMRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  CORPORATE_ADMIN = "CORPORATE_ADMIN",
  PROPERTY_OWNER = "PROPERTY_OWNER",
  OWNER_DEPUTY = "OWNER_DEPUTY",
  MANAGEMENT = "MANAGEMENT",
  EMPLOYEE = "EMPLOYEE",
  FINANCE = "FINANCE",
  HR = "HR",
  TECHNICIAN = "TECHNICIAN",
  TENANT = "TENANT",
  VENDOR = "VENDOR",
  GUEST = "GUEST",
}

// =============================================================================
// SUBSCRIPTION PLANS
// =============================================================================

/**
 * Subscription Plans with feature limits
 */
export enum SubscriptionPlan {
  FREE = "FREE",
  PRO = "PRO",
  ENTERPRISE = "ENTERPRISE",
  CUSTOM = "CUSTOM",
}

// =============================================================================
// FM MODULES
// =============================================================================

/**
 * FM Module Identifiers (for permissions and navigation)
 */
export enum FMModule {
  WORK_ORDERS = "work_orders",
  VENDORS = "vendors",
  TENANTS = "tenants",
  PROPERTIES = "properties",
  FINANCE = "finance",
  SYSTEM = "system",
  SUPPORT = "support",
  ADMINISTRATION = "administration",
  DASHBOARD = "dashboard",
  REPORTS = "reports",
  ASSETS = "assets",
  MAINTENANCE = "maintenance",
  COMPLIANCE = "compliance",
}

// =============================================================================
// RBAC - ACTIONS
// =============================================================================

/**
 * FM System Actions for permission checks
 */
export enum FMAction {
  // Read operations
  VIEW = "view",
  VIEW_OWN = "view_own",
  VIEW_ALL = "view_all",

  // Write operations
  CREATE = "create",
  UPDATE = "update",
  UPDATE_OWN = "update_own",
  DELETE = "delete",
  DELETE_OWN = "delete_own",

  // Work Order specific
  ASSIGN = "assign",
  REASSIGN = "reassign",
  START_WORK = "start_work",
  COMPLETE_WORK = "complete_work",

  // Approval workflow
  REQUEST_APPROVAL = "request_approval",
  APPROVE = "approve",
  REJECT = "reject",

  // Financial
  ATTACH_QUOTE = "attach_quote",
  POST_FINANCE = "post_finance",
  VIEW_COST = "view_cost",

  // Special
  DELEGATE = "delegate",
  ESCALATE = "escalate",
  BULK_ASSIGN = "bulk_assign",
  EXPORT = "export",

  // Admin
  MANAGE_ROLES = "manage_roles",
  MANAGE_USERS = "manage_users",
  CONFIGURE = "configure",
}

// =============================================================================
// WORK ORDER ENUMS
// =============================================================================

/**
 * Work Order Status - 11-state FSM
 * @see types/fm/work-order.ts for complete type definitions
 */
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

/**
 * Work Order Priority levels
 */
export enum WOPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

/**
 * Work Order Categories
 */
export enum WOCategory {
  GENERAL = "GENERAL",
  MAINTENANCE = "MAINTENANCE",
  PLUMBING = "PLUMBING",
  ELECTRICAL = "ELECTRICAL",
  HVAC = "HVAC",
  CLEANING = "CLEANING",
  SECURITY = "SECURITY",
  LANDSCAPING = "LANDSCAPING",
  INSPECTION = "INSPECTION",
  IT = "IT",
  OTHER = "OTHER",
}

// =============================================================================
// PROPERTY & UNIT ENUMS
// =============================================================================

/**
 * Property Types
 */
export enum PropertyType {
  RESIDENTIAL = "RESIDENTIAL",
  COMMERCIAL = "COMMERCIAL",
  MIXED_USE = "MIXED_USE",
  INDUSTRIAL = "INDUSTRIAL",
}

/**
 * Property Status
 */
export enum PropertyStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  UNDER_MAINTENANCE = "UNDER_MAINTENANCE",
  SOLD = "SOLD",
}

/**
 * Unit Status
 */
export enum UnitStatus {
  VACANT = "VACANT",
  OCCUPIED = "OCCUPIED",
  RESERVED = "RESERVED",
  UNDER_MAINTENANCE = "UNDER_MAINTENANCE",
}

// =============================================================================
// TENANT ENUMS
// =============================================================================

/**
 * Tenancy Status
 */
export enum TenancyStatus {
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  PENDING = "PENDING",
  TERMINATED = "TERMINATED",
}

/**
 * Tenant Type
 */
export enum TenantType {
  INDIVIDUAL = "INDIVIDUAL",
  CORPORATE = "CORPORATE",
  GOVERNMENT = "GOVERNMENT",
}

// =============================================================================
// VENDOR ENUMS
// =============================================================================

/**
 * Vendor Status
 */
export enum VendorStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  BLACKLISTED = "BLACKLISTED",
  PENDING_APPROVAL = "PENDING_APPROVAL",
}

/**
 * Vendor Type
 */
export enum VendorType {
  CONTRACTOR = "CONTRACTOR",
  SUPPLIER = "SUPPLIER",
  SERVICE_PROVIDER = "SERVICE_PROVIDER",
  CONSULTANT = "CONSULTANT",
}

// =============================================================================
// FINANCE ENUMS
// =============================================================================

/**
 * Invoice Status
 */
export enum InvoiceStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
}

/**
 * Payment Status
 */
export enum PaymentStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

/**
 * Payment Method
 */
export enum PaymentMethod {
  CASH = "CASH",
  BANK_TRANSFER = "BANK_TRANSFER",
  CREDIT_CARD = "CREDIT_CARD",
  CHECK = "CHECK",
}

/**
 * Expense Category
 */
export enum ExpenseCategory {
  MAINTENANCE_REPAIR = "MAINTENANCE_REPAIR",
  UTILITIES = "UTILITIES",
  PAYROLL = "PAYROLL",
  SUPPLIES = "SUPPLIES",
  INSURANCE = "INSURANCE",
  TAXES = "TAXES",
  PROFESSIONAL_FEES = "PROFESSIONAL_FEES",
  OTHER = "OTHER",
}

// =============================================================================
// NOTIFICATION ENUMS
// =============================================================================

/**
 * Notification Type
 */
export enum NotificationType {
  WORK_ORDER_CREATED = "WORK_ORDER_CREATED",
  WORK_ORDER_ASSIGNED = "WORK_ORDER_ASSIGNED",
  WORK_ORDER_UPDATED = "WORK_ORDER_UPDATED",
  WORK_ORDER_COMPLETED = "WORK_ORDER_COMPLETED",
  APPROVAL_REQUESTED = "APPROVAL_REQUESTED",
  APPROVAL_APPROVED = "APPROVAL_APPROVED",
  APPROVAL_REJECTED = "APPROVAL_REJECTED",
  PAYMENT_DUE = "PAYMENT_DUE",
  PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
  SLA_BREACH = "SLA_BREACH",
  SYSTEM_ALERT = "SYSTEM_ALERT",
}

/**
 * Notification Channel
 */
export enum NotificationChannel {
  PUSH = "PUSH",
  EMAIL = "EMAIL",
  SMS = "SMS",
  WHATSAPP = "WHATSAPP",
  IN_APP = "IN_APP",
}

/**
 * Notification Priority
 */
export enum NotificationPriority {
  LOW = "LOW",
  NORMAL = "NORMAL",
  HIGH = "HIGH",
  URGENT = "URGENT",
}

// =============================================================================
// ASSET ENUMS
// =============================================================================

/**
 * Asset Status
 */
export enum AssetStatus {
  OPERATIONAL = "OPERATIONAL",
  UNDER_MAINTENANCE = "UNDER_MAINTENANCE",
  OUT_OF_SERVICE = "OUT_OF_SERVICE",
  RETIRED = "RETIRED",
}

/**
 * Asset Type
 */
export enum AssetType {
  EQUIPMENT = "EQUIPMENT",
  FIXTURE = "FIXTURE",
  FURNITURE = "FURNITURE",
  VEHICLE = "VEHICLE",
  TECHNOLOGY = "TECHNOLOGY",
  OTHER = "OTHER",
}

// =============================================================================
// MAINTENANCE ENUMS
// =============================================================================

/**
 * Maintenance Type
 */
export enum MaintenanceType {
  PREVENTIVE = "PREVENTIVE",
  CORRECTIVE = "CORRECTIVE",
  PREDICTIVE = "PREDICTIVE",
  EMERGENCY = "EMERGENCY",
}

/**
 * Maintenance Frequency
 */
export enum MaintenanceFrequency {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  SEMI_ANNUAL = "SEMI_ANNUAL",
  ANNUAL = "ANNUAL",
}

// =============================================================================
// REPORT ENUMS
// =============================================================================

/**
 * Report Type
 */
export enum ReportType {
  WORK_ORDERS = "WORK_ORDERS",
  FINANCE = "FINANCE",
  ASSETS = "ASSETS",
  COMPLIANCE = "COMPLIANCE",
  OCCUPANCY = "OCCUPANCY",
  MAINTENANCE = "MAINTENANCE",
  CUSTOM = "CUSTOM",
}

/**
 * Report Format
 */
export enum ReportFormat {
  PDF = "PDF",
  EXCEL = "EXCEL",
  CSV = "CSV",
  JSON = "JSON",
}

/**
 * Report Frequency
 */
export enum ReportFrequency {
  DAILY = "DAILY",
  WEEKLY = "WEEKLY",
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  ANNUAL = "ANNUAL",
  ON_DEMAND = "ON_DEMAND",
}
