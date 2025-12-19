/**
 * @fileoverview Work Order Auto-Assignment Engine
 * @description Automatically assigns work orders to technicians or vendors based on
 * category, skills, availability, workload, and performance metrics.
 * @module fm/auto-assignment
 */

import { Types } from "mongoose";
import { WorkOrder } from "@/server/models/WorkOrder";
import { Vendor } from "@/server/models/Vendor";
import { User } from "@/server/models/User";
import { logger } from "@/lib/logger";

/**
 * Assignment candidate with scoring
 */
export interface AssignmentCandidate {
  type: "user" | "vendor";
  id: string;
  name: string;
  score: number;
  reasons: string[];
  availability: "available" | "busy" | "offline";
  currentWorkload: number;
  maxWorkload: number;
  skills: string[];
  averageRating?: number;
  lastAssignedAt?: Date;
}

/**
 * Auto-assignment configuration per org
 */
export interface AutoAssignConfig {
  enabled: boolean;
  preferVendors: boolean;
  preferInternal: boolean;
  maxWorkloadPerTechnician: number;
  considerRating: boolean;
  ratingWeight: number;
  workloadWeight: number;
  skillMatchWeight: number;
  roundRobinEnabled: boolean;
  excludeWeekends: boolean;
  businessHoursOnly: boolean;
  businessHoursStart: number; // 0-23
  businessHoursEnd: number;   // 0-23
}

const DEFAULT_CONFIG: AutoAssignConfig = {
  enabled: true,
  preferVendors: false,
  preferInternal: true,
  maxWorkloadPerTechnician: 10,
  considerRating: true,
  ratingWeight: 0.3,
  workloadWeight: 0.4,
  skillMatchWeight: 0.3,
  roundRobinEnabled: true,
  excludeWeekends: false,
  businessHoursOnly: true,
  businessHoursStart: 8,
  businessHoursEnd: 18,
};

/**
 * Work Order Auto-Assignment Engine
 *
 * Selects the best technician or vendor for a work order based on:
 * 1. Category/skill match
 * 2. Current workload
 * 3. Performance rating
 * 4. Last assignment time (round-robin)
 * 5. Availability
 */
export class AutoAssignmentEngine {
  private orgId: string;
  private config: AutoAssignConfig;

