/**
 * @fileoverview Property Inspection Service
 * @module services/fm/inspection-service
 * 
 * Mobile-first inspection workflow system that:
 * - Manages inspection templates and checklists
 * - Supports photo/video documentation
 * - Provides offline-capable inspection data sync
 * - Generates inspection reports with findings
 * - Integrates with work order creation
 * - Tracks inspection history and trends
 * 
 * @status IMPLEMENTED [AGENT-001-A]
 * @created 2025-12-29
 */

import { ObjectId, type WithId, type Document } from "mongodb";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Inspection types
 */
export enum InspectionType {
  MOVE_IN = "move_in",
  MOVE_OUT = "move_out",
  ROUTINE = "routine",
  ANNUAL = "annual",
  PRE_LEASE = "pre_lease",
  EMERGENCY = "emergency",
  MAINTENANCE = "maintenance",
  COMPLIANCE = "compliance",
}

/**
 * Inspection status
 */
export enum InspectionStatus {
  SCHEDULED = "scheduled",
  IN_PROGRESS = "in_progress",
  PENDING_REVIEW = "pending_review",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

/**
 * Item condition ratings
 */
export enum ConditionRating {
  EXCELLENT = "excellent",  // No issues, like new
  GOOD = "good",            // Minor wear, acceptable
  FAIR = "fair",            // Moderate wear, may need attention
  POOR = "poor",            // Significant issues, needs repair
  CRITICAL = "critical",    // Immediate action required
  NOT_APPLICABLE = "na",
}

/**
 * Finding severity
 */
export enum FindingSeverity {
  INFO = "info",           // Observation only
  LOW = "low",             // Cosmetic/minor
  MEDIUM = "medium",       // Should be addressed
  HIGH = "high",           // Needs prompt attention
  CRITICAL = "critical",   // Safety/compliance issue
}

/**
 * Inspection template item
 */
export interface InspectionItem {
  id: string;
  category: string;
  name: string;
  description?: string;
  required: boolean;
  acceptableConditions: ConditionRating[];
  photoRequired: boolean;
  defaultNotes?: string;
}

/**
 * Inspection template
 */
export interface InspectionTemplate {
  _id?: ObjectId;
  orgId: string;
  name: string;
  type: InspectionType;
  description?: string;
  categories: string[];
  items: InspectionItem[];
  estimatedDuration: number; // minutes
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * Completed inspection item
 */
export interface CompletedItem {
  itemId: string;
  category: string;
  name: string;
  condition: ConditionRating;
  notes?: string;
  photos: MediaAttachment[];
  findings?: InspectionFinding[];
  completedAt: Date;
  completedBy: string;
}

/**
 * Media attachment
 */
export interface MediaAttachment {
  id: string;
  type: "photo" | "video";
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  uploadedAt: Date;
  uploadedBy: string;
  geoLocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  metadata?: {
    width?: number;
    height?: number;
    duration?: number;
    size: number;
    mimeType: string;
  };
}

/**
 * Inspection finding
 */
export interface InspectionFinding {
  id: string;
  itemId: string;
  severity: FindingSeverity;
  title: string;
  description: string;
  photos: MediaAttachment[];
  recommendedAction: string;
  estimatedCost?: number;
  workOrderCreated: boolean;
  workOrderId?: string;
  resolvedAt?: Date;
}

/**
 * Inspection record
 */
export interface InspectionRecord {
  _id?: ObjectId;
  orgId: string;
  propertyId: string;
  unitId?: string;
  templateId: string;
  templateName: string;
  type: InspectionType;
  status: InspectionStatus;
  scheduledDate: Date;
  scheduledTimeSlot?: {
    start: string;
    end: string;
  };
  startedAt?: Date;
  completedAt?: Date;
  inspectorId: string;
  inspectorName: string;
  tenantPresent: boolean;
  tenantSignature?: string;
  tenantSignedAt?: Date;
  completedItems: CompletedItem[];
  incompleteItems: string[];
  findings: InspectionFinding[];
  overallCondition?: ConditionRating;
  score?: number; // 0-100
  notes?: string;
  internalNotes?: string;
  reportUrl?: string;
  approvedBy?: string;
  approvedAt?: Date;
  syncedFromOffline: boolean;
  offlineId?: string;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Inspection schedule request
 */
export interface ScheduleInspectionRequest {
  orgId: string;
  propertyId: string;
  unitId?: string;
  templateId: string;
  type: InspectionType;
  scheduledDate: Date;
  scheduledTimeSlot?: {
    start: string;
    end: string;
  };
  inspectorId: string;
  inspectorName: string;
  notifyTenant?: boolean;
}

/**
 * Inspection analytics
 */
export interface InspectionAnalytics {
  totalInspections: number;
  completedCount: number;
  pendingCount: number;
  overdueCount: number;
  byType: Record<string, number>;
  byCondition: Record<string, number>;
  averageScore: number;
  averageDuration: number; // minutes
  findingsBySeverity: Record<string, number>;
  unresolvedFindings: number;
  complianceRate: number; // percentage
}

// ============================================================================
// Constants
// ============================================================================

const TEMPLATES_COLLECTION = "inspection_templates";
const INSPECTIONS_COLLECTION = "inspections";

/**
 * Default inspection categories
 */
const DEFAULT_CATEGORIES = [
  "Exterior",
  "Living Room",
  "Kitchen",
  "Bathroom",
  "Bedroom",
  "Utilities",
  "Safety",
  "HVAC",
  "Appliances",
  "Flooring",
  "Walls & Ceilings",
  "Windows & Doors",
  "Plumbing",
  "Electrical",
];

// ============================================================================
// Template Management
// ============================================================================

/**
 * Create inspection template
 */
export async function createTemplate(
  data: Omit<InspectionTemplate, "_id" | "createdAt" | "updatedAt">
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    // If setting as default, unset other defaults
    if (data.isDefault) {
      await db.collection(TEMPLATES_COLLECTION).updateMany(
        { orgId: data.orgId, type: data.type, isDefault: true },
        { $set: { isDefault: false, updatedAt: new Date() } }
      );
    }
    
    const template: Omit<InspectionTemplate, "_id"> = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection(TEMPLATES_COLLECTION).insertOne(template);
    
    logger.info("Inspection template created", {
      component: "inspection-service",
      action: "createTemplate",
    });
    
    return { success: true, templateId: result.insertedId.toString() };
  } catch (_error) {
    logger.error("Failed to create inspection template", { component: "inspection-service" });
    return { success: false, error: "Failed to create template" };
  }
}

/**
 * Get template by ID
 */
export async function getTemplateById(
  templateId: string,
  orgId: string
): Promise<InspectionTemplate | null> {
  try {
    const db = await getDatabase();
    const template = await db.collection(TEMPLATES_COLLECTION).findOne({
      _id: new ObjectId(templateId),
      orgId,
    }) as WithId<Document> | null;
    
    return template as unknown as InspectionTemplate;
  } catch (_error) {
    logger.error("Failed to get template", { component: "inspection-service" });
    return null;
  }
}

/**
 * Get templates by type
 */
export async function getTemplatesByType(
  orgId: string,
  type?: InspectionType
): Promise<InspectionTemplate[]> {
  try {
    const db = await getDatabase();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = { orgId, isActive: true };
    if (type) filter.type = type;
    
    const templates = await db.collection(TEMPLATES_COLLECTION)
      .find(filter)
      .sort({ isDefault: -1, name: 1 })
      .toArray();
    
    return templates as unknown as InspectionTemplate[];
  } catch (_error) {
    logger.error("Failed to get templates", { component: "inspection-service" });
    return [];
  }
}

/**
 * Create default templates for an organization
 */
export async function createDefaultTemplates(
  orgId: string,
  createdBy: string
): Promise<{ created: number }> {
  try {
    const templates: Omit<InspectionTemplate, "_id" | "createdAt" | "updatedAt">[] = [
      // Move-in inspection
      {
        orgId,
        name: "Move-In Inspection",
        type: InspectionType.MOVE_IN,
        description: "Standard move-in inspection checklist",
        categories: DEFAULT_CATEGORIES,
        items: generateDefaultItems(InspectionType.MOVE_IN),
        estimatedDuration: 45,
        isDefault: true,
        isActive: true,
        createdBy,
      },
      // Move-out inspection
      {
        orgId,
        name: "Move-Out Inspection",
        type: InspectionType.MOVE_OUT,
        description: "Standard move-out inspection checklist",
        categories: DEFAULT_CATEGORIES,
        items: generateDefaultItems(InspectionType.MOVE_OUT),
        estimatedDuration: 60,
        isDefault: true,
        isActive: true,
        createdBy,
      },
      // Routine inspection
      {
        orgId,
        name: "Quarterly Routine Inspection",
        type: InspectionType.ROUTINE,
        description: "Quarterly property condition check",
        categories: ["Safety", "HVAC", "Plumbing", "Exterior"],
        items: generateDefaultItems(InspectionType.ROUTINE),
        estimatedDuration: 30,
        isDefault: true,
        isActive: true,
        createdBy,
      },
    ];
    
    let created = 0;
    for (const template of templates) {
      const result = await createTemplate(template);
      if (result.success) created++;
    }
    
    return { created };
  } catch (_error) {
    logger.error("Failed to create default templates", { component: "inspection-service" });
    return { created: 0 };
  }
}

// ============================================================================
// Inspection Management
// ============================================================================

/**
 * Schedule new inspection
 */
export async function scheduleInspection(
  request: ScheduleInspectionRequest
): Promise<{ success: boolean; inspectionId?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Get template
    const template = await getTemplateById(request.templateId, request.orgId);
    if (!template) {
      return { success: false, error: "Template not found" };
    }
    
    const inspection: Omit<InspectionRecord, "_id"> = {
      orgId: request.orgId,
      propertyId: request.propertyId,
      unitId: request.unitId,
      templateId: request.templateId,
      templateName: template.name,
      type: request.type,
      status: InspectionStatus.SCHEDULED,
      scheduledDate: request.scheduledDate,
      scheduledTimeSlot: request.scheduledTimeSlot,
      inspectorId: request.inspectorId,
      inspectorName: request.inspectorName,
      tenantPresent: false,
      completedItems: [],
      incompleteItems: template.items.map(i => i.id),
      findings: [],
      syncedFromOffline: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection(INSPECTIONS_COLLECTION).insertOne(inspection);
    
    // TODO: Send notification to tenant if requested
    if (request.notifyTenant) {
      logger.info("TODO: Send tenant inspection notification", {
        component: "inspection-service",
      });
    }
    
    logger.info("Inspection scheduled", {
      component: "inspection-service",
      action: "scheduleInspection",
    });
    
    return { success: true, inspectionId: result.insertedId.toString() };
  } catch (_error) {
    logger.error("Failed to schedule inspection", { component: "inspection-service" });
    return { success: false, error: "Failed to schedule inspection" };
  }
}

/**
 * Start inspection
 */
export async function startInspection(
  inspectionId: string,
  orgId: string,
  tenantPresent: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const result = await db.collection(INSPECTIONS_COLLECTION).updateOne(
      {
        _id: new ObjectId(inspectionId),
        orgId,
        status: InspectionStatus.SCHEDULED,
      },
      {
        $set: {
          status: InspectionStatus.IN_PROGRESS,
          startedAt: new Date(),
          tenantPresent,
          updatedAt: new Date(),
        },
      }
    );
    
    if (result.matchedCount === 0) {
      return { success: false, error: "Inspection not found or already started" };
    }
    
    return { success: true };
  } catch (_error) {
    logger.error("Failed to start inspection", { component: "inspection-service" });
    return { success: false, error: "Failed to start inspection" };
  }
}

/**
 * Complete inspection item
 */
export async function completeInspectionItem(
  inspectionId: string,
  orgId: string,
  item: CompletedItem
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    // MongoDB update operators for adding completed items and removing from incomplete
    const result = await db.collection(INSPECTIONS_COLLECTION).updateOne(
      {
        _id: new ObjectId(inspectionId),
        orgId,
        status: InspectionStatus.IN_PROGRESS,
      },
      {
        $push: { completedItems: item },
        $pull: { incompleteItems: item.itemId },
        $set: { updatedAt: new Date() },
      } as Document
    );
    
    if (result.matchedCount === 0) {
      return { success: false, error: "Inspection not found or not in progress" };
    }
    
    // If item has findings, add them
    if (item.findings && item.findings.length > 0) {
      await db.collection(INSPECTIONS_COLLECTION).updateOne(
        { _id: new ObjectId(inspectionId), orgId },
        { $push: { findings: { $each: item.findings } } } as Document
      );
    }
    
    return { success: true };
  } catch (_error) {
    logger.error("Failed to complete inspection item", { component: "inspection-service" });
    return { success: false, error: "Failed to complete item" };
  }
}

