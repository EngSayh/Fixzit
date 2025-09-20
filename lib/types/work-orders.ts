/**
 * Work Orders types for maintenance and service management
 */

import { AuditableEntity, User, Address, FileUpload, Comment } from './api';

export interface WorkOrder extends AuditableEntity {
  // Basic Information
  title: string;
  description: string;
  workOrderNumber: string; // Auto-generated unique identifier
  
  // Classification
  type: 'maintenance' | 'repair' | 'inspection' | 'installation' | 'upgrade' | 'emergency' | 'preventive';
  category: 'plumbing' | 'electrical' | 'hvac' | 'general' | 'landscaping' | 'cleaning' | 'security' | 'other';
  subcategory?: string;
  
  // Priority and Urgency
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'emergency';
  urgency: 'routine' | 'urgent' | 'emergency';
  
  // Status Management
  status: 'draft' | 'submitted' | 'approved' | 'assigned' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled' | 'closed';
  statusHistory: WorkOrderStatusHistory[];
  
  // Assignment
  assignedTo?: string;
  assignee?: User;
  assignedBy?: string;
  assignedAt?: string;
  
  // Requestor Information
  requestedBy: string;
  requestor?: User;
  requestorContact?: {
    email: string;
    phone?: string;
    alternatePhone?: string;
  };
  
  // Location
  propertyId: string;
  property?: {
    id: string;
    name: string;
    address: string;
  };
  unitId?: string;
  unit?: {
    id: string;
    number: string;
    type: string;
  };
  locationDescription?: string;
  accessInstructions?: string;
  
  // Scheduling
  requestedDate?: string;
  scheduledDate?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  estimatedDuration?: number; // minutes
  actualStartTime?: string;
  actualEndTime?: string;
  actualDuration?: number; // minutes
  
  // Financial
  estimatedCost?: number;
  actualCost?: number;
  budgetCode?: string;
  currency: string;
  costBreakdown?: {
    labor: number;
    materials: number;
    equipment: number;
    overhead: number;
    markup: number;
  };
  
  // Vendor/Contractor
  vendorId?: string;
  vendor?: {
    id: string;
    name: string;
    contact: string;
  };
  contractorId?: string;
  contractor?: {
    id: string;
    name: string;
    contact: string;
  };
  
  // Materials and Parts
  materials?: MaterialUsed[];
  partsRequired?: PartRequired[];
  
  // Documentation
  attachments?: FileUpload[];
  beforePhotos?: FileUpload[];
  afterPhotos?: FileUpload[];
  documents?: FileUpload[];
  
  // Communication
  comments?: Comment[];
  internalNotes?: string;
  tenantInstructions?: string;
  
  // Completion Details
  completedDate?: string;
  completedBy?: string;
  completionNotes?: string;
  qualityRating?: number; // 1-5
  tenantSatisfaction?: number; // 1-5
  
  // Follow-up
  followUpRequired: boolean;
  followUpDate?: string;
  followUpNotes?: string;
  warrantyPeriod?: number; // days
  warrantyExpiresAt?: string;
  
  // Recurring/Preventive
  isRecurring: boolean;
  recurringSchedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    interval: number;
    nextDue?: string;
  };
  parentWorkOrderId?: string; // For recurring work orders
  
  // Safety and Compliance
  safetyRequirements?: string[];
  permitRequired: boolean;
  permitNumber?: string;
  inspectionRequired: boolean;
  inspectionDate?: string;
  inspectionStatus?: 'pending' | 'passed' | 'failed';
  
  // Additional Data
  customFields?: Record<string, any>;
  tags: string[];
  
  // Metrics (calculated fields)
  responseTime?: number; // minutes from creation to assignment
  resolutionTime?: number; // minutes from creation to completion
  slaStatus?: 'within_sla' | 'approaching_sla' | 'breached_sla';
  slaDue?: string;
}

export interface WorkOrderStatusHistory extends AuditableEntity {
  workOrderId: string;
  fromStatus?: string;
  toStatus: string;
  reason?: string;
  notes?: string;
  changedBy: string;
  changedAt: string;
  duration?: number; // minutes in previous status
}

export interface MaterialUsed {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string; // 'pcs', 'ft', 'lbs', etc.
  unitCost: number;
  totalCost: number;
  supplier?: string;
  partNumber?: string;
  notes?: string;
}

export interface PartRequired {
  id: string;
  name: string;
  description?: string;
  partNumber?: string;
  quantity: number;
  unit: string;
  estimatedCost?: number;
  supplier?: string;
  availability?: 'in_stock' | 'back_order' | 'discontinued';
  leadTime?: number; // days
  ordered: boolean;
  orderedDate?: string;
  receivedDate?: string;
  notes?: string;
}

export interface WorkOrderTemplate extends AuditableEntity {
  name: string;
  description?: string;
  category: string;
  type: string;
  
  // Template Fields
  titleTemplate: string;
  descriptionTemplate: string;
  priority: string;
  estimatedDuration?: number;
  estimatedCost?: number;
  
  // Instructions
  instructions?: string;
  safetyRequirements?: string[];
  requiredTools?: string[];
  requiredMaterials?: PartRequired[];
  