  constructor(orgId: string, config?: Partial<AutoAssignConfig>) {
    this.orgId = orgId;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Find the best assignee for a work order
   */
  async findBestAssignee(workOrderId: string): Promise<AssignmentCandidate | null> {
    try {
      // Fetch work order with tenant scope
      const workOrder = await WorkOrder.findOne({
        _id: new Types.ObjectId(workOrderId),
        orgId: this.orgId,
      }).lean();

      if (!workOrder) {
        logger.warn("[AutoAssign] Work order not found", { workOrderId, orgId: this.orgId });
        return null;
      }

      // Get candidates
      const candidates = await this.getCandidates(workOrder);

      if (candidates.length === 0) {
        logger.info("[AutoAssign] No candidates available", {
          workOrderId,
          category: workOrder.category,
        });
        return null;
      }

      // Score and rank candidates
      const scoredCandidates = this.scoreCandidates(candidates, workOrder);
      const sortedCandidates = scoredCandidates.sort((a, b) => b.score - a.score);

      // Return top candidate
      const bestCandidate = sortedCandidates[0];

      logger.info("[AutoAssign] Best candidate selected", {
        workOrderId,
        candidateId: bestCandidate.id,
        candidateType: bestCandidate.type,
        score: bestCandidate.score,
        reasons: bestCandidate.reasons,
      });

      return bestCandidate;
    } catch (error) {
      logger.error("[AutoAssign] Error finding best assignee", { error, workOrderId });
      throw error;
    }
  }

  /**
   * Auto-assign a work order
   */
  async autoAssign(
    workOrderId: string,
    assignedBy: string
  ): Promise<{ success: boolean; assignee?: AssignmentCandidate; error?: string }> {
    try {
      const bestCandidate = await this.findBestAssignee(workOrderId);

      if (!bestCandidate) {
        return { success: false, error: "No suitable assignee found" };
      }

      // Update work order with assignment
      const updateResult = await WorkOrder.updateOne(
        {
          _id: new Types.ObjectId(workOrderId),
          orgId: this.orgId,
        },
        {
          $set: {
            "assignment.assignedTo": {
              ...(bestCandidate.type === "user" && { userId: bestCandidate.id }),
              ...(bestCandidate.type === "vendor" && { vendorId: bestCandidate.id }),
            },
            "assignment.assignedAt": new Date(),
            "assignment.assignedBy": assignedBy,
            "assignment.autoAssigned": true,
            status: "ASSIGNED",
            updatedAt: new Date(),
          },
          $push: {
            "timeline.history": {
              action: "AUTO_ASSIGNED",
              performedBy: "system",
              performedAt: new Date(),
              notes: `Auto-assigned to ${bestCandidate.name}. Reasons: ${bestCandidate.reasons.join(", ")}`,
            },
          },
        }
      );

      if (updateResult.modifiedCount === 0) {
        return { success: false, error: "Failed to update work order" };
      }

      // Update candidate's last assignment time
      if (bestCandidate.type === "user") {
        await User.updateOne(
          { _id: new Types.ObjectId(bestCandidate.id) },
          { $set: { lastAssignedAt: new Date() } }
        );
      } else {
        await Vendor.updateOne(
          { _id: new Types.ObjectId(bestCandidate.id) },
          { $set: { lastAssignedAt: new Date() } }
        );
      }

      return { success: true, assignee: bestCandidate };
    } catch (error) {
      logger.error("[AutoAssign] Error auto-assigning work order", { error, workOrderId });
      return { success: false, error: "Internal error during assignment" };
    }
  }

  /**
   * Get all potential candidates for assignment
   */
  private async getCandidates(workOrder: { category?: string; type?: string }): Promise<AssignmentCandidate[]> {
    const candidates: AssignmentCandidate[] = [];

    // Get internal technicians
    if (this.config.preferInternal || !this.config.preferVendors) {
      const technicians = await User.find({
        orgId: this.orgId,
        role: { $in: ["TECHNICIAN", "TECHNICIAN_LEAD"] },
        isActive: { $ne: false },
      }).lean();

      // Get their current workload
      const techIds = technicians.map((t) => t._id.toString());
      const workloads = await this.getWorkloads("user", techIds);

      for (const tech of technicians) {
        const techId = tech._id.toString();
        const workload = workloads.get(techId) || 0;
        const techTyped = tech as unknown as {
          name?: string;
          email?: string;
          skills?: string[];
          averageRating?: number;
          lastAssignedAt?: Date;
        };

        candidates.push({
          type: "user",
          id: techId,
          name: techTyped.name || tech.email || "Unknown",
          score: 0,
          reasons: [],
          availability: workload >= this.config.maxWorkloadPerTechnician ? "busy" : "available",
          currentWorkload: workload,
          maxWorkload: this.config.maxWorkloadPerTechnician,
          skills: techTyped.skills || [],
          averageRating: techTyped.averageRating,
          lastAssignedAt: techTyped.lastAssignedAt,
        });
      }
    }

    // Get vendors
    if (this.config.preferVendors || !this.config.preferInternal) {
      const categoryFilter = workOrder.category
        ? { categories: workOrder.category }
        : {};

      const vendors = await Vendor.find({
        orgId: this.orgId,
        status: "ACTIVE",
        ...categoryFilter,
      }).lean();

      // Get their current workload
      const vendorIds = vendors.map((v) => v._id.toString());
      const workloads = await this.getWorkloads("vendor", vendorIds);

      for (const vendor of vendors) {
        const vendorId = vendor._id.toString();
        const workload = workloads.get(vendorId) || 0;
        const vendorTyped = vendor as unknown as {
          name?: string;
          categories?: string[];
          rating?: { average?: number };
          lastAssignedAt?: Date;
        };

        candidates.push({
          type: "vendor",
          id: vendorId,
          name: vendor.name || "Unknown Vendor",
          score: 0,
          reasons: [],
          availability: "available", // Vendors have no max workload cap
          currentWorkload: workload,
          maxWorkload: 999,
          skills: vendorTyped.categories || [],
          averageRating: vendorTyped.rating?.average,
          lastAssignedAt: vendorTyped.lastAssignedAt,
        });
      }
    }

    // Filter by availability
    return candidates.filter((c) => c.availability === "available");
  }

  /**
   * Get current workload counts for assignees
   */
  private async getWorkloads(
    type: "user" | "vendor",
    ids: string[]
  ): Promise<Map<string, number>> {
    const field = type === "user" ? "assignment.assignedTo.userId" : "assignment.assignedTo.vendorId";

    const pipeline = [
      {
        $match: {
          orgId: this.orgId,
          status: { $in: ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"] },
          [field]: { $in: ids },
        },
      },
      {
        $group: {
          _id: `$${field}`,
          count: { $sum: 1 },
        },
      },
    ];

    const results = await WorkOrder.aggregate(pipeline);
    const map = new Map<string, number>();

    for (const result of results) {
      map.set(result._id, result.count);
    }

    return map;
  }

  /**
   * Score candidates based on configuration
   */
  private scoreCandidates(
    candidates: AssignmentCandidate[],
    workOrder: { category?: string }
  ): AssignmentCandidate[] {
    for (const candidate of candidates) {
      let score = 0;
      const reasons: string[] = [];

      // Skill/category match score
      const categoryMatch = workOrder.category && candidate.skills.includes(workOrder.category);
      if (categoryMatch) {
        const skillScore = 100 * this.config.skillMatchWeight;
        score += skillScore;
        reasons.push(`Category match: +${skillScore.toFixed(0)}`);
      }

      // Workload score (lower workload = higher score)
      const workloadRatio = 1 - (candidate.currentWorkload / candidate.maxWorkload);
      const workloadScore = workloadRatio * 100 * this.config.workloadWeight;
      score += workloadScore;
      reasons.push(`Workload (${candidate.currentWorkload}/${candidate.maxWorkload}): +${workloadScore.toFixed(0)}`);

      // Rating score
      if (this.config.considerRating && candidate.averageRating) {
        const ratingScore = (candidate.averageRating / 5) * 100 * this.config.ratingWeight;
        score += ratingScore;
        reasons.push(`Rating (${candidate.averageRating.toFixed(1)}): +${ratingScore.toFixed(0)}`);
      }

      // Round-robin bonus (longer since last assignment = higher score)
      if (this.config.roundRobinEnabled && candidate.lastAssignedAt) {
        const hoursSinceLastAssignment =
          (Date.now() - candidate.lastAssignedAt.getTime()) / (1000 * 60 * 60);
        const roundRobinBonus = Math.min(hoursSinceLastAssignment, 24); // Cap at 24 hours
        score += roundRobinBonus;
        reasons.push(`Round-robin: +${roundRobinBonus.toFixed(0)}`);
      }

      // Type preference
      if (this.config.preferInternal && candidate.type === "user") {
        score += 10;
        reasons.push("Internal preference: +10");
      } else if (this.config.preferVendors && candidate.type === "vendor") {
        score += 10;
        reasons.push("Vendor preference: +10");
      }

      candidate.score = score;
      candidate.reasons = reasons;
    }

    return candidates;
  }

  /**
   * Check if auto-assignment should run (business hours check)
   */
  isWithinBusinessHours(): boolean {
    if (!this.config.businessHoursOnly) return true;

    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Check weekends
    if (this.config.excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      return false;
    }

    // Check business hours
    return hour >= this.config.businessHoursStart && hour < this.config.businessHoursEnd;
  }
}

/**
 * Factory function to create auto-assignment engine
 */
export function createAutoAssignmentEngine(
  orgId: string,
  config?: Partial<AutoAssignConfig>
): AutoAssignmentEngine {
  return new AutoAssignmentEngine(orgId, config);
}

/**
 * Auto-assign a work order (convenience function)
 */
export async function autoAssignWorkOrder(
  orgId: string,
  workOrderId: string,
  assignedBy: string = "system",
  config?: Partial<AutoAssignConfig>
): Promise<{ success: boolean; assignee?: AssignmentCandidate; error?: string }> {
  const engine = createAutoAssignmentEngine(orgId, config);

  // Check business hours
  if (!engine.isWithinBusinessHours()) {
    return { success: false, error: "Outside business hours" };
  }

  return engine.autoAssign(workOrderId, assignedBy);
}
