/**
 * @fileoverview Work Order Auto-Assignment Engine
 * @description Assigns work orders to technicians or vendors based on skills,
 * workload, rating, and optional ML scoring.
 * @module fm/auto-assignment
 */

import { Types } from "mongoose";
import { WorkOrder } from "@/server/models/WorkOrder";
import { Vendor } from "@/server/models/Vendor";
import { User } from "@/server/models/User";
import { logger } from "@/lib/logger";

/** Default max workload for vendors (effectively unlimited) */
const DEFAULT_VENDOR_MAX_WORKLOAD = 999;

type CandidateAvailability = "available" | "busy" | "offline";

/**
 * Assignment candidate with scoring details.
 */
export interface AssignmentCandidate {
  type: "user" | "vendor";
  id: string;
  name: string;
  score: number;
  reasons: string[];
  availability: CandidateAvailability;
  currentWorkload: number;
  maxWorkload: number;
  skills: string[];
  averageRating?: number;
  lastAssignedAt?: Date;
  assignedProperties?: string[];
}

export type ScoringMode = "heuristic" | "ml";

export interface AssignmentModelWeights {
  skillMatch: number;
  workload: number;
  rating: number;
  roundRobin: number;
  propertyMatch: number;
  availability: number;
}

/**
 * Auto-assignment configuration per org.
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
  businessHoursEnd: number; // 0-23
  scoringMode: ScoringMode;
  mlWeights?: Partial<AssignmentModelWeights>;
  mlBias?: number;
}

interface ScheduledTimeSlot {
  start?: string;
  end?: string;
}

interface WorkOrderSchedule {
  scheduledDate: Date;
  scheduledTimeSlot: ScheduledTimeSlot;
}

interface WorkOrderCandidateInput {
  category?: string;
  type?: string;
  subcategory?: string;
  priority?: string;
  propertyId?: string | Types.ObjectId;
  location?: {
    propertyId?: string | Types.ObjectId;
  };
  scheduledDate?: Date;
  scheduledTimeSlot?: ScheduledTimeSlot;
  assignment?: {
    scheduledDate?: Date;
    scheduledTimeSlot?: ScheduledTimeSlot;
    assignedTo?: {
      userId?: unknown;
      vendorId?: unknown;
      teamId?: unknown;
    };
  };
}

type UserCandidateDoc = {
  _id: Types.ObjectId;
  username?: string;
  email?: string;
  personal?: { firstName?: string; lastName?: string };
  professional?: {
    role?: string;
    skills?: Array<{ category?: string; skill?: string }>;
    assignedProperties?: Array<string | Types.ObjectId>;
  };
  workload?: {
    maxAssignments?: number;
    available?: boolean;
  };
  performance?: { rating?: number };
  status?: string;
  skills?: string[];
  lastAssignedAt?: Date;
};

type VendorCandidateDoc = {
  _id: Types.ObjectId;
  name?: string;
  business?: { specializations?: string[] };
  catalog?: Array<{ category?: string; subcategory?: string }>;
  performance?: { rating?: number };
  status?: string;
  categories?: string[];
  lastAssignedAt?: Date;
};

const TECHNICIAN_ROLES = ["TECHNICIAN"];
const INACTIVE_WORK_ORDER_STATUSES = new Set([
  "CLOSED",
  "CANCELLED",
  "REJECTED",
  "COMPLETED",
  "VERIFIED",
]);

const DEFAULT_CONFIG: AutoAssignConfig = {
  enabled: true,
  preferVendors: false,
  preferInternal: true,
  maxWorkloadPerTechnician: 10,
  considerRating: true,
  ratingWeight: 0.3,
  workloadWeight: 0.4,
  skillMatchWeight: 0.3,
  roundRobinEnabled: false,
  excludeWeekends: false,
  businessHoursOnly: true,
  businessHoursStart: 8,
  businessHoursEnd: 18,
  scoringMode: "heuristic",
};

function normalizeToken(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.toLowerCase() : null;
}

function normalizeSkills(values: string[]): string[] {
  const normalized = values
    .map((skill) => normalizeToken(skill))
    .filter((skill): skill is string => Boolean(skill));
  return Array.from(new Set(normalized));
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value !== "number") return undefined;
  if (!Number.isFinite(value)) return undefined;
  return value;
}

function buildOrgFilter(orgId: string) {
  return Types.ObjectId.isValid(orgId)
    ? { $in: [orgId, new Types.ObjectId(orgId)] }
    : orgId;
}

function getPropertyId(workOrder: WorkOrderCandidateInput): string | null {
  const raw =
    workOrder.location?.propertyId ?? workOrder.propertyId ?? null;
  if (!raw) return null;
  return typeof raw === "string" ? raw : raw.toString();
}

function collectUserSkills(user: UserCandidateDoc): string[] {
  const skills: string[] = [];
  if (Array.isArray(user.skills)) {
    skills.push(...user.skills.filter((value): value is string => typeof value === "string"));
  }
  const professionalSkills = user.professional?.skills ?? [];
  for (const entry of professionalSkills) {
    if (entry?.category) skills.push(entry.category);
    if (entry?.skill) skills.push(entry.skill);
  }
  return normalizeSkills(skills);
}

function collectVendorSkills(vendor: VendorCandidateDoc): string[] {
  const skills: string[] = [];
  if (Array.isArray(vendor.categories)) {
    skills.push(...vendor.categories);
  }
  if (Array.isArray(vendor.business?.specializations)) {
    skills.push(...vendor.business!.specializations!);
  }
  if (Array.isArray(vendor.catalog)) {
    for (const entry of vendor.catalog) {
      if (entry?.category) skills.push(entry.category);
      if (entry?.subcategory) skills.push(entry.subcategory);
    }
  }
  return normalizeSkills(skills);
}

function resolveUserName(user: UserCandidateDoc): string {
  const first = user.personal?.firstName?.trim() ?? "";
  const last = user.personal?.lastName?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  return full || user.username || user.email || "Unknown";
}

function resolveVendorName(vendor: VendorCandidateDoc): string {
  return vendor.name || "Unknown Vendor";
}

/**
 * Work Order Auto-Assignment Engine
 */