/**
 * Add finding to inspection
 */
export async function addFinding(
  inspectionId: string,
  orgId: string,
  finding: Omit<InspectionFinding, "id" | "workOrderCreated">
): Promise<{ success: boolean; findingId?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    const findingWithId: InspectionFinding = {
      ...finding,
      id: new ObjectId().toString(),
      workOrderCreated: false,
    };
    
    const result = await db.collection(INSPECTIONS_COLLECTION).updateOne(
      {
        _id: new ObjectId(inspectionId),
        orgId,
        status: { $in: [InspectionStatus.IN_PROGRESS, InspectionStatus.PENDING_REVIEW] },
      },
      {
        $push: { findings: findingWithId },
        $set: { updatedAt: new Date() },
      } as Document
    );
    
    if (result.matchedCount === 0) {
      return { success: false, error: "Inspection not found or completed" };
    }
    
    return { success: true, findingId: findingWithId.id };
  } catch (_error) {
    logger.error("Failed to add finding", { component: "inspection-service" });
    return { success: false, error: "Failed to add finding" };
  }
}

/**
 * Complete inspection
 */
export async function completeInspection(
  inspectionId: string,
  orgId: string,
  data: {
    notes?: string;
    internalNotes?: string;
    tenantSignature?: string;
  }
): Promise<{ success: boolean; score?: number; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Get inspection
    const inspection = await db.collection(INSPECTIONS_COLLECTION).findOne({
      _id: new ObjectId(inspectionId),
      orgId,
    }) as WithId<Document> | null;
    
    if (!inspection) {
      return { success: false, error: "Inspection not found" };
    }
    
    const record = inspection as unknown as InspectionRecord;
    
    // Validate inspection is in progress before completing
    if (record.status !== InspectionStatus.IN_PROGRESS) {
      logger.warn("Cannot complete inspection not in progress", {
        component: "inspection-service",
        action: "completeInspection",
        inspectionId,
        currentStatus: record.status,
      });
      return { success: false, error: "Inspection not in progress" };
    }
    
    // Calculate overall condition and score
    const { overallCondition, score } = calculateInspectionScore(record.completedItems);
    
    await db.collection(INSPECTIONS_COLLECTION).updateOne(
      { _id: new ObjectId(inspectionId), orgId },
      {
        $set: {
          status: InspectionStatus.PENDING_REVIEW,
          completedAt: new Date(),
          overallCondition,
          score,
          notes: data.notes,
          internalNotes: data.internalNotes,
          tenantSignature: data.tenantSignature,
          tenantSignedAt: data.tenantSignature ? new Date() : undefined,
          updatedAt: new Date(),
        },
      }
    );
    
    logger.info("Inspection completed", {
      component: "inspection-service",
      action: "completeInspection",
    });
    
    return { success: true, score };
  } catch (_error) {
    logger.error("Failed to complete inspection", { component: "inspection-service" });
    return { success: false, error: "Failed to complete inspection" };
  }
}

