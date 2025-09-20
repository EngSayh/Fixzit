// Centralized status constants to ensure consistency across the application

export const WORK_ORDER_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ON_HOLD: 'on_hold'
} as const;

export const SUPPORT_TICKET_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  WAITING_CUSTOMER: 'waiting_customer',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
} as const;

export const COMPLIANCE_DOC_STATUS = {
  VALID: 'valid',
  EXPIRING: 'expiring',
  EXPIRED: 'expired',
  PENDING: 'pending'
} as const;

export const VIOLATION_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
  OVERDUE: 'overdue'
} as const;

export const MAINTENANCE_STATUS = {
  SCHEDULED: 'scheduled',
  OVERDUE: 'overdue',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  SKIPPED: 'skipped'
} as const;

export const IOT_DEVICE_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  MAINTENANCE: 'maintenance'
} as const;

export const SENSOR_STATUS = {
  NORMAL: 'normal',
  WARNING: 'warning',
  CRITICAL: 'critical',
  OFFLINE: 'offline'
} as const;

export const WORKFLOW_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived'
} as const;

export const WORKFLOW_INSTANCE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  TIMEOUT: 'timeout'
} as const;

// Type exports
export type WorkOrderStatus = typeof WORK_ORDER_STATUS[keyof typeof WORK_ORDER_STATUS];
export type SupportTicketStatus = typeof SUPPORT_TICKET_STATUS[keyof typeof SUPPORT_TICKET_STATUS];
export type ComplianceDocStatus = typeof COMPLIANCE_DOC_STATUS[keyof typeof COMPLIANCE_DOC_STATUS];
export type ViolationStatus = typeof VIOLATION_STATUS[keyof typeof VIOLATION_STATUS];
export type MaintenanceStatus = typeof MAINTENANCE_STATUS[keyof typeof MAINTENANCE_STATUS];
export type IoTDeviceStatus = typeof IOT_DEVICE_STATUS[keyof typeof IOT_DEVICE_STATUS];
export type SensorStatus = typeof SENSOR_STATUS[keyof typeof SENSOR_STATUS];
export type WorkflowStatus = typeof WORKFLOW_STATUS[keyof typeof WORKFLOW_STATUS];
export type WorkflowInstanceStatus = typeof WORKFLOW_INSTANCE_STATUS[keyof typeof WORKFLOW_INSTANCE_STATUS];