export class AutoAssignmentEngine {
  private orgId: string;
  private config: AutoAssignConfig;

  constructor(orgId: string, config?: Partial<AutoAssignConfig>) {
    this.orgId = orgId;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Find the best assignee for a work order.
   */
  async findBestAssignee(workOrderId: string): Promise<AssignmentCandidate | null> {
    const workOrder = await this.getWorkOrder(workOrderId);
    if (!workOrder) {
      return null;
    }
    return this.findBestAssigneeForWorkOrder(workOrder);
  }

  /**
   * Auto-assign a work order.
   */
  async autoAssign(
    workOrderId: string,
    assignedBy: string,
  ): Promise<{ success: boolean; assignee?: AssignmentCandidate; error?: string }> {
    try {
      if (!this.config.enabled) {
        return { success: false, error: "Auto-assignment is disabled" };
      }

      const workOrder = await this.getWorkOrder(workOrderId);
      if (!workOrder) {
        return { success: false, error: "Work order not found" };
      }

      const assignment = workOrder.assignment?.assignedTo;
      if (assignment?.userId || assignment?.vendorId || assignment?.teamId) {
        return { success: false, error: "Work order already assigned" };
      }

      const bestCandidate = await this.findBestAssigneeForWorkOrder(workOrder);
      if (!bestCandidate) {
        return { success: false, error: "No suitable assignee found" };
      }

      const updateResult = await WorkOrder.updateOne(
        {
          _id: new Types.ObjectId(workOrderId),
          orgId: buildOrgFilter(this.orgId),
        },
        {
          $set: {
            "assignment.assignedTo": {
              ...(bestCandidate.type === "user" && { userId: bestCandidate.id }),
              ...(bestCandidate.type === "vendor" && { vendorId: bestCandidate.id }),
              name: bestCandidate.name,
            },
            "assignment.assignedAt": new Date(),
            "assignment.assignedBy": Types.ObjectId.isValid(assignedBy)
              ? new Types.ObjectId(assignedBy)
              : undefined,
            "assignment.autoAssigned": true,
            updatedAt: new Date(),
          },
        },
      );

      if (updateResult.modifiedCount === 0) {
        return { success: false, error: "Failed to update work order" };
      }

      if (bestCandidate.type === "user") {
        await User.updateOne(
          { _id: new Types.ObjectId(bestCandidate.id), orgId: buildOrgFilter(this.orgId) },
          { $set: { lastAssignedAt: new Date() } },
        );
      } else {
        await Vendor.updateOne(
          { _id: new Types.ObjectId(bestCandidate.id), orgId: buildOrgFilter(this.orgId) },
          { $set: { lastAssignedAt: new Date() } },
        );
      }

      return { success: true, assignee: bestCandidate };
    } catch (error) {
      logger.error("[AutoAssign] Error auto-assigning work order", { error, workOrderId });
      return { success: false, error: "Internal error during assignment" };
    }
  }

  private async getWorkOrder(workOrderId: string): Promise<WorkOrderCandidateInput | null> {
    if (!Types.ObjectId.isValid(workOrderId)) {
      logger.warn("[AutoAssign] Invalid work order id", { workOrderId });
      return null;
    }

    try {
      const workOrder = await WorkOrder.findOne({
        _id: new Types.ObjectId(workOrderId),
        orgId: buildOrgFilter(this.orgId),
      }).lean();

      if (!workOrder) {
        logger.warn("[AutoAssign] Work order not found", { workOrderId, orgId: this.orgId });
        return null;
      }

      return workOrder as WorkOrderCandidateInput;
    } catch (error) {
      logger.error("[AutoAssign] Error fetching work order", { error, workOrderId });
      return null;
    }
  }

  private async findBestAssigneeForWorkOrder(
    workOrder: WorkOrderCandidateInput,
  ): Promise<AssignmentCandidate | null> {
    const candidates = await this.getCandidates(workOrder);

    const schedule = this.resolveSchedule(workOrder);
    const availableCandidates = schedule
      ? await this.filterByScheduleAvailability(candidates, schedule)
      : candidates;

    if (availableCandidates.length === 0) {
      logger.info("[AutoAssign] No candidates available", { category: workOrder.category });
      return null;
    }

    const scoredCandidates = this.scoreCandidates(availableCandidates, workOrder);
    const sortedCandidates = scoredCandidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.currentWorkload !== b.currentWorkload) return a.currentWorkload - b.currentWorkload;
      return (b.averageRating ?? 0) - (a.averageRating ?? 0);
    });

    const bestCandidate = sortedCandidates[0];

    logger.info("[AutoAssign] Best candidate selected", {
      candidateId: bestCandidate.id,
      candidateType: bestCandidate.type,
      score: bestCandidate.score,
      reasons: bestCandidate.reasons,
    });

    return bestCandidate;
  }

  private async getCandidates(_workOrder: WorkOrderCandidateInput): Promise<AssignmentCandidate[]> {
    const candidates: AssignmentCandidate[] = [];

    if (this.config.preferInternal || !this.config.preferVendors) {
      const technicians = await User.find({
        orgId: buildOrgFilter(this.orgId),
        status: "ACTIVE",
        $or: [
          { "professional.role": { $in: TECHNICIAN_ROLES } },
          { role: { $in: TECHNICIAN_ROLES } },
        ],
      }).lean();

      const techDocs = technicians as unknown as UserCandidateDoc[];
      const techIds = techDocs.map((tech) => tech._id.toString());
      const workloads = await this.getWorkloads("user", techIds);

      for (const tech of techDocs) {
        const techId = tech._id.toString();
        const workload = workloads.get(techId) || 0;
        const maxWorkload = coerceNumber(tech.workload?.maxAssignments)
          ?? this.config.maxWorkloadPerTechnician;
        const availableFlag = tech.workload?.available;
        const availability: CandidateAvailability =
          availableFlag === false
            ? "offline"
            : workload >= maxWorkload
              ? "busy"
              : "available";

        const assignedProperties =
          tech.professional?.assignedProperties?.map((value) =>
            typeof value === "string" ? value : value.toString(),
          ) ?? [];

        candidates.push({
          type: "user",
          id: techId,
          name: resolveUserName(tech),
          score: 0,
          reasons: [],
          availability,
          currentWorkload: workload,
          maxWorkload,
          skills: collectUserSkills(tech),
          averageRating: coerceNumber(tech.performance?.rating),
          lastAssignedAt: tech.lastAssignedAt,
          assignedProperties,
        });
      }
    }

    if (this.config.preferVendors || !this.config.preferInternal) {
      const vendors = await Vendor.find({
        orgId: buildOrgFilter(this.orgId),
        status: "APPROVED",
      }).lean();

      const vendorDocs = vendors as unknown as VendorCandidateDoc[];
      const vendorIds = vendorDocs.map((vendor) => vendor._id.toString());
      const workloads = await this.getWorkloads("vendor", vendorIds);

      for (const vendor of vendorDocs) {
        const vendorId = vendor._id.toString();
        const workload = workloads.get(vendorId) || 0;

        candidates.push({
          type: "vendor",
          id: vendorId,
          name: resolveVendorName(vendor),
          score: 0,
          reasons: [],
          availability: "available",
          currentWorkload: workload,
          maxWorkload: DEFAULT_VENDOR_MAX_WORKLOAD,
          skills: collectVendorSkills(vendor),
          averageRating: coerceNumber(vendor.performance?.rating),
          lastAssignedAt: vendor.lastAssignedAt,
        });
      }
    }

    return candidates.filter((candidate) => candidate.availability === "available");
  }

  private resolveSchedule(workOrder: WorkOrderCandidateInput): WorkOrderSchedule | null {
    const scheduledDate =
      workOrder.assignment?.scheduledDate ?? workOrder.scheduledDate;
    const scheduledTimeSlot =
      workOrder.assignment?.scheduledTimeSlot ?? workOrder.scheduledTimeSlot;

    if (!scheduledDate || !scheduledTimeSlot?.start || !scheduledTimeSlot?.end) {
      return null;
    }

    return {
      scheduledDate: new Date(scheduledDate),
      scheduledTimeSlot,
    };
  }

  private parseTimeToMinutes(value: string): number | null {
    const [hoursRaw, minutesRaw] = value.split(":");
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    return hours * 60 + minutes;
  }

  private slotsOverlap(a: ScheduledTimeSlot, b: ScheduledTimeSlot): boolean {
    if (!a.start || !a.end || !b.start || !b.end) return false;
    const aStart = this.parseTimeToMinutes(a.start);
    const aEnd = this.parseTimeToMinutes(a.end);
    const bStart = this.parseTimeToMinutes(b.start);
    const bEnd = this.parseTimeToMinutes(b.end);
    if (aStart === null || aEnd === null || bStart === null || bEnd === null) return false;
    return aStart < bEnd && bStart < aEnd;
  }

  private async filterByScheduleAvailability(
    candidates: AssignmentCandidate[],
    schedule: WorkOrderSchedule,
  ): Promise<AssignmentCandidate[]> {
    const dayStart = new Date(schedule.scheduledDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(schedule.scheduledDate);
    dayEnd.setHours(23, 59, 59, 999);

    const checks = await Promise.all(
      candidates.map(async (candidate) => {
        const field =
          candidate.type === "user"
            ? "assignment.assignedTo.userId"
            : "assignment.assignedTo.vendorId";

        const conflicts = await WorkOrder.find({
          orgId: buildOrgFilter(this.orgId),
          isDeleted: { $ne: true },
          status: { $nin: Array.from(INACTIVE_WORK_ORDER_STATUSES) },
          [field]: new Types.ObjectId(candidate.id),
          $or: [
            { "assignment.scheduledDate": { $gte: dayStart, $lte: dayEnd } },
            { scheduledDate: { $gte: dayStart, $lte: dayEnd } },
          ],
        }).lean();

        const hasOverlap = conflicts.some((existing) => {
          const existingSlot =
            (existing as { assignment?: { scheduledTimeSlot?: ScheduledTimeSlot } })
              .assignment?.scheduledTimeSlot ??
            (existing as { scheduledTimeSlot?: ScheduledTimeSlot }).scheduledTimeSlot;
          return this.slotsOverlap(existingSlot || {}, schedule.scheduledTimeSlot);
        });

        return { candidate, hasOverlap };
      }),
    );

    return checks.filter((result) => !result.hasOverlap).map((result) => result.candidate);
  }

  private async getWorkloads(type: "user" | "vendor", ids: string[]): Promise<Map<string, number>> {
    if (ids.length === 0) return new Map();

    const objectIds = ids
      .map((id) => (Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null))
      .filter((id): id is Types.ObjectId => Boolean(id));
    if (objectIds.length === 0) return new Map();

    const field = type === "user"
      ? "assignment.assignedTo.userId"
      : "assignment.assignedTo.vendorId";

    const results = await WorkOrder.aggregate(
      [
        {
          $match: {
            orgId: buildOrgFilter(this.orgId),
            isDeleted: { $ne: true },
            status: { $nin: Array.from(INACTIVE_WORK_ORDER_STATUSES) },
            [field]: { $in: objectIds },
          },
        },
        {
          $group: {
            _id: `$${field}`,
            count: { $sum: 1 },
          },
        },
      ],
      { maxTimeMS: 10_000 },
    );

    const map = new Map<string, number>();
    for (const result of results) {
      const key = result._id?.toString?.() ?? String(result._id);
      map.set(key, result.count);
    }
    return map;
  }

  private scoreCandidates(
    candidates: AssignmentCandidate[],
    workOrder: WorkOrderCandidateInput,
  ): AssignmentCandidate[] {
    if (this.config.scoringMode === "ml") {
      return this.scoreCandidatesWithModel(candidates, workOrder);
    }
    return this.scoreCandidatesHeuristic(candidates, workOrder);
  }

  private getSkillMatch(workOrder: WorkOrderCandidateInput, candidate: AssignmentCandidate) {
    const tokens = [workOrder.category, workOrder.subcategory, workOrder.type]
      .map((value) => normalizeToken(value))
      .filter((value): value is string => Boolean(value));
    if (tokens.length === 0) {
      return { ratio: 0, matches: [] as string[] };
    }

    const skills = new Set(candidate.skills.map((skill) => normalizeToken(skill)).filter(Boolean) as string[]);
    const matches = tokens.filter((token) => skills.has(token));
    const ratio = matches.length / tokens.length;
    return { ratio, matches };
  }

  private scoreCandidatesHeuristic(
    candidates: AssignmentCandidate[],
    workOrder: WorkOrderCandidateInput,
  ): AssignmentCandidate[] {
    for (const candidate of candidates) {
      let score = 0;
      const reasons: string[] = [];

      const { ratio: skillMatchRatio, matches } = this.getSkillMatch(workOrder, candidate);
      if (skillMatchRatio > 0) {
        const skillScore = skillMatchRatio * 100 * this.config.skillMatchWeight;
        score += skillScore;
        reasons.push(`Skill match (${matches.join(", ") || "match"}): +${skillScore.toFixed(0)}`);
      }

      const workloadRatio = candidate.maxWorkload > 0
        ? Math.max(0, 1 - candidate.currentWorkload / candidate.maxWorkload)
        : 0;
      const workloadScore = workloadRatio * 100 * this.config.workloadWeight;
      score += workloadScore;
      reasons.push(`Workload (${candidate.currentWorkload}/${candidate.maxWorkload}): +${workloadScore.toFixed(0)}`);

      if (this.config.considerRating && candidate.averageRating !== undefined) {
        const ratingScore =
          Math.max(0, Math.min(candidate.averageRating / 5, 1)) *
          100 *
          this.config.ratingWeight;
        score += ratingScore;
        reasons.push(`Rating (${candidate.averageRating.toFixed(1)}): +${ratingScore.toFixed(0)}`);
      }

      if (this.config.roundRobinEnabled && candidate.lastAssignedAt) {
        const hoursSinceLastAssignment =
          (Date.now() - candidate.lastAssignedAt.getTime()) / (1000 * 60 * 60);
        const roundRobinBonus = Math.min(hoursSinceLastAssignment, 24);
        score += roundRobinBonus;
        reasons.push(`Round-robin: +${roundRobinBonus.toFixed(0)}`);
      }

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

  private resolveModelWeights(): AssignmentModelWeights {
    const merged: AssignmentModelWeights = {
      skillMatch: this.config.skillMatchWeight,
      workload: this.config.workloadWeight,
      rating: this.config.considerRating ? this.config.ratingWeight : 0,
      roundRobin: 0,
      propertyMatch: 0,
      availability: 0,
      ...this.config.mlWeights,
    };
    if (!this.config.considerRating) merged.rating = 0;
    if (!this.config.roundRobinEnabled) merged.roundRobin = 0;
    return merged;
  }

  private scoreCandidatesWithModel(
    candidates: AssignmentCandidate[],
    workOrder: WorkOrderCandidateInput,
  ): AssignmentCandidate[] {
    const weights = this.resolveModelWeights();
    const bias = this.config.mlBias ?? 0;
    const propertyId = getPropertyId(workOrder);

    for (const candidate of candidates) {
      const { ratio: skillMatchRatio } = this.getSkillMatch(workOrder, candidate);
      const workloadRatio = candidate.maxWorkload > 0
        ? Math.max(0, 1 - candidate.currentWorkload / candidate.maxWorkload)
        : 0;
      const rating = candidate.averageRating !== undefined
        ? Math.max(0, Math.min(candidate.averageRating / 5, 1))
        : 0;
      const propertyMatch =
        propertyId && candidate.assignedProperties?.includes(propertyId) ? 1 : 0;
      const availability = candidate.availability === "available" ? 1 : 0;
      const roundRobin =
        this.config.roundRobinEnabled && candidate.lastAssignedAt
          ? Math.min(
              (Date.now() - candidate.lastAssignedAt.getTime()) / (1000 * 60 * 60),
              24,
            ) / 24
          : 0;

      const logit =
        bias +
        weights.skillMatch * skillMatchRatio +
        weights.workload * workloadRatio +
        weights.rating * rating +
        weights.propertyMatch * propertyMatch +
        weights.availability * availability +
        weights.roundRobin * roundRobin;

      const score = 100 / (1 + Math.exp(-logit));
      const reasons: string[] = [];

      if (weights.skillMatch) {
        reasons.push(`ML skill match: ${(skillMatchRatio * 100).toFixed(0)}%`);
      }
      if (weights.workload) {
        reasons.push(`ML workload fit: ${(workloadRatio * 100).toFixed(0)}%`);
      }
      if (weights.rating) {
        reasons.push(`ML rating: ${(rating * 5).toFixed(1)}`);
      }
      if (weights.propertyMatch && propertyMatch) {
        reasons.push("ML property match: yes");
      }
      if (weights.availability) {
        reasons.push("ML availability: available");
      }
      if (weights.roundRobin && roundRobin) {
        reasons.push(`ML round-robin: ${(roundRobin * 100).toFixed(0)}%`);
      }

      if (this.config.preferInternal && candidate.type === "user") {
        reasons.push("Internal preference: +10");
        candidate.score = score + 10;
      } else if (this.config.preferVendors && candidate.type === "vendor") {
        reasons.push("Vendor preference: +10");
        candidate.score = score + 10;
      } else {
        candidate.score = score;
      }

      candidate.reasons = reasons;
    }

    return candidates;
  }

  /**
   * Check if auto-assignment should run (business hours check).
   */
  isWithinBusinessHours(): boolean {
    if (!this.config.businessHoursOnly) return true;

    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    if (this.config.excludeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      return false;
    }

    return hour >= this.config.businessHoursStart && hour < this.config.businessHoursEnd;
  }
}

export function createAutoAssignmentEngine(
  orgId: string,
  config?: Partial<AutoAssignConfig>,
): AutoAssignmentEngine {
  return new AutoAssignmentEngine(orgId, config);
}

export async function autoAssignWorkOrder(
  orgId: string,
  workOrderId: string,
  assignedBy: string = "system",
  config?: Partial<AutoAssignConfig>,
): Promise<{ success: boolean; assignee?: AssignmentCandidate; error?: string }> {
  const engine = createAutoAssignmentEngine(orgId, config);

  if (!engine.isWithinBusinessHours()) {
    return { success: false, error: "Outside business hours" };
  }

  return engine.autoAssign(workOrderId, assignedBy);
}