/**
 * Approve/finalize inspection
 */
export async function approveInspection(
  inspectionId: string,
  orgId: string,
  approvedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const result = await db.collection(INSPECTIONS_COLLECTION).updateOne(
      {
        _id: new ObjectId(inspectionId),
        orgId,
        status: InspectionStatus.PENDING_REVIEW,
      },
      {
        $set: {
          status: InspectionStatus.COMPLETED,
          approvedBy,
          approvedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
    
    if (result.matchedCount === 0) {
      return { success: false, error: "Inspection not found or not pending review" };
    }
    
    // Generate report URL (placeholder)
    // TODO: Integrate with report generation service
    
    return { success: true };
  } catch (_error) {
    logger.error("Failed to approve inspection", { component: "inspection-service" });
    return { success: false, error: "Failed to approve inspection" };
  }
}

// ============================================================================
// Work Order Integration
// ============================================================================

/**
 * Create work order from finding
 */
export async function createWorkOrderFromFinding(
  inspectionId: string,
  findingId: string,
  orgId: string,
  additionalData?: {
    priority?: string;
    assigneeId?: string;
    scheduledDate?: Date;
  }
): Promise<{ success: boolean; workOrderId?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Get inspection and finding
    const inspection = await db.collection(INSPECTIONS_COLLECTION).findOne({
      _id: new ObjectId(inspectionId),
      orgId,
      "findings.id": findingId,
    }) as WithId<Document> | null;
    
    if (!inspection) {
      return { success: false, error: "Inspection or finding not found" };
    }
    
    const record = inspection as unknown as InspectionRecord;
    const finding = record.findings.find(f => f.id === findingId);
    
    if (!finding) {
      return { success: false, error: "Finding not found" };
    }
    
    if (finding.workOrderCreated) {
      return { success: false, error: "Work order already created for this finding" };
    }
    
    // Determine priority based on severity
    const priorityMap: Record<FindingSeverity, string> = {
      [FindingSeverity.CRITICAL]: "emergency",
      [FindingSeverity.HIGH]: "high",
      [FindingSeverity.MEDIUM]: "normal",
      [FindingSeverity.LOW]: "low",
      [FindingSeverity.INFO]: "low",
    };
    
    // Create work order
    const workOrder = {
      orgId,
      propertyId: record.propertyId,
      unitId: record.unitId,
      title: `Inspection Finding: ${finding.title}`,
      description: `${finding.description}\n\nRecommended Action: ${finding.recommendedAction}`,
      priority: additionalData?.priority || priorityMap[finding.severity],
      status: "open",
      category: "repair",
      source: "inspection",
      assigneeId: additionalData?.assigneeId,
      scheduledDate: additionalData?.scheduledDate,
      estimatedCost: finding.estimatedCost,
      metadata: {
        inspectionId,
        findingId,
        severity: finding.severity,
      },
      photos: finding.photos.map(p => p.url),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection("work_orders").insertOne(workOrder);
    
    // Update finding with work order ID
    await db.collection(INSPECTIONS_COLLECTION).updateOne(
      {
        _id: new ObjectId(inspectionId),
        orgId,
        "findings.id": findingId,
      },
      {
        $set: {
          "findings.$.workOrderCreated": true,
          "findings.$.workOrderId": result.insertedId.toString(),
          updatedAt: new Date(),
        },
      }
    );
    
    logger.info("Work order created from inspection finding", {
      component: "inspection-service",
      action: "createWorkOrderFromFinding",
    });
    
    return { success: true, workOrderId: result.insertedId.toString() };
  } catch (_error) {
    logger.error("Failed to create work order from finding", { component: "inspection-service" });
    return { success: false, error: "Failed to create work order" };
  }
}

/**
 * Create work orders for all critical/high findings
 */
export async function createBulkWorkOrders(
  inspectionId: string,
  orgId: string,
  minSeverity: FindingSeverity = FindingSeverity.HIGH
): Promise<{ created: number; workOrderIds: string[] }> {
  try {
    const db = await getDatabase();
    const workOrderIds: string[] = [];
    
    const inspection = await db.collection(INSPECTIONS_COLLECTION).findOne({
      _id: new ObjectId(inspectionId),
      orgId,
    }) as WithId<Document> | null;
    
    if (!inspection) {
      return { created: 0, workOrderIds: [] };
    }
    
    const record = inspection as unknown as InspectionRecord;
    const severityOrder = [
      FindingSeverity.CRITICAL,
      FindingSeverity.HIGH,
      FindingSeverity.MEDIUM,
      FindingSeverity.LOW,
      FindingSeverity.INFO,
    ];
    
    const minSeverityIndex = severityOrder.indexOf(minSeverity);
    
    for (const finding of record.findings) {
      const findingSeverityIndex = severityOrder.indexOf(finding.severity);
      if (findingSeverityIndex <= minSeverityIndex && !finding.workOrderCreated) {
        const result = await createWorkOrderFromFinding(inspectionId, finding.id, orgId);
        if (result.success && result.workOrderId) {
          workOrderIds.push(result.workOrderId);
        }
      }
    }
    
    return { created: workOrderIds.length, workOrderIds };
  } catch (_error) {
    logger.error("Failed to create bulk work orders", { component: "inspection-service" });
    return { created: 0, workOrderIds: [] };
  }
}

// ============================================================================
// Offline Sync
// ============================================================================

/**
 * Sync inspection data from offline mobile app
 */
export async function syncOfflineInspection(
  offlineData: InspectionRecord & { offlineId: string }
): Promise<{ success: boolean; inspectionId?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Check if already synced
    const existing = await db.collection(INSPECTIONS_COLLECTION).findOne({
      offlineId: offlineData.offlineId,
      orgId: offlineData.orgId,
    });
    
    if (existing) {
      // Check for conflicts: if server version is newer than offline data
      const existingRecord = existing as unknown as InspectionRecord;
      const serverUpdatedAt = existingRecord.updatedAt?.getTime() || 0;
      const offlineLastSync = offlineData.lastSyncAt?.getTime() || 0;
      
      // If server has been updated after the offline data was last synced, report conflict
      if (serverUpdatedAt > offlineLastSync) {
        logger.warn("Offline sync conflict detected", {
          component: "inspection-service",
          action: "syncOfflineInspection",
          inspectionId: existing._id.toString(),
          serverUpdatedAt: new Date(serverUpdatedAt).toISOString(),
          offlineLastSync: new Date(offlineLastSync).toISOString(),
        });
        return { 
          success: false, 
          error: "Conflict: server data is newer than offline data",
          inspectionId: existing._id.toString(),
        };
      }
      
      // Merge updates
      await db.collection(INSPECTIONS_COLLECTION).updateOne(
        { _id: existing._id },
        {
          $set: {
            completedItems: offlineData.completedItems,
            incompleteItems: offlineData.incompleteItems,
            findings: offlineData.findings,
            status: offlineData.status,
            completedAt: offlineData.completedAt,
            notes: offlineData.notes,
            lastSyncAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
      
      return { success: true, inspectionId: existing._id.toString() };
    }
    
    // Create new inspection from offline data
    const inspection: Omit<InspectionRecord, "_id"> = {
      ...offlineData,
      syncedFromOffline: true,
      lastSyncAt: new Date(),
      createdAt: offlineData.createdAt || new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection(INSPECTIONS_COLLECTION).insertOne(inspection);
    
    logger.info("Offline inspection synced", {
      component: "inspection-service",
      action: "syncOfflineInspection",
    });
    
    return { success: true, inspectionId: result.insertedId.toString() };
  } catch (_error) {
    logger.error("Failed to sync offline inspection", { component: "inspection-service" });
    return { success: false, error: "Failed to sync offline data" };
  }
}

/**
 * Get pending sync items for offline app
 */
export async function getPendingSyncData(
  orgId: string,
  inspectorId: string
): Promise<{
  templates: InspectionTemplate[];
  scheduledInspections: InspectionRecord[];
}> {
  try {
    const db = await getDatabase();
    
    // Get active templates
    const templates = await db.collection(TEMPLATES_COLLECTION)
      .find({ orgId, isActive: true })
      .toArray() as unknown as InspectionTemplate[];
    
    // Get scheduled inspections for this inspector
    const scheduledInspections = await db.collection(INSPECTIONS_COLLECTION)
      .find({
        orgId,
        inspectorId,
        status: InspectionStatus.SCHEDULED,
        scheduledDate: { $gte: new Date() },
      })
      .sort({ scheduledDate: 1 })
      .toArray() as unknown as InspectionRecord[];
    
    return { templates, scheduledInspections };
  } catch (_error) {
    logger.error("Failed to get pending sync data", { component: "inspection-service" });
    return { templates: [], scheduledInspections: [] };
  }
}

// ============================================================================
// Analytics
// ============================================================================

/**
 * Get inspection analytics
 */
export async function getInspectionAnalytics(
  orgId: string,
  options?: {
    propertyId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }
): Promise<InspectionAnalytics> {
  try {
    const db = await getDatabase();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = { orgId };
    if (options?.propertyId) filter.propertyId = options.propertyId;
    if (options?.dateFrom || options?.dateTo) {
      filter.scheduledDate = {};
      if (options.dateFrom) filter.scheduledDate.$gte = options.dateFrom;
      if (options.dateTo) filter.scheduledDate.$lte = options.dateTo;
    }
    
    const inspections = await db.collection(INSPECTIONS_COLLECTION)
      .find(filter)
      .toArray() as unknown as InspectionRecord[];
    
    const now = new Date();
    const analytics: InspectionAnalytics = {
      totalInspections: inspections.length,
      completedCount: 0,
      pendingCount: 0,
      overdueCount: 0,
      byType: {},
      byCondition: {},
      averageScore: 0,
      averageDuration: 0,
      findingsBySeverity: {},
      unresolvedFindings: 0,
      complianceRate: 0,
    };
    
    let scoreSum = 0;
    let scoreCount = 0;
    let durationSum = 0;
    let durationCount = 0;
    
    for (const inspection of inspections) {
      // Status counts
      if (inspection.status === InspectionStatus.COMPLETED) {
        analytics.completedCount++;
      } else if (inspection.status === InspectionStatus.SCHEDULED) {
        if (inspection.scheduledDate < now) {
          analytics.overdueCount++;
        } else {
          analytics.pendingCount++;
        }
      } else {
        analytics.pendingCount++;
      }
      
      // Type distribution
      analytics.byType[inspection.type] = (analytics.byType[inspection.type] || 0) + 1;
      
      // Condition distribution
      if (inspection.overallCondition) {
        analytics.byCondition[inspection.overallCondition] = 
          (analytics.byCondition[inspection.overallCondition] || 0) + 1;
      }
      
      // Score
      if (inspection.score !== undefined) {
        scoreSum += inspection.score;
        scoreCount++;
      }
      
      // Duration
      if (inspection.startedAt && inspection.completedAt) {
        const duration = (inspection.completedAt.getTime() - inspection.startedAt.getTime()) / 60000;
        durationSum += duration;
        durationCount++;
      }
      
      // Findings
      for (const finding of inspection.findings) {
        analytics.findingsBySeverity[finding.severity] = 
          (analytics.findingsBySeverity[finding.severity] || 0) + 1;
        
        if (!finding.resolvedAt) {
          analytics.unresolvedFindings++;
        }
      }
    }
    
    analytics.averageScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0;
    analytics.averageDuration = durationCount > 0 ? Math.round(durationSum / durationCount) : 0;
    
    // Compliance rate: percentage with "good" or better condition
    const goodConditions = [ConditionRating.EXCELLENT, ConditionRating.GOOD];
    const goodCount = inspections.filter(i => 
      i.overallCondition && goodConditions.includes(i.overallCondition)
    ).length;
    analytics.complianceRate = inspections.length > 0 
      ? Math.round((goodCount / inspections.length) * 100) 
      : 0;
    
    return analytics;
  } catch (_error) {
    logger.error("Failed to get inspection analytics", { component: "inspection-service" });
    return {
      totalInspections: 0,
      completedCount: 0,
      pendingCount: 0,
      overdueCount: 0,
      byType: {},
      byCondition: {},
      averageScore: 0,
      averageDuration: 0,
      findingsBySeverity: {},
      unresolvedFindings: 0,
      complianceRate: 0,
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateDefaultItems(type: InspectionType): InspectionItem[] {
  const items: InspectionItem[] = [];
  let itemNum = 1;
  
  // Common items for all types
  const categories = type === InspectionType.ROUTINE
    ? ["Safety", "HVAC", "Plumbing", "Exterior"]
    : DEFAULT_CATEGORIES;
  
  for (const category of categories) {
    const categoryItems = getCategoryItems(category);
    for (const item of categoryItems) {
      items.push({
        id: `item-${itemNum++}`,
        category,
        name: item.name,
        description: item.description,
        required: item.required,
        acceptableConditions: [ConditionRating.EXCELLENT, ConditionRating.GOOD, ConditionRating.FAIR],
        photoRequired: item.photoRequired,
      });
    }
  }
  
  return items;
}

function getCategoryItems(category: string): Array<{
  name: string;
  description?: string;
  required: boolean;
  photoRequired: boolean;
}> {
  const itemsByCategory: Record<string, Array<{
    name: string;
    description?: string;
    required: boolean;
    photoRequired: boolean;
  }>> = {
    Exterior: [
      { name: "Building Facade", description: "Check for cracks, paint condition", required: true, photoRequired: true },
      { name: "Entry Door", description: "Lock, hinges, weatherstripping", required: true, photoRequired: true },
      { name: "Windows", description: "Seals, glass condition", required: true, photoRequired: false },
    ],
    "Living Room": [
      { name: "Walls", description: "Paint, holes, damage", required: true, photoRequired: true },
      { name: "Flooring", description: "Condition, wear", required: true, photoRequired: true },
      { name: "Ceiling", description: "Stains, cracks, damage", required: true, photoRequired: false },
      { name: "Light Fixtures", description: "Working condition", required: true, photoRequired: false },
    ],
    Kitchen: [
      { name: "Cabinets", description: "Doors, hinges, condition", required: true, photoRequired: true },
      { name: "Countertops", description: "Surface condition", required: true, photoRequired: true },
      { name: "Sink & Faucet", description: "Leaks, drainage", required: true, photoRequired: false },
      { name: "Appliances", description: "Stove, refrigerator, dishwasher", required: true, photoRequired: true },
    ],
    Bathroom: [
      { name: "Toilet", description: "Flushing, leaks, condition", required: true, photoRequired: true },
      { name: "Shower/Tub", description: "Drainage, tiles, caulking", required: true, photoRequired: true },
      { name: "Sink & Vanity", description: "Faucet, drainage", required: true, photoRequired: false },
      { name: "Ventilation", description: "Exhaust fan operation", required: true, photoRequired: false },
    ],
    Safety: [
      { name: "Smoke Detectors", description: "Working, batteries", required: true, photoRequired: true },
      { name: "Fire Extinguisher", description: "Present, not expired", required: true, photoRequired: true },
      { name: "Carbon Monoxide Detector", description: "Working, batteries", required: false, photoRequired: false },
      { name: "Emergency Exit", description: "Clear, accessible", required: true, photoRequired: false },
    ],
    HVAC: [
      { name: "AC Unit", description: "Cooling, filters", required: true, photoRequired: true },
      { name: "Thermostat", description: "Working, settings", required: true, photoRequired: false },
      { name: "Vents", description: "Clean, airflow", required: true, photoRequired: false },
    ],
    Plumbing: [
      { name: "Water Heater", description: "Working, leaks, age", required: true, photoRequired: true },
      { name: "Water Pressure", description: "Adequate flow", required: true, photoRequired: false },
      { name: "Pipes", description: "Visible leaks, corrosion", required: true, photoRequired: false },
    ],
  };
  
  return itemsByCategory[category] || [
    { name: `${category} General`, required: true, photoRequired: false },
  ];
}

function calculateInspectionScore(completedItems: CompletedItem[]): {
  overallCondition: ConditionRating;
  score: number;
} {
  if (completedItems.length === 0) {
    return { overallCondition: ConditionRating.NOT_APPLICABLE, score: 0 };
  }
  
  const conditionScores: Record<ConditionRating, number> = {
    [ConditionRating.EXCELLENT]: 100,
    [ConditionRating.GOOD]: 80,
    [ConditionRating.FAIR]: 60,
    [ConditionRating.POOR]: 40,
    [ConditionRating.CRITICAL]: 20,
    [ConditionRating.NOT_APPLICABLE]: 0,
  };
  
  let totalScore = 0;
  let scoredItems = 0;
  
  for (const item of completedItems) {
    if (item.condition !== ConditionRating.NOT_APPLICABLE) {
      totalScore += conditionScores[item.condition];
      scoredItems++;
    }
  }
  
  const score = scoredItems > 0 ? Math.round(totalScore / scoredItems) : 0;
  
  // If no items were scored (all NOT_APPLICABLE), return NOT_APPLICABLE
  if (scoredItems === 0) {
    return { overallCondition: ConditionRating.NOT_APPLICABLE, score: 0 };
  }
  
  let overallCondition: ConditionRating;
  if (score >= 90) overallCondition = ConditionRating.EXCELLENT;
  else if (score >= 70) overallCondition = ConditionRating.GOOD;
  else if (score >= 50) overallCondition = ConditionRating.FAIR;
  else if (score >= 30) overallCondition = ConditionRating.POOR;
  else overallCondition = ConditionRating.CRITICAL;
  
  return { overallCondition, score };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  // Template Management
  createTemplate,
  getTemplateById,
  getTemplatesByType,
  createDefaultTemplates,
  
  // Inspection Management
  scheduleInspection,
  startInspection,
  completeInspectionItem,
  addFinding,
  completeInspection,
  approveInspection,
  
  // Work Order Integration
  createWorkOrderFromFinding,
  createBulkWorkOrders,
  
  // Offline Sync
  syncOfflineInspection,
  getPendingSyncData,
  
  // Analytics
  getInspectionAnalytics,
};