  // Checklists
  checklist?: WorkOrderChecklistItem[];
  
  // Usage
  usageCount: number;
  lastUsed?: string;
  
  // Permissions
  availableToRoles: string[];
  isActive: boolean;
}

export interface WorkOrderChecklistItem {
  id: string;
  text: string;
  required: boolean;
  order: number;
  completed?: boolean;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  photos?: FileUpload[];
}

export interface WorkOrderSchedule extends AuditableEntity {
  workOrderId: string;
  
  // Scheduling
  scheduledDate: string;
  startTime: string;
  endTime: string;
  estimatedDuration: number; // minutes
  
  // Resources
  assignedTechnicians: string[];
  requiredEquipment?: string[];
  
  // Conflicts
  hasConflicts: boolean;
  conflicts?: ScheduleConflict[];
  
  // Status
  status: 'scheduled' | 'confirmed' | 'rescheduled' | 'cancelled';
  
  // Notifications
  notificationsEnabled: boolean;
  reminderSent: boolean;
  confirmationRequired: boolean;
  confirmationReceived: boolean;
}

export interface ScheduleConflict {
  type: 'technician_unavailable' | 'equipment_unavailable' | 'property_unavailable' | 'other';
  description: string;
  conflictingWorkOrderId?: string;
  suggestedResolution?: string;
}

export interface WorkOrderBatch extends AuditableEntity {
  name: string;
  description?: string;
  
  // Work Orders
  workOrderIds: string[];
  workOrders?: WorkOrder[];
  
  // Assignment
  assignedTo?: string;
  assignedTeam?: string;
  
  // Status
  status: 'created' | 'assigned' | 'in_progress' | 'completed';
  progress: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
  };
  
  // Scheduling
  scheduledDate?: string;
  estimatedDuration?: number; // minutes
  actualDuration?: number; // minutes
  
  // Financial
  estimatedCost?: number;
  actualCost?: number;
}

export interface PreventiveMaintenance extends AuditableEntity {
  name: string;
  description?: string;
  
  // Schedule
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annually' | 'annually';
  interval: number; // e.g., every 3 months
  
  // Scope
  propertyIds: string[];
  assetTypes?: string[];
  categories: string[];
  
  // Template
  workOrderTemplate: WorkOrderTemplate;
  
  // Scheduling
  nextDue: string;
  lastCompleted?: string;
  
  // Status
  isActive: boolean;
  
  // Generation Rules
  generateDaysBefore: number; // Generate work order X days before due
  autoAssign: boolean;
  defaultAssignee?: string;
  
  // History
  generatedWorkOrders: string[];
  
  // Performance
  completionRate: number;
  averageCompletionTime: number; // days
  costTrend: 'increasing' | 'decreasing' | 'stable';
}

export interface WorkOrderReport {
  id: string;
  name: string;
  type: 'summary' | 'detailed' | 'analytics' | 'performance';
  
  // Parameters
  dateRange: {
    from: string;
    to: string;
  };
  filters: {
    status?: string[];
    priority?: string[];
    category?: string[];
    assignedTo?: string[];
    propertyIds?: string[];
  };
  
  // Data
  summary: {
    totalWorkOrders: number;
    completedWorkOrders: number;
    averageCompletionTime: number;
    totalCost: number;
    averageCost: number;
  };
  
  breakdowns: {
    byStatus: Array<{ status: string; count: number; percentage: number }>;
    byPriority: Array<{ priority: string; count: number; percentage: number }>;
    byCategory: Array<{ category: string; count: number; percentage: number }>;
    byAssignee: Array<{ assigneeId: string; name: string; count: number; avgCompletionTime: number }>;
  };
  
  trends: {
    createdOverTime: Array<{ date: string; count: number }>;
    completedOverTime: Array<{ date: string; count: number }>;
    costOverTime: Array<{ date: string; cost: number }>;
  };
  
  performance: {
    slaCompliance: number;
    responseTime: {
      average: number;
      median: number;
      percentile95: number;
    };
    resolutionTime: {
      average: number;
      median: number;
      percentile95: number;
    };
    tenantSatisfaction: {
      average: number;
      responseCount: number;
      distribution: Array<{ rating: number; count: number }>;
    };
  };
  
  generatedAt: string;
  generatedBy: string;
}

export interface WorkOrderSLA extends AuditableEntity {
  name: string;
  description?: string;
  
  // Conditions
  conditions: {
    priority?: string[];
    category?: string[];
    type?: string[];
    propertyTypes?: string[];
  };
  
  // Targets
  responseTime: number; // minutes
  resolutionTime: number; // minutes
  
  // Business Hours
  businessHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string; // HH:MM
    timezone: string;
    excludeWeekends: boolean;
    excludeHolidays: boolean;
  };
  
  // Escalation
  escalation: {
    enabled: boolean;
    levels: EscalationLevel[];
  };
  
  // Status
  isActive: boolean;
  
  // Performance
  complianceRate: number;
  avgResponseTime: number;
  avgResolutionTime: number;
}

export interface EscalationLevel {
  level: number;
  triggerAfter: number; // minutes
  notifyUsers: string[];
  notifyRoles: string[];
  actions: string[];
  description?: string;
}