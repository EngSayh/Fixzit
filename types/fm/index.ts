/**
 * FM Module Types - Main Export
 *
 * Central export point for all FM-related types, interfaces, and enums
 *
 * Usage:
 * ```typescript
 * import { WorkOrder, WOStatus, FMRole } from '@/types/fm';
 * ```
 */

// Work Order Types
export type {
  WorkOrderStatus,
  WorkOrderPriority,
  WorkOrderCategory,
  WorkOrderUser,
  WorkOrderPhoto,
  WorkOrderComment,
  WorkOrderTimeline,
  WorkOrderProperty,
  WorkOrderUnit,
  WorkOrder,
  WorkOrderFormData,
  WorkOrderFilters,
  WorkOrderStats,
} from "./work-order";

export {
  WOStatus,
  WOPriority,
  WOCategory,
  isFinalStatus,
  toEnumStatus,
  toUIStatus,
  toEnumPriority,
  toUIPriority,
} from "./work-order";

// All FM Enums
export {
  FMRole,
  SubscriptionPlan,
  FMModule,
  FMAction,
  PropertyType,
  PropertyStatus,
  UnitStatus,
  TenancyStatus,
  TenantType,
  VendorStatus,
  VendorType,
  InvoiceStatus,
  PaymentStatus,
  PaymentMethod,
  ExpenseCategory,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  AssetStatus,
  AssetType,
  MaintenanceType,
  MaintenanceFrequency,
  ReportType,
  ReportFormat,
  ReportFrequency,
} from "./enums";
