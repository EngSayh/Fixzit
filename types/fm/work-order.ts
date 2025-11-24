import type { ObjectId } from "mongodb";

/**
 * FM Module - Unified Work Order Types
 *
 * Single source of truth for all Work Order related types across:
 * - Frontend UI components
 * - Backend API handlers
 * - Database models
 * - Domain logic
 *
 * Consolidates types from:
 * - types/work-orders.ts
 * - lib/models/index.ts
 * - domain/fm/fm.behavior.ts
 */

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Work Order Status - 11-state FSM (from domain/fm/fm.behavior.ts)
 * Represents complete lifecycle from creation to closure
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
 * Maps to SLA definitions in domain model
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
// UI/FRONTEND TYPES (from types/work-orders.ts)
// =============================================================================

/**
 * Work Order Status for UI components (lowercase variants)
 * Maps to WOStatus enum but uses lowercase for backward compatibility
 */
export type WorkOrderStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "open"
  | "assigned"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled"
  | "closed";

/**
 * Work Order Priority for UI components
 */
export type WorkOrderPriority =
  | "low"
  | "medium"
  | "high"
  | "urgent"
  | "emergency";

/**
 * Work Order Category for UI components
 */
export type WorkOrderCategory =
  | "general"
  | "maintenance"
  | "plumbing"
  | "electrical"
  | "hvac"
  | "cleaning"
  | "security"
  | "landscaping"
  | "inspection"
  | "it"
  | "other";

/**
 * User associated with work order (minimal)
 */
export interface WorkOrderUser {
  id: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role?: string;
  email?: string;
  phone?: string;
}

/**
 * Work Order Photo attachment
 */
export interface WorkOrderPhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  type?: "before" | "after" | "attachment";
  caption?: string;
  uploadedAt?: string;
}

/**
 * Work Order Comment
 */
export interface WorkOrderComment {
  id: string;
  workOrderId: string;
  comment: string;
  type: "comment" | "internal";
  createdAt: string;
  user?: WorkOrderUser;
}

/**
 * Work Order Timeline Event
 */
export interface WorkOrderTimeline {
  id: string;
  workOrderId: string;
  action:
    | "created"
    | "assigned"
    | "status_changed"
    | "comment_added"
    | "photo_uploaded"
    | "priority_changed"
    | "completed"
    | "closed"
    | "reopened"
    | "updated"
    | string;
  description?: string;
  performedAt: string;
  user?: WorkOrderUser;
  metadata?: Record<string, unknown>;
}

/**
 * Property reference in work order
 */
export interface WorkOrderProperty {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Unit reference in work order
 */
export interface WorkOrderUnit {
  id: string;
  unitNumber?: string;
  floor?: string | number;
  property?: string;
}

// =============================================================================
// CORE WORK ORDER INTERFACE
// =============================================================================

/**
 * Complete Work Order interface
 * Combines UI and backend fields
 */
export interface WorkOrder {
  // IDs
  id: string;
  _id?: string | ObjectId; // MongoDB compatibility
  tenantId: string;
  orgId?: string; // Frontend org context

  // Identifiers
  workOrderNumber?: string;
  woNumber?: string;
  code?: string;

  // Core fields
  title: string;
  description: string;
  status: WOStatus | WorkOrderStatus; // Support both enum and string
  priority: WOPriority | WorkOrderPriority;
  category?: WOCategory | WorkOrderCategory;

  // Relationships
  propertyId?: string;
  property?: WorkOrderProperty;
  unitId?: string;
  unit?: WorkOrderUnit;

  // Assignment
  requesterId?: string;
  requester?: WorkOrderUser;
  assigneeId?: string;
  assignee?: WorkOrderUser;
  technicianId?: string;
  technician?: WorkOrderUser;

  // Dates/Times
  scheduledAt?: Date | string;
  scheduledDate?: string;
  startedAt?: Date | string;
  completedAt?: Date | string;
  dueDate?: string;
  createdAt: Date | string;
  updatedAt: Date | string;

  // SLA
  slaHours?: number;

  // Financial
  estimatedCost?: number;
  actualCost?: number;
  currency?: string;

