/**
 * @fileoverview Shared Work Order Types for Mobile
 * @module mobile/shared-types/work-order
 */

/**
 * Work order priority levels
 */
export type WorkOrderPriority = "EMERGENCY" | "HIGH" | "MEDIUM" | "LOW";

/**
 * Work order status values
 */
export type WorkOrderStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "DISPATCHED"
  | "IN_PROGRESS"
  | "ON_HOLD"
  | "COMPLETED"
  | "VERIFIED"
  | "CLOSED"
  | "CANCELLED";

/**
 * Work order category
 */
export type WorkOrderCategory =
  | "PLUMBING"
  | "ELECTRICAL"
  | "HVAC"
  | "STRUCTURAL"
  | "PAINTING"
  | "CLEANING"
  | "LANDSCAPING"
  | "PEST_CONTROL"
  | "SECURITY"
  | "FIRE_SAFETY"
  | "ELEVATOR"
  | "GENERAL"
  | "OTHER";

/**
 * Work order summary (for list views)
 */
export interface WorkOrderSummary {
  id: string;
  workOrderNumber: string;
  title: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  category: WorkOrderCategory;
  propertyName?: string;
  unitNumber?: string;
  scheduledAt?: string;
  dueAt?: string;
  createdAt: string;
  hasPhotos?: boolean;
  photoCount?: number;
}

/**
 * Work order detail
 */
export interface WorkOrderDetail extends WorkOrderSummary {
  description?: string;
  assignedTo?: {
    id: string;
    name: string;
    phone?: string;
    avatar?: string;
  };
  requester?: {
    id: string;
    name: string;
    phone?: string;
    email?: string;
  };
  property?: {
    id: string;
    name: string;
    address: string;
    city?: string;
  };
  checklists?: WorkOrderChecklist[];
  photos?: WorkOrderPhoto[];
  comments?: WorkOrderComment[];
  timeline?: WorkOrderTimelineEntry[];
  slaHours?: number;
  estimatedCost?: number;
  actualCost?: number;
  currency?: string;
  startedAt?: string;
  completedAt?: string;
  verifiedAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Work order checklist
 */
export interface WorkOrderChecklist {
  id: string;
  title: string;
  items: WorkOrderChecklistItem[];
}

/**
 * Checklist item
 */
export interface WorkOrderChecklistItem {
  id: string;
  label: string;
  done: boolean;
  completedAt?: string;
  completedBy?: string;
}

/**
 * Work order photo
 */
export interface WorkOrderPhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  type: "before" | "after" | "attachment";
  caption?: string;
  uploadedAt: string;
  geoLocation?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Work order comment
 */
export interface WorkOrderComment {
  id: string;
  comment: string;
  type: "comment" | "internal";
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
}

/**
 * Timeline entry
 */
export interface WorkOrderTimelineEntry {
  id: string;
  action: string;
  description?: string;
  performedBy?: string;
  performedAt: string;
  metadata?: Record<string, unknown>;
}

/**
 * Status transition
 */
export interface StatusTransition {
  from: WorkOrderStatus;
  to: WorkOrderStatus;
  allowed: boolean;
  requiresBefore?: boolean;
  requiresAfter?: boolean;
  requiresNote?: boolean;
}

/**
 * Create work order request
 */
export interface CreateWorkOrderRequest {
  title: string;
  description?: string;
  priority?: WorkOrderPriority;
  category: WorkOrderCategory;
  propertyId?: string;
  unitNumber?: string;
  scheduledAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Update work order status request
 */
export interface UpdateStatusRequest {
  status: WorkOrderStatus;
  note?: string;
}

/**
 * Work order list filters
 */
export interface WorkOrderFilters {
  status?: WorkOrderStatus | WorkOrderStatus[];
  priority?: WorkOrderPriority | WorkOrderPriority[];
  category?: WorkOrderCategory | WorkOrderCategory[];
  assignedTo?: string;
  propertyId?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

/**
 * Paginated work order response
 */
export interface WorkOrderListResponse {
  items: WorkOrderSummary[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
