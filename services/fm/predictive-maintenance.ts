/**
 * @fileoverview Predictive Maintenance Service
 * @module services/fm/predictive-maintenance
 * 
 * AI-powered predictive maintenance system that:
 * - Analyzes equipment history to predict failures
 * - Recommends preventive maintenance schedules
 * - Tracks equipment health scores and degradation
 * - Generates automated work orders for predicted issues
 * - Integrates with IoT sensor data (future)
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
 * Equipment types tracked by the system
 */
export enum EquipmentType {
  HVAC = "hvac",
  ELEVATOR = "elevator",
  PLUMBING = "plumbing",
  ELECTRICAL = "electrical",
  FIRE_SAFETY = "fire_safety",
  GENERATOR = "generator",
  WATER_HEATER = "water_heater",
  SECURITY_SYSTEM = "security_system",
  POOL = "pool",
  IRRIGATION = "irrigation",
  APPLIANCE = "appliance",
  STRUCTURAL = "structural",
  OTHER = "other",
}

/**
 * Health status of equipment
 */
export enum HealthStatus {
  EXCELLENT = "excellent",  // 90-100%
  GOOD = "good",            // 70-89%
  FAIR = "fair",            // 50-69%
  POOR = "poor",            // 30-49%
  CRITICAL = "critical",    // 0-29%
}

/**
 * Prediction confidence levels
 */
export enum ConfidenceLevel {
  HIGH = "high",      // > 85% confidence
  MEDIUM = "medium",  // 60-85% confidence
  LOW = "low",        // < 60% confidence
}

/**
 * Maintenance priority based on prediction
 */
export enum MaintenancePriority {
  IMMEDIATE = "immediate",    // Within 24 hours
  URGENT = "urgent",          // Within 1 week
  SCHEDULED = "scheduled",    // Within 1 month
  ROUTINE = "routine",        // Quarterly/Annual
}

/**
 * Equipment record with maintenance history
 */