  // Attachments
  photos?: WorkOrderPhoto[];
  attachments?: string[];

  // Activity
  comments?: WorkOrderComment[];
  timeline?: WorkOrderTimeline[];

  // Additional metadata
  location?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// =============================================================================
// FORM & UI HELPER TYPES
// =============================================================================

/**
 * Work Order Form Data (for create/edit forms)
 */
export interface WorkOrderFormData {
  title: string;
  description: string;
  category: WorkOrderCategory;
  priority: WorkOrderPriority;
  propertyId: string;
  unitId?: string;
  scheduledDate?: string;
  assigneeId?: string;
  estimatedCost?: number;
  attachments?: string[];
}

/**
 * Work Order Filters (for list views)
 */
export interface WorkOrderFilters {
  status?: WorkOrderStatus[];
  priority?: WorkOrderPriority[];
  category?: WorkOrderCategory[];
  propertyId?: string;
  assigneeId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

/**
 * Work Order Statistics (for dashboards)
 */
export interface WorkOrderStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  avgCompletionTime: number;
  slaCompliance: number;
  overdueCount: number;
}

// =============================================================================
// TYPE GUARDS & UTILITIES
// =============================================================================

/**
 * Check if status is a final state
 */
export function isFinalStatus(status: WOStatus | WorkOrderStatus): boolean {
  const finalStates: (WOStatus | WorkOrderStatus)[] = [
    WOStatus.CLOSED,
    "closed",
    "cancelled",
    "completed",
  ];
  return finalStates.includes(status as WOStatus | WorkOrderStatus);
}

/**
 * Convert UI status to enum status
 */
export function toEnumStatus(status: WorkOrderStatus): WOStatus {
  const mapping: Record<WorkOrderStatus, WOStatus> = {
    draft: WOStatus.NEW,
    submitted: WOStatus.NEW,
    approved: WOStatus.APPROVED,
    open: WOStatus.ASSESSMENT,
    assigned: WOStatus.ASSESSMENT,
    in_progress: WOStatus.IN_PROGRESS,
    on_hold: WOStatus.ASSESSMENT,
    completed: WOStatus.WORK_COMPLETE,
    cancelled: WOStatus.CLOSED,
    closed: WOStatus.CLOSED,
  };
  return mapping[status] || WOStatus.NEW;
}

/**
 * Convert enum status to UI status
 */
export function toUIStatus(status: WOStatus): WorkOrderStatus {
  const mapping: Record<WOStatus, WorkOrderStatus> = {
    [WOStatus.NEW]: "draft",
    [WOStatus.ASSESSMENT]: "open",
    [WOStatus.ESTIMATE_PENDING]: "open",
    [WOStatus.QUOTATION_REVIEW]: "open",
    [WOStatus.PENDING_APPROVAL]: "submitted",
    [WOStatus.APPROVED]: "approved",
    [WOStatus.IN_PROGRESS]: "in_progress",
    [WOStatus.WORK_COMPLETE]: "completed",
    [WOStatus.QUALITY_CHECK]: "completed",
    [WOStatus.FINANCIAL_POSTING]: "completed",
    [WOStatus.CLOSED]: "closed",
  };
  return mapping[status] || "draft";
}

/**
 * Convert UI priority to enum priority
 */
export function toEnumPriority(priority: WorkOrderPriority): WOPriority {
  const mapping: Record<WorkOrderPriority, WOPriority> = {
    low: WOPriority.LOW,
    medium: WOPriority.MEDIUM,
    high: WOPriority.HIGH,
    urgent: WOPriority.CRITICAL,
    emergency: WOPriority.CRITICAL,
  };
  return mapping[priority] || WOPriority.MEDIUM;
}

/**
 * Convert enum priority to UI priority
 */
export function toUIPriority(priority: WOPriority): WorkOrderPriority {
  const mapping: Record<WOPriority, WorkOrderPriority> = {
    [WOPriority.LOW]: "low",
    [WOPriority.MEDIUM]: "medium",
    [WOPriority.HIGH]: "high",
    [WOPriority.CRITICAL]: "urgent",
  };
  return mapping[priority] || "medium";
}