export interface EquipmentRecord {
  _id?: ObjectId;
  orgId: string;
  propertyId: string;
  unitId?: string;
  name: string;
  type: EquipmentType;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installDate: Date;
  expectedLifespan: number; // months
  warrantyExpiry?: Date;
  lastMaintenanceDate?: Date;
  nextScheduledMaintenance?: Date;
  maintenanceIntervalDays: number;
  healthScore: number; // 0-100
  healthStatus: HealthStatus;
  failureProbability: number; // 0-1
  estimatedRemainingLife: number; // months
  totalMaintenanceCost: number;
  maintenanceHistory: MaintenanceEvent[];
  sensorData?: SensorReading[];
  predictions: FailurePrediction[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Historical maintenance event
 */
export interface MaintenanceEvent {
  date: Date;
  type: "preventive" | "corrective" | "emergency" | "inspection";
  description: string;
  cost: number;
  technicianId: string;
  workOrderId?: string;
  partsReplaced?: string[];
  findings?: string;
  nextRecommendedAction?: string;
}

/**
 * IoT sensor reading (future integration)
 */
export interface SensorReading {
  timestamp: Date;
  sensorId: string;
  type: "temperature" | "vibration" | "pressure" | "humidity" | "power" | "runtime";
  value: number;
  unit: string;
  anomaly: boolean;
}

/**
 * AI-generated failure prediction
 */
export interface FailurePrediction {
  predictedAt: Date;
  component: string;
  failureType: string;
  probability: number;
  confidence: ConfidenceLevel;
  estimatedDate: Date;
  urgency: MaintenancePriority;
  recommendedAction: string;
  estimatedCost: number;
  impactIfIgnored: string;
  dataPoints: number; // Number of data points used
  modelVersion: string;
}

/**
 * Maintenance recommendation
 */
export interface MaintenanceRecommendation {
  equipmentId: string;
  equipmentName: string;
  propertyId: string;
  priority: MaintenancePriority;
  recommendedDate: Date;
  action: string;
  reason: string;
  estimatedCost: number;
  estimatedDuration: number; // hours
  requiredSkills: string[];
  partsNeeded?: string[];
  confidence: ConfidenceLevel;
}

/**
 * Equipment analytics summary
 */
export interface EquipmentAnalytics {
  totalEquipment: number;
  byHealth: Record<HealthStatus, number>;
  byType: Record<string, number>;
  upcomingMaintenanceCount: number;
  overdueMaintenanceCount: number;
  predictedFailures30Days: number;
  averageHealthScore: number;
  totalMaintenanceCostYTD: number;
  costSavingsFromPredictive: number;
}

// ============================================================================
// Constants
// ============================================================================

const COLLECTION = "equipment";
const PREDICTIONS_COLLECTION = "maintenance_predictions";

/**
 * Base failure rates by equipment type (annual probability)
 */
const BASE_FAILURE_RATES: Record<EquipmentType, number> = {
  [EquipmentType.HVAC]: 0.15,
  [EquipmentType.ELEVATOR]: 0.08,
  [EquipmentType.PLUMBING]: 0.12,
  [EquipmentType.ELECTRICAL]: 0.10,
  [EquipmentType.FIRE_SAFETY]: 0.05,
  [EquipmentType.GENERATOR]: 0.18,
  [EquipmentType.WATER_HEATER]: 0.20,
  [EquipmentType.SECURITY_SYSTEM]: 0.08,
  [EquipmentType.POOL]: 0.22,
  [EquipmentType.IRRIGATION]: 0.25,
  [EquipmentType.APPLIANCE]: 0.15,
  [EquipmentType.STRUCTURAL]: 0.02,
  [EquipmentType.OTHER]: 0.12,
};

/**
 * Maintenance interval recommendations (days)
 */
const _RECOMMENDED_INTERVALS: Record<EquipmentType, number> = {
  [EquipmentType.HVAC]: 90,
  [EquipmentType.ELEVATOR]: 30,
  [EquipmentType.PLUMBING]: 180,
  [EquipmentType.ELECTRICAL]: 365,
  [EquipmentType.FIRE_SAFETY]: 90,
  [EquipmentType.GENERATOR]: 60,
  [EquipmentType.WATER_HEATER]: 365,
  [EquipmentType.SECURITY_SYSTEM]: 180,
  [EquipmentType.POOL]: 30,
  [EquipmentType.IRRIGATION]: 90,
  [EquipmentType.APPLIANCE]: 180,
  [EquipmentType.STRUCTURAL]: 365,
  [EquipmentType.OTHER]: 180,
};

// ============================================================================
// Equipment Management
// ============================================================================

/**
 * Register new equipment for monitoring
 */
export async function registerEquipment(
  data: Omit<EquipmentRecord, "_id" | "healthScore" | "healthStatus" | "failureProbability" | 
    "estimatedRemainingLife" | "totalMaintenanceCost" | "maintenanceHistory" | "predictions" | 
    "createdAt" | "updatedAt">
): Promise<{ success: boolean; equipmentId?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    if (!Number.isFinite(data.expectedLifespan) || data.expectedLifespan <= 0) {
      return { success: false, error: "Expected lifespan must be a positive number" };
    }
    
    // Calculate initial health score based on age
    const ageMonths = Math.floor(
      (Date.now() - data.installDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
    );
    const lifespanRatio = ageMonths / data.expectedLifespan;
    const initialHealthScore = Math.max(0, Math.min(100, 100 - (lifespanRatio * 50)));
    
    const equipment: Omit<EquipmentRecord, "_id"> = {
      ...data,
      healthScore: initialHealthScore,
      healthStatus: getHealthStatus(initialHealthScore),
      failureProbability: calculateBaseFailureProbability(data.type, lifespanRatio),
      estimatedRemainingLife: Math.max(0, data.expectedLifespan - ageMonths),
      totalMaintenanceCost: 0,
      maintenanceHistory: [],
      predictions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection(COLLECTION).insertOne(equipment);
    
    logger.info("Equipment registered for predictive maintenance", {
      component: "predictive-maintenance",
      action: "registerEquipment",
    });
    
    return { success: true, equipmentId: result.insertedId.toString() };
  } catch (_error) {
    logger.error("Failed to register equipment", { component: "predictive-maintenance" });
    return { success: false, error: "Failed to register equipment" };
  }
}

/**
 * Get equipment by ID
 */
export async function getEquipmentById(
  equipmentId: string,
  orgId: string
): Promise<EquipmentRecord | null> {
  try {
    if (!ObjectId.isValid(equipmentId)) {
      return null;
    }
    const db = await getDatabase();
    const equipment = await db.collection(COLLECTION).findOne({
      _id: new ObjectId(equipmentId),
      orgId,
    }) as WithId<Document> | null;
    
    return equipment as unknown as EquipmentRecord;
  } catch (error) {
    logger.error("Failed to get equipment", { 
      component: "predictive-maintenance",
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Get all equipment for a property
 */
export async function getEquipmentByProperty(
  propertyId: string,
  orgId: string,
  options?: {
    type?: EquipmentType;
    healthStatus?: HealthStatus;
    limit?: number;
  }
): Promise<EquipmentRecord[]> {
  try {
    const db = await getDatabase();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = { propertyId, orgId };
    if (options?.type) filter.type = options.type;
    if (options?.healthStatus) filter.healthStatus = options.healthStatus;
    
    const equipment = await db.collection(COLLECTION)
      .find(filter)
      .sort({ healthScore: 1 }) // Worst first
      .limit(options?.limit || 100)
      .toArray();
    
    return equipment as unknown as EquipmentRecord[];
  } catch (error) {
    logger.error("Failed to get equipment by property", { 
      component: "predictive-maintenance",
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/**
 * Record maintenance event and update health metrics
 */
export async function recordMaintenanceEvent(
  equipmentId: string,
  orgId: string,
  event: Omit<MaintenanceEvent, "date">
): Promise<{ success: boolean; newHealthScore?: number; error?: string; partialFailure?: boolean; predictionError?: string }> {
  try {
    const db = await getDatabase();
    const now = new Date();
    
    // Calculate health improvement based on maintenance type
    let healthImprovement = 0;
    switch (event.type) {
      case "preventive":
        healthImprovement = 15;
        break;
      case "corrective":
        healthImprovement = 25;
        break;
      case "emergency":
        healthImprovement = 20;
        break;
      case "inspection":
        healthImprovement = 5;
        break;
    }
    
    const maintenanceEvent: MaintenanceEvent = {
      ...event,
      date: now,
    };
    
    const updatePipeline = [
      {
        $set: {
          maintenanceHistory: { $concatArrays: ["$maintenanceHistory", [maintenanceEvent]] },
          healthScore: { $min: [100, { $add: ["$healthScore", healthImprovement] }] },
          lastMaintenanceDate: now,
          nextScheduledMaintenance: {
            $dateAdd: {
              startDate: now,
              unit: "day",
              amount: "$maintenanceIntervalDays",
            },
          },
          updatedAt: now,
          totalMaintenanceCost: { $add: ["$totalMaintenanceCost", event.cost] },
        },
      },
      {
        $set: {
          healthStatus: {
            $switch: {
              branches: [
                { case: { $gte: ["$healthScore", 90] }, then: HealthStatus.EXCELLENT },
                { case: { $gte: ["$healthScore", 70] }, then: HealthStatus.GOOD },
                { case: { $gte: ["$healthScore", 50] }, then: HealthStatus.FAIR },
                { case: { $gte: ["$healthScore", 30] }, then: HealthStatus.POOR },
              ],
              default: HealthStatus.CRITICAL,
            },
          },
        },
      },
    ];
    
    const updateResult = await db.collection(COLLECTION).findOneAndUpdate(
      { _id: new ObjectId(equipmentId), orgId },
      updatePipeline,
      { returnDocument: "after" }
    );
    
    const updatedEquipment = updateResult?.value as EquipmentRecord | null;
    if (!updatedEquipment) {
      return { success: false, error: "Equipment not found" };
    }
    
    const newHealthScore = updatedEquipment.healthScore;
    
    try {
      // Recalculate predictions after maintenance
      await generatePredictions(equipmentId, orgId);
    } catch (error) {
      logger.error("Failed to update predictions after maintenance", {
        component: "predictive-maintenance",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // Maintenance record was already saved - return partial success to avoid duplicate retries
      return { 
        success: true, 
        newHealthScore,
        partialFailure: true,
        predictionError: error instanceof Error ? error.message : "Prediction update failed",
      };
    }
    
    logger.info("Maintenance event recorded", {
      component: "predictive-maintenance",
      action: "recordMaintenanceEvent",
    });
    
    return { success: true, newHealthScore };
  } catch (_error) {
    logger.error("Failed to record maintenance event", { component: "predictive-maintenance" });
    return { success: false, error: "Failed to record maintenance event" };
  }
}

// ============================================================================
// Predictive Analytics Engine
// ============================================================================

/**
 * Generate failure predictions for equipment
 */
export async function generatePredictions(
  equipmentId: string,
  orgId: string
): Promise<FailurePrediction[]> {
  try {
    const equipment = await getEquipmentById(equipmentId, orgId);
    if (!equipment) return [];
    
    if (!Number.isFinite(equipment.expectedLifespan) || equipment.expectedLifespan <= 0) {
      logger.error("Invalid expected lifespan on equipment", {
        component: "predictive-maintenance",
        equipmentId,
        expectedLifespan: equipment.expectedLifespan,
      });
      return [];
    }
    
    const predictions: FailurePrediction[] = [];
    const now = new Date();
    
    // Analyze maintenance history patterns
    const historyAnalysis = analyzeMaintenanceHistory(equipment);
    
    // Calculate age-based risk
    const ageMonths = Math.floor(
      (now.getTime() - equipment.installDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
    );
    const lifespanRatio = ageMonths / equipment.expectedLifespan;
    
    // Days since last maintenance
    const daysSinceMaintenance = equipment.lastMaintenanceDate
      ? Math.floor((now.getTime() - equipment.lastMaintenanceDate.getTime()) / (24 * 60 * 60 * 1000))
      : 999;
    
    // Generate predictions based on multiple factors
    const failureProbability = calculateAdvancedFailureProbability(
      equipment.type,
      lifespanRatio,
      daysSinceMaintenance,
      equipment.maintenanceIntervalDays,
      historyAnalysis
    );
    
    // Component-specific predictions
    const componentPredictions = getComponentPredictions(equipment.type, failureProbability);
    
    for (const comp of componentPredictions) {
      if (comp.probability > 0.15) { // Only predict if >15% chance
        const estimatedDate = new Date();
        estimatedDate.setDate(estimatedDate.getDate() + comp.daysToFailure);
        
        predictions.push({
          predictedAt: now,
          component: comp.name,
          failureType: comp.failureType,
          probability: comp.probability,
          confidence: getConfidenceLevel(comp.probability, historyAnalysis.dataPoints),
          estimatedDate,
          urgency: getMaintenancePriority(comp.daysToFailure),
          recommendedAction: comp.recommendedAction,
          estimatedCost: comp.estimatedCost,
          impactIfIgnored: comp.impact,
          dataPoints: historyAnalysis.dataPoints,
          modelVersion: "1.0.0",
        });
      }
    }
    
    // Store predictions atomically in both equipment and predictions collection
    // Note: Using native MongoDB driver, not mongoose sessions
    const db = await getDatabase();
    const client = db.client;
    const session = client.startSession();
    
    try {
      await session.withTransaction(async () => {
        await db.collection(COLLECTION).updateOne(
          { _id: new ObjectId(equipmentId), orgId },
          {
            $set: {
              predictions,
              failureProbability,
              updatedAt: now,
            },
          },
          { session }
        );
        
        // Store in predictions collection for analytics
        if (predictions.length > 0) {
          await db.collection(PREDICTIONS_COLLECTION).insertOne({
            orgId,
            equipmentId,
            propertyId: equipment.propertyId,
            predictions,
            generatedAt: now,
          }, { session });
        }
      });
    } finally {
      await session.endSession();
    }
    
    return predictions;
  } catch (_error) {
    logger.error("Failed to generate predictions", { component: "predictive-maintenance" });
    return [];
  }
}

/**
 * Generate predictions for all equipment in an organization
 */
export async function runOrgPredictionCycle(
  orgId: string
): Promise<{ processed: number; predictions: number }> {
  try {
    const db = await getDatabase();
    const batchSize = 200;
    const concurrencyLimit = 6;
    const cursor = db.collection(COLLECTION).find({ orgId }).batchSize(batchSize);
    
    let processed = 0;
    let totalPredictions = 0;
    const batch: EquipmentRecord[] = [];
    
    const processBatch = async (items: EquipmentRecord[]) => {
      // Use atomic counter pattern to prevent race condition with shared index
      let nextIndex = 0;
      const getNextIndex = () => {
        const idx = nextIndex;
        nextIndex += 1;
        return idx;
      };
      
      const workers = Array.from({ length: Math.min(concurrencyLimit, items.length) }, async () => {
        while (true) {
          const currentIndex = getNextIndex();
          if (currentIndex >= items.length) break;
          
          const current = items[currentIndex];
          processed += 1;
          if (!current._id) {
            continue;
          }
          
          try {
            const predictions = await generatePredictions(current._id.toString(), orgId);
            totalPredictions += predictions.length;
          } catch (error) {
            logger.warn("Prediction generation failed for equipment", {
              component: "predictive-maintenance",
              equipmentId: current._id.toString(),
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }
      });
      await Promise.all(workers);
    };
    
    for await (const doc of cursor) {
      batch.push(doc as EquipmentRecord);
      if (batch.length >= batchSize) {
        await processBatch(batch.splice(0, batch.length));
      }
    }
    
    if (batch.length > 0) {
      await processBatch(batch.splice(0, batch.length));
    }
    
    logger.info("Org prediction cycle complete", {
      component: "predictive-maintenance",
      action: "runOrgPredictionCycle",
    });
    
    return { processed, predictions: totalPredictions };
  } catch (_error) {
    logger.error("Failed to run org prediction cycle", { component: "predictive-maintenance" });
    return { processed: 0, predictions: 0 };
  }
}

/**
 * Get maintenance recommendations based on predictions
 */
export async function getMaintenanceRecommendations(
  orgId: string,
  options?: {
    propertyId?: string;
    priority?: MaintenancePriority;
    limit?: number;
    daysAhead?: number;
  }
): Promise<MaintenanceRecommendation[]> {
  try {
    const db = await getDatabase();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + (options?.daysAhead || 30));
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {
      orgId,
      "predictions.estimatedDate": { $lte: cutoffDate },
      "predictions.probability": { $gte: 0.2 },
    };
    
    if (options?.propertyId) filter.propertyId = options.propertyId;
    
    const equipment = await db.collection(COLLECTION)
      .find(filter)
      .limit(options?.limit || 50)
      .toArray() as unknown as EquipmentRecord[];
    
    const recommendations: MaintenanceRecommendation[] = [];
    
    for (const eq of equipment) {
      for (const pred of eq.predictions) {
        if (pred.probability >= 0.2 && pred.estimatedDate <= cutoffDate) {
          if (!options?.priority || pred.urgency === options.priority) {
            recommendations.push({
              equipmentId: eq._id?.toString() || "",
              equipmentName: eq.name,
              propertyId: eq.propertyId,
              priority: pred.urgency,
              recommendedDate: new Date(Math.min(
                pred.estimatedDate.getTime(),
                Date.now() + 7 * 24 * 60 * 60 * 1000
              )),
              action: pred.recommendedAction,
              reason: `${pred.component}: ${pred.failureType} - ${Math.round(pred.probability * 100)}% probability`,
              estimatedCost: pred.estimatedCost,
              estimatedDuration: getEstimatedDuration(eq.type, pred.failureType),
              requiredSkills: getRequiredSkills(eq.type),
              confidence: pred.confidence,
            });
          }
        }
      }
    }
    
    // Sort by priority and date
    recommendations.sort((a, b) => {
      const priorityOrder = { immediate: 0, urgent: 1, scheduled: 2, routine: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.recommendedDate.getTime() - b.recommendedDate.getTime();
    });
    
    return recommendations;
  } catch (_error) {
    logger.error("Failed to get maintenance recommendations", { component: "predictive-maintenance" });
    return [];
  }
}

/**
 * Get equipment health analytics for dashboard
 */
export async function getEquipmentAnalytics(
  orgId: string,
  propertyId?: string
): Promise<EquipmentAnalytics> {
  try {
    const db = await getDatabase();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = { orgId };
    if (propertyId) filter.propertyId = propertyId;
    
    const equipment = await db.collection(COLLECTION)
      .find(filter)
      .toArray() as unknown as EquipmentRecord[];
    
    const now = new Date();
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);
    
    const analytics: EquipmentAnalytics = {
      totalEquipment: equipment.length,
      byHealth: {
        [HealthStatus.EXCELLENT]: 0,
        [HealthStatus.GOOD]: 0,
        [HealthStatus.FAIR]: 0,
        [HealthStatus.POOR]: 0,
        [HealthStatus.CRITICAL]: 0,
      },
      byType: {},
      upcomingMaintenanceCount: 0,
      overdueMaintenanceCount: 0,
      predictedFailures30Days: 0,
      averageHealthScore: 0,
      totalMaintenanceCostYTD: 0,
      costSavingsFromPredictive: 0,
    };
    
    const yearStart = new Date(now.getFullYear(), 0, 1);
    let healthSum = 0;
    
    for (const eq of equipment) {
      // Health distribution
      analytics.byHealth[eq.healthStatus] = (analytics.byHealth[eq.healthStatus] || 0) + 1;
      
      // Type distribution
      analytics.byType[eq.type] = (analytics.byType[eq.type] || 0) + 1;
      
      // Health score sum
      healthSum += eq.healthScore;
      
      // Upcoming/overdue maintenance
      if (eq.nextScheduledMaintenance) {
        if (eq.nextScheduledMaintenance < now) {
          analytics.overdueMaintenanceCount++;
        } else if (eq.nextScheduledMaintenance <= thirtyDaysAhead) {
          analytics.upcomingMaintenanceCount++;
        }
      }
      
      // Predicted failures in 30 days
      for (const pred of eq.predictions) {
        if (pred.estimatedDate <= thirtyDaysAhead && pred.probability > 0.5) {
          analytics.predictedFailures30Days++;
        }
      }
      
      // YTD maintenance cost
      for (const event of eq.maintenanceHistory) {
        if (event.date >= yearStart) {
          analytics.totalMaintenanceCostYTD += event.cost;
        }
      }
    }
    
    analytics.averageHealthScore = equipment.length > 0 
      ? Math.round(healthSum / equipment.length) 
      : 0;
    
    // Estimate cost savings (preventive vs reactive maintenance)
    // Industry average: preventive costs 40% less than reactive
    analytics.costSavingsFromPredictive = Math.round(analytics.totalMaintenanceCostYTD * 0.25);
    
    return analytics;
  } catch (_error) {
    logger.error("Failed to get equipment analytics", { component: "predictive-maintenance" });
    return {
      totalEquipment: 0,
      byHealth: getEmptyHealthDistribution(),
      byType: {},
      upcomingMaintenanceCount: 0,
      overdueMaintenanceCount: 0,
      predictedFailures30Days: 0,
      averageHealthScore: 0,
      totalMaintenanceCostYTD: 0,
      costSavingsFromPredictive: 0,
    };
  }
}

/**
 * Auto-generate work orders for high-priority predictions
 */
export async function autoGenerateWorkOrders(
  orgId: string,
  options?: {
    minProbability?: number;
    maxPriority?: MaintenancePriority;
  }
): Promise<{ created: number; workOrderIds: string[] }> {
  try {
    const db = await getDatabase();
    const minConfidence = options?.minProbability || 0.7; // Threshold for confidence level
    const workOrderIds: string[] = [];
    
    const recommendations = await getMaintenanceRecommendations(orgId, {
      priority: options?.maxPriority || MaintenancePriority.URGENT,
      daysAhead: 14,
    });
    
    // Filter by priority AND minimum confidence level
    // Map confidence level to a numeric value for comparison
    const confidenceToNumber = (c: ConfidenceLevel): number => {
      switch (c) {
        case ConfidenceLevel.HIGH: return 0.9;
        case ConfidenceLevel.MEDIUM: return 0.7;
        case ConfidenceLevel.LOW: return 0.5;
        default: return 0.5;
      }
    };
    
    const highPriorityRecs = recommendations.filter(r => 
      (r.priority === MaintenancePriority.IMMEDIATE || r.priority === MaintenancePriority.URGENT) &&
      confidenceToNumber(r.confidence) >= minConfidence
    );
    
    for (const rec of highPriorityRecs) {
      // Check if work order already exists
      const existingWO = await db.collection("work_orders").findOne({
        orgId,
        propertyId: rec.propertyId,
        source: "predictive_maintenance",
        "metadata.equipmentId": rec.equipmentId,
        status: { $nin: ["completed", "cancelled"] },
      });
      
      if (!existingWO) {
        const workOrder = {
          orgId,
          propertyId: rec.propertyId,
          title: `Predictive Maintenance: ${rec.equipmentName}`,
          description: `${rec.action}\n\nReason: ${rec.reason}\n\nEstimated Cost: SAR ${rec.estimatedCost}\nConfidence: ${rec.confidence}`,
          priority: rec.priority === MaintenancePriority.IMMEDIATE ? "emergency" : "high",
          status: "open",
          category: "maintenance",
          source: "predictive_maintenance",
          scheduledDate: rec.recommendedDate,
          estimatedDuration: rec.estimatedDuration,
          requiredSkills: rec.requiredSkills,
          metadata: {
            equipmentId: rec.equipmentId,
            aiGenerated: true,
            confidence: rec.confidence,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        const result = await db.collection("work_orders").insertOne(workOrder);
        workOrderIds.push(result.insertedId.toString());
      }
    }
    
    if (workOrderIds.length > 0) {
      logger.info("Auto-generated predictive maintenance work orders", {
        component: "predictive-maintenance",
        action: "autoGenerateWorkOrders",
      });
    }
    
    return { created: workOrderIds.length, workOrderIds };
  } catch (_error) {
    logger.error("Failed to auto-generate work orders", { component: "predictive-maintenance" });
    return { created: 0, workOrderIds: [] };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function getHealthStatus(score: number): HealthStatus {
  if (score >= 90) return HealthStatus.EXCELLENT;
  if (score >= 70) return HealthStatus.GOOD;
  if (score >= 50) return HealthStatus.FAIR;
  if (score >= 30) return HealthStatus.POOR;
  return HealthStatus.CRITICAL;
}

function getEmptyHealthDistribution(): Record<HealthStatus, number> {
  return {
    [HealthStatus.EXCELLENT]: 0,
    [HealthStatus.GOOD]: 0,
    [HealthStatus.FAIR]: 0,
    [HealthStatus.POOR]: 0,
    [HealthStatus.CRITICAL]: 0,
  };
}

function calculateBaseFailureProbability(type: EquipmentType, lifespanRatio: number): number {
  const baseRate = BASE_FAILURE_RATES[type];
  // Exponential increase as equipment ages
  return Math.min(0.95, baseRate * Math.pow(1.5, lifespanRatio));
}

interface HistoryAnalysis {
  dataPoints: number;
  avgDaysBetweenMaintenance: number;
  emergencyRatio: number;
  recentTrend: "improving" | "stable" | "declining";
}

function analyzeMaintenanceHistory(equipment: EquipmentRecord): HistoryAnalysis {
  const history = equipment.maintenanceHistory;
  const dataPoints = history.length;
  
  if (dataPoints < 2) {
    return {
      dataPoints,
      avgDaysBetweenMaintenance: equipment.maintenanceIntervalDays,
      emergencyRatio: 0,
      recentTrend: "stable",
    };
  }
  
  // Sort history by date (ascending) to ensure correct diff calculation
  const sortedHistory = [...history].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Calculate average days between maintenance
  let totalDays = 0;
  for (let i = 1; i < sortedHistory.length; i++) {
    const diff = new Date(sortedHistory[i].date).getTime() - new Date(sortedHistory[i - 1].date).getTime();
    totalDays += diff / (24 * 60 * 60 * 1000);
  }
  const avgDays = totalDays / (sortedHistory.length - 1);
  
  // Calculate emergency ratio
  const emergencies = sortedHistory.filter(h => h.type === "emergency").length;
  const emergencyRatio = emergencies / sortedHistory.length;
  
  // Determine trend from last 3 events
  const recent = sortedHistory.slice(-3);
  const recentEmergencies = recent.filter(h => h.type === "emergency").length;
  let recentTrend: "improving" | "stable" | "declining" = "stable";
  if (recentEmergencies >= 2) recentTrend = "declining";
  else if (recentEmergencies === 0 && recent.every(h => h.type === "preventive")) {
    recentTrend = "improving";
  }
  
  return {
    dataPoints,
    avgDaysBetweenMaintenance: avgDays,
    emergencyRatio,
    recentTrend,
  };
}

function calculateAdvancedFailureProbability(
  type: EquipmentType,
  lifespanRatio: number,
  daysSinceMaintenance: number,
  intervalDays: number,
  history: HistoryAnalysis
): number {
  let probability = calculateBaseFailureProbability(type, lifespanRatio);
  
  // Adjust for maintenance delay
  const maintenanceDelay = daysSinceMaintenance / intervalDays;
  if (maintenanceDelay > 1.5) {
    probability *= 1 + (maintenanceDelay - 1) * 0.3;
  }
  
  // Adjust for emergency ratio
  probability *= 1 + history.emergencyRatio * 0.5;
  
  // Adjust for trend
  if (history.recentTrend === "declining") probability *= 1.2;
  if (history.recentTrend === "improving") probability *= 0.8;
  
  return Math.min(0.95, probability);
}

interface ComponentPrediction {
  name: string;
  failureType: string;
  probability: number;
  daysToFailure: number;
  recommendedAction: string;
  estimatedCost: number;
  impact: string;
}

function getComponentPredictions(
  type: EquipmentType,
  baseFailureProbability: number
): ComponentPrediction[] {
  // Component-specific predictions based on equipment type
  const predictions: ComponentPrediction[] = [];
  
  // Guard against division by zero/small values and cap days
  const MIN_PROBABILITY = 1e-6;
  const MAX_DAYS = 3650; // Cap at 10 years
  const safeProbability = Math.max(baseFailureProbability, MIN_PROBABILITY);
  
  // Helper to clamp probability to valid 0-1 range
  const clampProbability = (p: number): number => Math.max(0, Math.min(1, p));
  
  const calculateDaysToFailure = (factor: number): number => {
    const days = Math.round(factor / safeProbability);
    return Math.min(days, MAX_DAYS);
  };
  
  switch (type) {
    case EquipmentType.HVAC:
      predictions.push(
        {
          name: "Compressor",
          failureType: "Refrigerant leak",
          probability: clampProbability(baseFailureProbability * 0.8),
          daysToFailure: calculateDaysToFailure(60),
          recommendedAction: "Check refrigerant levels and inspect for leaks",
          estimatedCost: 1500,
          impact: "Complete cooling failure, tenant discomfort",
        },
        {
          name: "Fan Motor",
          failureType: "Bearing wear",
          probability: clampProbability(baseFailureProbability * 0.6),
          daysToFailure: calculateDaysToFailure(45),
          recommendedAction: "Inspect fan motor bearings and lubricate",
          estimatedCost: 800,
          impact: "Reduced airflow, increased energy consumption",
        },
        {
          name: "Filters",
          failureType: "Clogging",
          probability: clampProbability(baseFailureProbability * 1.2),
          daysToFailure: calculateDaysToFailure(30),
          recommendedAction: "Replace air filters",
          estimatedCost: 150,
          impact: "Poor air quality, reduced efficiency",
        }
      );
      break;
      
    case EquipmentType.ELEVATOR:
      predictions.push(
        {
          name: "Control Board",
          failureType: "Electronic failure",
          probability: clampProbability(baseFailureProbability * 0.5),
          daysToFailure: calculateDaysToFailure(90),
          recommendedAction: "Diagnostic check and firmware update",
          estimatedCost: 3000,
          impact: "Elevator shutdown, accessibility issues",
        },
        {
          name: "Door Mechanism",
          failureType: "Sensor misalignment",
          probability: clampProbability(baseFailureProbability * 0.9),
          daysToFailure: calculateDaysToFailure(30),
          recommendedAction: "Adjust door sensors and clean tracks",
          estimatedCost: 500,
          impact: "Door malfunctions, safety concerns",
        },
        {
          name: "Cables",
          failureType: "Wear and fraying",
          probability: clampProbability(baseFailureProbability * 0.3),
          daysToFailure: calculateDaysToFailure(180),
          recommendedAction: "Cable inspection and tension adjustment",
          estimatedCost: 5000,
          impact: "Critical safety risk, mandatory shutdown",
        }
      );
      break;
      
    case EquipmentType.PLUMBING:
      predictions.push(
        {
          name: "Pipes",
          failureType: "Corrosion/leak",
          probability: clampProbability(baseFailureProbability * 0.7),
          daysToFailure: calculateDaysToFailure(60),
          recommendedAction: "Pipe inspection and pressure test",
          estimatedCost: 1000,
          impact: "Water damage, tenant disruption",
        },
        {
          name: "Water Heater",
          failureType: "Element failure",
          probability: clampProbability(baseFailureProbability * 0.8),
          daysToFailure: calculateDaysToFailure(45),
          recommendedAction: "Inspect heating elements and anode rod",
          estimatedCost: 400,
          impact: "No hot water, tenant complaints",
        }
      );
      break;
      
    default:
      predictions.push({
        name: "General",
        failureType: "Component wear",
        probability: baseFailureProbability,
        daysToFailure: calculateDaysToFailure(60),
        recommendedAction: "General inspection and maintenance",
        estimatedCost: 500,
        impact: "Equipment downtime",
      });
  }
  
  return predictions;
}

function getConfidenceLevel(probability: number, dataPoints: number): ConfidenceLevel {
  // More data points = higher confidence
  const dataConfidence = Math.min(1, dataPoints / 10);
  const adjustedConfidence = probability * dataConfidence;
  
  if (adjustedConfidence > 0.7) return ConfidenceLevel.HIGH;
  if (adjustedConfidence > 0.4) return ConfidenceLevel.MEDIUM;
  return ConfidenceLevel.LOW;
}

function getMaintenancePriority(daysToFailure: number): MaintenancePriority {
  if (daysToFailure <= 1) return MaintenancePriority.IMMEDIATE;
  if (daysToFailure <= 7) return MaintenancePriority.URGENT;
  if (daysToFailure <= 30) return MaintenancePriority.SCHEDULED;
  return MaintenancePriority.ROUTINE;
}

function getEstimatedDuration(type: EquipmentType, _failureType: string): number {
  // Hours based on equipment type
  const durations: Record<EquipmentType, number> = {
    [EquipmentType.HVAC]: 4,
    [EquipmentType.ELEVATOR]: 6,
    [EquipmentType.PLUMBING]: 3,
    [EquipmentType.ELECTRICAL]: 2,
    [EquipmentType.FIRE_SAFETY]: 2,
    [EquipmentType.GENERATOR]: 4,
    [EquipmentType.WATER_HEATER]: 2,
    [EquipmentType.SECURITY_SYSTEM]: 2,
    [EquipmentType.POOL]: 3,
    [EquipmentType.IRRIGATION]: 2,
    [EquipmentType.APPLIANCE]: 1,
    [EquipmentType.STRUCTURAL]: 8,
    [EquipmentType.OTHER]: 2,
  };
  
  return durations[type] || 2;
}

function getRequiredSkills(type: EquipmentType): string[] {
  const skills: Record<EquipmentType, string[]> = {
    [EquipmentType.HVAC]: ["hvac", "refrigeration", "electrical"],
    [EquipmentType.ELEVATOR]: ["elevator_certified", "electrical", "mechanical"],
    [EquipmentType.PLUMBING]: ["plumbing", "pipefitting"],
    [EquipmentType.ELECTRICAL]: ["electrical", "wiring"],
    [EquipmentType.FIRE_SAFETY]: ["fire_safety", "electrical"],
    [EquipmentType.GENERATOR]: ["generator", "electrical", "mechanical"],
    [EquipmentType.WATER_HEATER]: ["plumbing", "electrical"],
    [EquipmentType.SECURITY_SYSTEM]: ["security_systems", "electrical", "networking"],
    [EquipmentType.POOL]: ["pool_maintenance", "chemical_handling"],
    [EquipmentType.IRRIGATION]: ["irrigation", "landscaping"],
    [EquipmentType.APPLIANCE]: ["appliance_repair"],
    [EquipmentType.STRUCTURAL]: ["structural", "construction"],
    [EquipmentType.OTHER]: ["general_maintenance"],
  };
  
  return skills[type] || ["general_maintenance"];
}

// ============================================================================
// Exports
// ============================================================================

export default {
  // Equipment Management
  registerEquipment,
  getEquipmentById,
  getEquipmentByProperty,
  recordMaintenanceEvent,
  
  // Predictive Analytics
  generatePredictions,
  runOrgPredictionCycle,
  getMaintenanceRecommendations,
  getEquipmentAnalytics,
  autoGenerateWorkOrders,
};
