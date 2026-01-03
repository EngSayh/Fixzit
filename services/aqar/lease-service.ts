/**
 * @fileoverview Lease Management Service - Comprehensive lease lifecycle management
 * @module services/aqar/lease-service
 * 
 * Provides full lease lifecycle management including:
 * - Lease creation and renewal
 * - Ejar integration (Saudi housing ministry portal)
 * - AI-powered rent optimization
 * - Automated expiry notifications
 * - Tenant screening integration
 * 
 * @compliance
 * - Ejar (Saudi Arabia housing rental portal)
 * - ZATCA VAT regulations for rental income
 * 
 * @author [AGENT-0001]
 * @created 2025-12-28
 */

import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate and convert a string to ObjectId
 * @throws Error if the ID is invalid
 */
function _toObjectId(id: string, fieldName: string): ObjectId {
  if (!ObjectId.isValid(id)) {
    throw new Error(`Invalid ${fieldName}: ${id}`);
  }
  return new ObjectId(id);
}

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Lease status
 */
export enum LeaseStatus {
  DRAFT = "DRAFT",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  ACTIVE = "ACTIVE",
  RENEWED = "RENEWED",
  EXPIRED = "EXPIRED",
  TERMINATED = "TERMINATED",
  SUSPENDED = "SUSPENDED",
}

/**
 * Payment frequency
 */
export enum PaymentFrequency {
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  SEMI_ANNUAL = "SEMI_ANNUAL",
  ANNUAL = "ANNUAL",
}

/**
 * Lease document structure
 */
export interface LeaseDocument {
  _id: ObjectId;
  orgId: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  
  // Core lease terms
  leaseNumber: string;
  status: LeaseStatus;
  startDate: Date;
  endDate: Date;
  renewalDate?: Date;
  
  // Financial terms
  monthlyRent: number;
  annualRent: number;
  securityDeposit: number;
  paymentFrequency: PaymentFrequency;
  paymentDueDay: number; // 1-28
  lateFeePercentage: number;
  gracePeriodDays: number;
  
  // Ejar integration
  ejarRegistration?: {
    contractNumber: string;
    registeredAt: Date;
    expiresAt: Date;
    status: "pending" | "registered" | "expired" | "cancelled";
  };
  
  // Tenant info snapshot (at lease signing)
  tenantSnapshot: {
    name: string;
    nationalId: string;
    email: string;
    phone: string;
    emergencyContact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  };
  
  // Terms and conditions
  terms: {
    petsAllowed: boolean;
    maxOccupants: number;
    parkingSpaces: number;
    utilitiesIncluded: string[];
    maintenanceResponsibilities: "landlord" | "tenant" | "shared";
    noticePeriodDays: number;
    earlyTerminationFee?: number;
  };
  
  // Documents
  documents: {
    type: "lease_contract" | "id_copy" | "salary_certificate" | "bank_statement" | "other";
    name: string;
    url: string;
    uploadedAt: Date;
  }[];
  
  // Audit trail
  createdBy: string;
  createdAt: Date;
  updatedBy?: string;
  updatedAt?: Date;
  
  // Termination details (populated when terminated)
  terminationDetails?: {
    date: Date;
    terminatedBy: string;
    reason: string;
    notes?: string;
    earlyTerminationFee?: number;
  };
  
  // Automation flags
  autoRenew: boolean;
  renewalReminderSent: boolean;
  expiryNotificationsSentDays: number[];
  // Note: expiryNotificationsSent field removed - use expiryNotificationsSentDays.length instead
}

/**
 * Lease creation request
 */
export interface CreateLeaseRequest {
  orgId: string;
  propertyId: string;
  unitId: string;
  tenantId: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  securityDeposit: number;
  paymentFrequency?: PaymentFrequency;
  paymentDueDay?: number;
  terms?: Partial<LeaseDocument["terms"]>;
  autoRenew?: boolean;
  createdBy: string;
  /** Exclude this lease from overlap check (used during renewals) */
  excludeLeaseId?: string;
}

/**
 * Rent optimization result
 */
export interface RentOptimizationResult {
  recommendedRent: number;
  currentRent: number;
  marketAverage: number;
  percentileInMarket: number;
  factors: {
    name: string;
    impact: number; // -100 to +100 percent
    description: string;
  }[];
  confidence: number; // 0-100
  recommendation: "increase" | "decrease" | "maintain";
  suggestedIncrease?: number;
}

// ============================================================================
// Lease Number Generation
// ============================================================================

/**
 * Generate unique lease number
 */
async function generateLeaseNumber(orgId: string): Promise<string> {
  const db = await getDatabase();
  const year = new Date().getFullYear();
  
  // Get next sequence number
  const result = await db.collection("lease_sequences").findOneAndUpdate(
    { orgId, year },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  
  // Access seq from result.value for findOneAndUpdate return type
  // Validate the result - throw error if seq is invalid to prevent duplicate lease numbers
  const seq = result?.value?.seq;
  if (seq === null || seq === undefined || typeof seq !== "number" || seq < 1) {
    throw new Error(`Failed to generate lease number: invalid seq value for orgId=${orgId}, year=${year}`);
  }
  return `LSE-${year}-${seq.toString().padStart(5, "0")}`;
}

// ============================================================================
// Core Lease Operations
// ============================================================================

/**
 * Create a new lease
 */
export async function createLease(
  request: CreateLeaseRequest,
  session?: mongoose.ClientSession
): Promise<{ success: boolean; lease?: LeaseDocument; error?: string }> {
  try {
    // Validate paymentDueDay is within 1-28 range
    if (request.paymentDueDay !== undefined) {
      if (!Number.isInteger(request.paymentDueDay) || request.paymentDueDay < 1 || request.paymentDueDay > 28) {
        return { success: false, error: "paymentDueDay must be an integer between 1 and 28" };
      }
    }
    
    // Validate monthlyRent is a positive number (required field)
    if (!Number.isFinite(request.monthlyRent) || request.monthlyRent <= 0) {
      return { success: false, error: "monthlyRent must be a positive number" };
    }
    
    // Validate securityDeposit is a non-negative number (optional)
    if (request.securityDeposit !== undefined) {
      if (!Number.isFinite(request.securityDeposit) || request.securityDeposit < 0) {
        return { success: false, error: "securityDeposit must be a non-negative number" };
      }
    }
    
    // Validate dates are present and startDate is before endDate
    if (!request.startDate || !request.endDate) {
      return { success: false, error: "startDate and endDate are required" };
    }
    const startDate = request.startDate instanceof Date ? request.startDate : new Date(request.startDate);
    const endDate = request.endDate instanceof Date ? request.endDate : new Date(request.endDate);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { success: false, error: "Invalid date format for startDate or endDate" };
    }
    if (startDate >= endDate) {
      return { success: false, error: "startDate must be before endDate" };
    }
    
    const db = await getDatabase();
    const sessionOpts = session ? { session } : {};
    
    // Validate ObjectId formats before DB query
    if (!ObjectId.isValid(request.unitId)) {
      return { success: false, error: "Invalid unitId format" };
    }
    if (!ObjectId.isValid(request.tenantId)) {
      return { success: false, error: "Invalid tenantId format" };
    }
    
    // Validate property and unit exist and are available
    const unit = await db.collection("units").findOne({
      _id: new ObjectId(request.unitId),
      propertyId: request.propertyId,
      orgId: request.orgId,
    }, sessionOpts);
    
    if (!unit) {
      return { success: false, error: "Unit not found" };
    }
    
    if (unit.status === "occupied") {
      return { success: false, error: "Unit is already occupied" };
    }
    
    // Validate tenant exists
    const tenant = await db.collection("tenants").findOne({
      _id: new ObjectId(request.tenantId),
      orgId: request.orgId,
    }, sessionOpts);
    
    if (!tenant) {
      return { success: false, error: "Tenant not found" };
    }
    
    // Check for overlapping leases
    // Use string for query since leases store unitId as string
    
    // Build overlap check query, excluding the specified lease (used during renewals)
    const overlapQuery: Record<string, unknown> = {
      orgId: request.orgId,
      unitId: request.unitId, // Use string - leases store unitId as string
      status: { $in: [LeaseStatus.ACTIVE, LeaseStatus.PENDING_APPROVAL] },
      startDate: { $lte: request.endDate },
      endDate: { $gte: request.startDate },
    };
    
    // Exclude the current lease when doing renewals to prevent false positive overlap
    if (request.excludeLeaseId && ObjectId.isValid(request.excludeLeaseId)) {
      overlapQuery._id = { $ne: new ObjectId(request.excludeLeaseId) };
    }
    
    const overlapping = await db.collection("leases").findOne(overlapQuery, sessionOpts);
    
    if (overlapping) {
      return { success: false, error: "Overlapping lease exists for this unit" };
    }
    
    // Calculate annual rent
    const annualRent = request.monthlyRent * 12;
    
    // Generate lease number
    const leaseNumber = await generateLeaseNumber(request.orgId);
    
    // Create lease document
    const lease: Omit<LeaseDocument, "_id"> = {
      orgId: request.orgId,
      propertyId: request.propertyId,
      unitId: request.unitId, // Keep as string to match interface
      tenantId: request.tenantId,
      leaseNumber,
      status: LeaseStatus.DRAFT,
      startDate: request.startDate,
      endDate: request.endDate,
      monthlyRent: request.monthlyRent,
      annualRent,
      securityDeposit: request.securityDeposit,
      paymentFrequency: request.paymentFrequency || PaymentFrequency.MONTHLY,
      paymentDueDay: request.paymentDueDay || 1,
      lateFeePercentage: 5, // 5% default
      gracePeriodDays: 7, // 7 days default
      tenantSnapshot: {
        name: tenant.name,
        nationalId: tenant.nationalId || "",
        email: tenant.email,
        phone: tenant.phone,
        emergencyContact: tenant.emergencyContact,
      },
      terms: {
        petsAllowed: false,
        maxOccupants: 4,
        parkingSpaces: 1,
        utilitiesIncluded: [],
        maintenanceResponsibilities: "landlord",
        noticePeriodDays: 30,
        ...request.terms,
      },
      documents: [],
      createdBy: request.createdBy,
      createdAt: new Date(),
      autoRenew: request.autoRenew ?? false,
      renewalReminderSent: false,
      expiryNotificationsSentDays: [],
    };
    
    const result = await db.collection("leases").insertOne(
      lease,
      session ? { session } : undefined
    );
    
    logger.info("Lease created", {
      leaseId: result.insertedId.toString(),
      leaseNumber,
      orgId: request.orgId,
      unitId: request.unitId,
    });
    
    return {
      success: true,
      lease: { ...lease, _id: result.insertedId } as LeaseDocument,
    };
  } catch (error) {
    logger.error("Failed to create lease", {
      error: error instanceof Error ? error.message : "Unknown error",
      orgId: request.orgId,
      propertyId: request.propertyId,
      unitId: request.unitId,
      tenantId: request.tenantId,
    });
    return { success: false, error: "Failed to create lease" };
  }
}

/**
 * Activate a lease (move from draft to active)
 * Uses MongoDB transaction for atomicity
 * @param existingSession - Optional session to use (to avoid nested transactions)
 */
export async function activateLease(
  orgId: string,
  leaseId: string,
  activatedBy: string,
  existingSession?: mongoose.ClientSession
): Promise<{ success: boolean; error?: string }> {
  // Use existing session if provided (for nested calls), otherwise create new one
  const ownSession = !existingSession;
  const session = existingSession ?? await mongoose.startSession();
  try {
    const db = await getDatabase();
    const sessionOpts = { session };
    
    const lease = await db.collection("leases").findOne({
      _id: new ObjectId(leaseId),
      orgId,
    }, sessionOpts);
    
    if (!lease) {
      return { success: false, error: "Lease not found" };
    }
    
    // Store the expected status for the conditional update
    const expectedStatus = lease.status;
    if (expectedStatus !== LeaseStatus.DRAFT && expectedStatus !== LeaseStatus.PENDING_APPROVAL) {
      return { success: false, error: `Cannot activate lease in ${expectedStatus} status` };
    }
    
    // Helper function to perform activation updates
    const performActivation = async () => {
      // Update lease status - include expected status in filter to prevent race condition
      const leaseResult = await db.collection("leases").updateOne(
        { _id: new ObjectId(leaseId), orgId, status: expectedStatus },
        {
          $set: {
            status: LeaseStatus.ACTIVE,
            updatedBy: activatedBy,
            updatedAt: new Date(),
          },
        },
        sessionOpts
      );
      
      // Check if update was successful (status didn't change concurrently)
      if (leaseResult.matchedCount === 0) {
        throw new Error("Lease status changed concurrently - activation aborted");
      }
      
      // Update unit status to occupied
      await db.collection("units").updateOne(
        { _id: new ObjectId(lease.unitId), orgId },
        {
          $set: {
            status: "occupied",
            currentTenantId: lease.tenantId,
            currentLeaseId: leaseId,
            updatedAt: new Date(),
          },
        },
        sessionOpts
      );
    };
    
    // If we own the session, use transaction; otherwise assume caller has transaction
    if (ownSession) {
      await session.withTransaction(performActivation);
    } else {
      await performActivation();
    }
    
    logger.info("Lease activated", {
      leaseId,
      orgId,
      activatedBy,
    });
    
    return { success: true };
  } catch (error) {
    logger.error("Failed to activate lease", {
      error: error instanceof Error ? error.message : "Unknown error",
      leaseId,
    });
    return { success: false, error: "Failed to activate lease" };
  } finally {
    if (ownSession) {
      await session.endSession();
    }
  }
}

/**
 * Renew a lease
 */
export async function renewLease(
  orgId: string,
  leaseId: string,
  newEndDate: Date,
  newMonthlyRent: number,
  renewedBy: string
): Promise<{ success: boolean; newLease?: LeaseDocument; error?: string }> {
  try {
    const db = await getDatabase();
    // Note: db.client available if needed for native transactions
    
    // Validate leaseId format before any DB operations
    if (!ObjectId.isValid(leaseId)) {
      return { success: false, error: "Invalid leaseId format" };
    }
    
    // Use Mongoose session for proper transaction support with Mongoose models
    const session = await mongoose.startSession();
    
    try {
      let newLease: LeaseDocument | undefined;
      let renewalError: string | undefined;
      
      await session.withTransaction(async () => {
        // Read current lease INSIDE transaction to prevent TOCTOU
        const currentLease = await db.collection("leases").findOne({
          _id: new ObjectId(leaseId),
          orgId,
          status: LeaseStatus.ACTIVE,
        }, { session });
        
        if (!currentLease) {
          renewalError = "Active lease not found";
          throw new Error(renewalError);
        }
        // Calculate startDate: use the later of currentLease.endDate or now
        // This ensures the new lease never starts before the present
        const now = new Date();
        const leaseEndDate = new Date(currentLease.endDate);
        const newStartDate = leaseEndDate.getTime() < now.getTime() ? now : leaseEndDate;
        
        // Create new lease FIRST to ensure tenant always has valid lease
        // Exclude current lease from overlap check since it will be marked as RENEWED
        const createResult = await createLease({
          orgId,
          propertyId: currentLease.propertyId,
          unitId: currentLease.unitId.toString(),
          tenantId: currentLease.tenantId,
          startDate: newStartDate,
          endDate: newEndDate,
          monthlyRent: newMonthlyRent,
          securityDeposit: currentLease.securityDeposit,
          paymentFrequency: currentLease.paymentFrequency,
          paymentDueDay: currentLease.paymentDueDay,
          terms: currentLease.terms,
          autoRenew: currentLease.autoRenew,
          createdBy: renewedBy,
          excludeLeaseId: leaseId, // Exclude current lease from overlap check
        }, session); // Pass session for transactional insert
        
        if (!createResult.success) {
          throw new Error(createResult.error || "Failed to create renewal lease");
        }
        
        newLease = createResult.lease;
        
        // Only mark current lease as renewed AFTER new lease is created
        await db.collection("leases").updateOne(
          { _id: new ObjectId(leaseId), orgId },
          {
            $set: {
              status: LeaseStatus.RENEWED,
              renewalDate: new Date(),
              updatedBy: renewedBy,
              updatedAt: new Date(),
            },
          },
          { session }
        );
        
        // Activate the new lease (pass session to avoid nested transaction)
        if (newLease) {
          await activateLease(orgId, newLease._id!.toString(), renewedBy, session);
        }
      });
      
      logger.info("Lease renewed", {
        oldLeaseId: leaseId,
        newLeaseId: newLease?._id?.toString(),
        orgId,
      });
      
      return { success: true, newLease };
    } finally {
      await session.endSession();
    }
  } catch (error) {
    logger.error("Failed to renew lease", {
      error: error instanceof Error ? error.message : "Unknown error",
      leaseId,
    });
    return { success: false, error: "Failed to renew lease" };
  }
}

/**
 * Terminate a lease early
 */
export async function terminateLease(
  orgId: string,
  leaseId: string,
  terminationDate: Date,
  reason: string,
  terminatedBy: string
): Promise<{ success: boolean; earlyTerminationFee?: number; error?: string }> {
  const session = await mongoose.startSession();
  try {
    const db = await getDatabase();
    
    const lease = await db.collection("leases").findOne({
      _id: new ObjectId(leaseId),
      orgId,
      status: LeaseStatus.ACTIVE,
    });
    
    if (!lease) {
      return { success: false, error: "Active lease not found" };
    }
    
    // Calculate early termination fee if applicable
    let earlyTerminationFee = 0;
    if (terminationDate < lease.endDate && lease.terms.earlyTerminationFee) {
      earlyTerminationFee = lease.terms.earlyTerminationFee;
    }
    
    // Use transaction for atomic updates
    await session.withTransaction(async () => {
      // Update lease - include status: ACTIVE in filter to prevent race condition
      const leaseResult = await db.collection("leases").updateOne(
        { _id: new ObjectId(leaseId), orgId, status: LeaseStatus.ACTIVE },
        {
          $set: {
            status: LeaseStatus.TERMINATED,
            updatedBy: terminatedBy,
            updatedAt: new Date(),
            terminationDetails: {
              date: terminationDate,
              reason,
              terminatedBy,
              earlyTerminationFee,
            },
          },
        },
        { session }
      );
      
      // Check if update was successful (status didn't change concurrently)
      if (leaseResult.matchedCount === 0) {
        throw new Error("Lease status changed concurrently - termination aborted");
      }
      
      // Update unit status
      await db.collection("units").updateOne(
        { _id: new ObjectId(lease.unitId), orgId },
        {
          $set: {
            status: "vacant",
            currentTenantId: null,
            currentLeaseId: null,
            updatedAt: new Date(),
          },
        },
        { session }
      );
    });
    
    logger.info("Lease terminated", {
      leaseId,
      reason,
      earlyTerminationFee,
      orgId,
    });
    
    return { success: true, earlyTerminationFee };
  } catch (error) {
    logger.error("Failed to terminate lease", {
      error: error instanceof Error ? error.message : "Unknown error",
      leaseId,
    });
    return { success: false, error: "Failed to terminate lease" };
  } finally {
    await session.endSession();
  }
}

// ============================================================================
// Lease Queries
// ============================================================================

/**
 * Get lease by ID
 */
export async function getLeaseById(
  orgId: string,
  leaseId: string
): Promise<LeaseDocument | null> {
  try {
    const db = await getDatabase();
    const lease = await db.collection("leases").findOne({
      _id: new ObjectId(leaseId),
      orgId,
    });
    return lease as LeaseDocument | null;
  } catch (error) {
    logger.error("Failed to get lease", {
      error: error instanceof Error ? error.message : "Unknown error",
      leaseId,
    });
    return null;
  }
}

/**
 * Get leases for a property
 */
export async function getLeasesByProperty(
  orgId: string,
  propertyId: string,
  options: {
    status?: LeaseStatus[];
    limit?: number;
    skip?: number;
  } = {}
): Promise<LeaseDocument[]> {
  try {
    const db = await getDatabase();
    
    const filter: Record<string, unknown> = { orgId, propertyId };
    if (options.status) {
      filter.status = { $in: options.status };
    }
    
    const leases = await db.collection("leases")
      .find(filter)
      .sort({ startDate: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50)
      .toArray();
    
    return leases as LeaseDocument[];
  } catch (error) {
    logger.error("Failed to get leases by property", {
      error: error instanceof Error ? error.message : "Unknown error",
      propertyId,
    });
    return [];
  }
}

/**
 * Get expiring leases (for renewal reminders)
 */
export async function getExpiringLeases(
  orgId: string,
  daysUntilExpiry: number
): Promise<LeaseDocument[]> {
  try {
    const db = await getDatabase();
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);
    
    const leases = await db.collection("leases")
      .find({
        orgId,
        status: LeaseStatus.ACTIVE,
        endDate: { $lte: expiryDate, $gte: new Date() },
      })
      .sort({ endDate: 1 })
      .toArray();
    
    return leases as LeaseDocument[];
  } catch (error) {
    logger.error("Failed to get expiring leases", {
      error: error instanceof Error ? error.message : "Unknown error",
      orgId,
    });
    return [];
  }
}

// ============================================================================
// AI Rent Optimization
// ============================================================================

/**
 * Get AI-powered rent recommendation
 */
export async function getRentOptimization(
  orgId: string,
  propertyId: string,
  unitId: string,
  currentRent: number
): Promise<RentOptimizationResult> {
  try {
    const db = await getDatabase();
    
    // Get unit details
    const unit = await db.collection("units").findOne({
      _id: new ObjectId(unitId),
      orgId,
    });
    
    if (!unit) {
      throw new Error("Unit not found");
    }
    
    // Get property details
    const property = await db.collection("properties").findOne({
      _id: new ObjectId(propertyId),
      orgId,
    });
    
    // Get comparable units in same area
    const comparables = await db.collection("leases").aggregate([
      {
        $match: {
          orgId,
          status: LeaseStatus.ACTIVE,
          unitId: { $ne: unitId },
        },
      },
      {
        // Convert string unitId to ObjectId for lookup
        $addFields: {
          unitIdAsObjectId: { $toObjectId: "$unitId" },
        },
      },
      {
        $lookup: {
          from: "units",
          localField: "unitIdAsObjectId",
          foreignField: "_id",
          as: "unitDetails",
        },
      },
      {
        $unwind: "$unitDetails",
      },
      {
        $match: {
          "unitDetails.bedrooms": { 
            $gte: Math.max(0, (unit.bedrooms ?? 1) - 1), 
            $lte: (unit.bedrooms ?? 1) + 1 
          },
          "unitDetails.type": unit.type,
        },
      },
      {
        $group: {
          _id: null,
          avgRent: { $avg: "$monthlyRent" },
          minRent: { $min: "$monthlyRent" },
          maxRent: { $max: "$monthlyRent" },
          count: { $sum: 1 },
          rents: { $push: "$monthlyRent" },
        },
      },
    ]).toArray();
    
    const marketData = comparables[0] || {
      avgRent: currentRent,
      minRent: currentRent * 0.8,
      maxRent: currentRent * 1.2,
      count: 0,
      rents: [],
    };
    
    // Calculate factors affecting rent
    const factors: RentOptimizationResult["factors"] = [];
    
    // Location factor
    if (property?.amenities?.includes("prime_location")) {
      factors.push({
        name: "Prime Location",
        impact: 15,
        description: "Property is in a high-demand area",
      });
    }
    
    // Amenities factor
    const amenityCount = unit.amenities?.length || 0;
    if (amenityCount > 5) {
      factors.push({
        name: "Premium Amenities",
        impact: 10,
        description: `Unit has ${amenityCount} amenities`,
      });
    }
    
    // Age factor
    const propertyAge = property?.yearBuilt
      ? new Date().getFullYear() - property.yearBuilt
      : 10;
    if (propertyAge < 5) {
      factors.push({
        name: "New Construction",
        impact: 8,
        description: "Property is less than 5 years old",
      });
    } else if (propertyAge > 20) {
      factors.push({
        name: "Older Building",
        impact: -10,
        description: "Property is over 20 years old",
      });
    }
    
    // Vacancy rate factor
    const vacancyRate = property?.vacancyRate || 0;
    if (vacancyRate > 20) {
      factors.push({
        name: "High Vacancy",
        impact: -15,
        description: `${vacancyRate}% vacancy rate suggests need for competitive pricing`,
      });
    }
    
    // Calculate recommended rent
    const totalImpact = factors.reduce((sum, f) => sum + f.impact, 0);
    const marketAverage = marketData.avgRent;
    const recommendedRent = Math.round(marketAverage * (1 + totalImpact / 100));
    
    // Calculate percentile
    const rents = marketData.rents as number[];
    rents.sort((a, b) => a - b);
    const percentile = rents.length > 0
      ? Math.round((rents.filter(r => r < currentRent).length / rents.length) * 100)
      : 50;
    
    // Determine recommendation
    let recommendation: RentOptimizationResult["recommendation"];
    let suggestedIncrease: number | undefined;
    
    // Handle edge case: currentRent is 0
    if (currentRent === 0) {
      // If no current rent, we can only recommend maintaining or increasing
      if (recommendedRent === 0) {
        recommendation = "maintain";
      } else {
        recommendation = "increase";
        suggestedIncrease = Math.round(recommendedRent);
      }
    } else {
      // Normal case: calculate percentage difference
      const difference = ((recommendedRent - currentRent) / currentRent) * 100;
      if (difference > 5) {
        recommendation = "increase";
        suggestedIncrease = Math.round(recommendedRent - currentRent);
      } else if (difference < -5) {
        recommendation = "decrease";
        suggestedIncrease = Math.round(recommendedRent - currentRent);
      } else {
        recommendation = "maintain";
      }
    }
    
    // Confidence based on comparable count
    const confidence = Math.min(95, 50 + marketData.count * 5);
    
    return {
      recommendedRent,
      currentRent,
      marketAverage: Math.round(marketAverage),
      percentileInMarket: percentile,
      factors,
      confidence,
      recommendation,
      suggestedIncrease,
    };
  } catch (error) {
    logger.error("Failed to get rent optimization", {
      error: error instanceof Error ? error.message : "Unknown error",
      propertyId,
      unitId,
    });
    
    // Return safe defaults
    return {
      recommendedRent: currentRent,
      currentRent,
      marketAverage: currentRent,
      percentileInMarket: 50,
      factors: [],
      confidence: 0,
      recommendation: "maintain",
    };
  }
}

// ============================================================================
// Ejar Integration
// ============================================================================

/**
 * Register lease with Ejar (Saudi housing ministry portal)
 * 
 * Integrates with the comprehensive Ejar service to register contracts
 * with the Saudi Ministry of Housing's Ejar platform.
 * 
 * @see services/compliance/ejar-service.ts for the core Ejar integration
 */
export async function registerWithEjar(
  orgId: string,
  leaseId: string
): Promise<{ success: boolean; contractNumber?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Fetch lease with full details
    const lease = await db.collection("leases").findOne({
      _id: new ObjectId(leaseId),
      orgId,
      status: LeaseStatus.ACTIVE,
    });
    
    if (!lease) {
      return { success: false, error: "Active lease not found" };
    }
    
    if (lease.ejarRegistration?.status === "registered") {
      return { success: false, error: "Lease already registered with Ejar" };
    }
    
    // Parallelize database fetches for better performance [PR Review Fix]
    const [property, unit, tenant, landlord] = await Promise.all([
      // Fetch property details
      db.collection("properties").findOne({
        _id: new ObjectId(lease.propertyId),
        orgId,
      }),
      // Fetch unit details if applicable
      lease.unitId 
        ? db.collection("units").findOne({
            _id: new ObjectId(lease.unitId),
            propertyId: lease.propertyId,
          })
        : Promise.resolve(null),
      // Fetch tenant details
      db.collection("tenants").findOne({
        _id: new ObjectId(lease.tenantId),
        orgId,
      }),
      // Fetch landlord/owner - use lease.landlordId if available (deterministic) [PR Review Fix]
      // Otherwise fall back to property owner, not an arbitrary admin
      lease.landlordId
        ? db.collection("users").findOne({
            _id: new ObjectId(lease.landlordId),
            orgId,
          })
        : (async () => {
            const prop = await db.collection("properties").findOne({
              _id: new ObjectId(lease.propertyId),
              orgId,
            });
            if (prop?.ownerId) {
              return db.collection("users").findOne({
                _id: new ObjectId(prop.ownerId as string),
                orgId,
              });
            }
            return null;
          })(),
    ]);
    
    if (!property) {
      return { success: false, error: "Property not found for lease" };
    }
    
    if (!tenant) {
      return { success: false, error: "Tenant not found for lease" };
    }
    
    if (!landlord) {
      return { success: false, error: "Landlord/owner not found - ensure lease.landlordId or property.ownerId is set" };
    }
    
    // Validate required fields before calling Ejar service
    const validationErrors: string[] = [];
    
    if (!property.address) {
      validationErrors.push("property.address is required");
    }
    if (!tenant.nationalId && !tenant.iqamaNumber) {
      validationErrors.push("tenant.nationalId or tenant.iqamaNumber is required");
    }
    if (!landlord.nationalId && !landlord.iqamaNumber) {
      validationErrors.push("landlord.nationalId or landlord.iqamaNumber is required");
    }
    if (!lease.startDate || !lease.endDate) {
      validationErrors.push("lease.startDate and lease.endDate are required");
    }
    if (!lease.rentAmount || lease.rentAmount <= 0) {
      validationErrors.push("lease.rentAmount must be greater than 0");
    }
    
    if (validationErrors.length > 0) {
      return { 
        success: false, 
        error: `Missing required fields for Ejar registration: ${validationErrors.join(", ")}` 
      };
    }
    
    // Import and call the comprehensive Ejar service
    const { registerContract, EjarPropertyType } = await import("@/services/compliance/ejar-service");
    
    // Map property type to Ejar enum
    const ejarPropertyType = mapPropertyTypeToEjar(property.type, EjarPropertyType);
    
    // Build the Ejar registration request from fetched data
    const result = await registerContract({
      orgId,
      leaseId,
      property: {
        propertyId: lease.propertyId,
        unitId: lease.unitId,
        type: ejarPropertyType,
        address: {
          streetAddress: property.address || "",
          streetAddressAr: property.addressAr || property.address || "",
          district: property.district || "",
          districtAr: property.districtAr || property.district || "",
          city: property.city || "",
          cityAr: property.cityAr || property.city || "",
          postalCode: property.postalCode,
          buildingNumber: property.buildingNumber,
          nationalAddress: property.nationalAddress,
        },
        area: unit?.area || property.area || 0,
        bedrooms: unit?.bedrooms || property.bedrooms,
        bathrooms: unit?.bathrooms || property.bathrooms,
        amenities: property.amenities,
        deedNumber: property.deedNumber,
        // Fix: Handle empty string yearBuilt edge case [PR Review Fix]
        buildingAge: property.yearBuilt && String(property.yearBuilt).trim() !== ""
          ? new Date().getFullYear() - Number(property.yearBuilt) 
          : undefined,
      },
      landlord: {
        userId: landlord._id.toString(),
        type: landlord.companyId ? "company" : "individual",
        nationalId: landlord.nationalId,
        iqamaNumber: landlord.iqamaNumber,
        commercialRegistration: landlord.commercialRegistration,
        unifiedNumber: landlord.unifiedNumber,
        name: landlord.name || `${landlord.firstName || ""} ${landlord.lastName || ""}`.trim(),
        nameAr: landlord.nameAr || landlord.name || "",
        email: landlord.email || "",
        phone: landlord.phone || "",
        nationality: landlord.nationality,
        verified: !!landlord.verifiedAt,
        verifiedAt: landlord.verifiedAt,
      },
      tenant: {
        userId: tenant._id.toString(),
        type: tenant.companyId ? "company" : "individual",
        nationalId: tenant.nationalId,
        iqamaNumber: tenant.iqamaNumber,
        commercialRegistration: tenant.commercialRegistration,
        name: tenant.name || `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim(),
        nameAr: tenant.nameAr || tenant.name || "",
        email: tenant.email || "",
        phone: tenant.phone || "",
        nationality: tenant.nationality,
        verified: !!tenant.verifiedAt,
        verifiedAt: tenant.verifiedAt,
      },
      terms: {
        startDate: lease.startDate,
        endDate: lease.endDate,
        durationMonths: calculateMonthsDuration(lease.startDate, lease.endDate),
        purpose: property.type?.toLowerCase().includes("commercial") ? "commercial" : "residential",
        furnishingStatus: lease.furnishingStatus || "unfurnished",
        allowSubletting: lease.allowsSubleasing || false,
        autoRenew: lease.isAutoRenew || false,
        // Fix: Use correct field from lease.terms or fallback [PR Review Fix]
        renewalNoticeDays: lease.terms?.noticePeriod || lease.renewalNotice || 30,
        specialConditions: Array.isArray(lease.specialConditions) 
          ? lease.specialConditions.join("; ") 
          : lease.specialConditions,
      },
      financial: {
        annualRent: calculateAnnualRent(lease.rentAmount, lease.rentFrequency),
        monthlyRent: calculateMonthlyRent(lease.rentAmount, lease.rentFrequency),
        securityDeposit: lease.depositAmount || 0,
        paymentFrequency: mapPaymentFrequency(lease.rentFrequency),
        paymentMethod: mapPaymentMethod(lease.paymentMethod),
        utilities: {
          electricity: lease.utilitiesResponsibility?.electricity || "tenant",
          water: lease.utilitiesResponsibility?.water || "tenant",
          gas: lease.utilitiesResponsibility?.gas || "tenant",
        },
        maintenanceResponsibility: lease.maintenanceResponsibility || "landlord",
        lateFee: lease.lateFee,
        lateFeeType: lease.lateFeeType,
        currency: "SAR",
      },
    });
    
    if (!result.success) {
      return { success: false, error: result.error };
    }
    
    // Update the lease with Ejar registration info
    await db.collection("leases").updateOne(
      { _id: new ObjectId(leaseId), orgId },
      {
        $set: {
          ejarRegistration: {
            contractId: result.contractId,
            contractNumber: result.ejarNumber,
            registeredAt: new Date(),
            expiresAt: lease.endDate,
            status: "pending_verification", // Ejar workflow starts with verification
          },
          updatedAt: new Date(),
        },
      }
    );
    
    logger.info("Lease registered with Ejar service", {
      leaseId,
      contractId: result.contractId,
      orgId,
    });
    
    // Note: registerContract returns contractId (internal ID), not ejarNumber
    // ejarNumber is only assigned after submitToEjar is called
    return { success: true, contractNumber: result.contractId };
  } catch (error) {
    logger.error("Failed to register with Ejar", {
      error: error instanceof Error ? error.message : "Unknown error",
      leaseId,
    });
    return { success: false, error: "Failed to register with Ejar" };
  }
}

/**
 * Map internal property type to Ejar property type enum
 */
function mapPropertyTypeToEjar(
  type: string | undefined, 
  EjarPropertyType: typeof import("@/services/compliance/ejar-service").EjarPropertyType
): import("@/services/compliance/ejar-service").EjarPropertyType {
  const typeMap: Record<string, import("@/services/compliance/ejar-service").EjarPropertyType> = {
    apartment: EjarPropertyType.RESIDENTIAL_APARTMENT,
    villa: EjarPropertyType.RESIDENTIAL_VILLA,
    duplex: EjarPropertyType.RESIDENTIAL_DUPLEX,
    office: EjarPropertyType.COMMERCIAL_OFFICE,
    shop: EjarPropertyType.COMMERCIAL_SHOP,
    retail: EjarPropertyType.COMMERCIAL_SHOP,
    warehouse: EjarPropertyType.COMMERCIAL_WAREHOUSE,
    land: EjarPropertyType.LAND,
    residential: EjarPropertyType.RESIDENTIAL_APARTMENT,
    commercial: EjarPropertyType.COMMERCIAL_OFFICE,
  };
  return typeMap[(type || "").toLowerCase()] || EjarPropertyType.RESIDENTIAL_APARTMENT;
}

/**
 * Calculate duration in months between two dates
 * 
 * NOTE: This uses a simplified calendar-based calculation for internal use.
 * The ejar-service has a more comprehensive calculateMonthsDifference function
 * with partial month handling, but this simpler version is sufficient for
 * duration calculation where we only need whole months.
 */
function calculateMonthsDuration(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
}

/**
 * Calculate annual rent from amount and frequency
 */
function calculateAnnualRent(amount: number, frequency?: string): number {
  const multipliers: Record<string, number> = {
    monthly: 12, quarterly: 4, semi_annually: 2, annually: 1, yearly: 1,
  };
  return amount * (multipliers[(frequency || "monthly").toLowerCase()] || 12);
}

/**
 * Calculate monthly rent from amount and frequency
 */
function calculateMonthlyRent(amount: number, frequency?: string): number {
  const divisors: Record<string, number> = {
    monthly: 1, quarterly: 3, semi_annually: 6, annually: 12, yearly: 12,
  };
  return amount / (divisors[(frequency || "monthly").toLowerCase()] || 1);
}

/**
 * Map internal payment frequency to Ejar format
 */
function mapPaymentFrequency(frequency?: string): "monthly" | "quarterly" | "semi_annually" | "annually" {
  const freqMap: Record<string, "monthly" | "quarterly" | "semi_annually" | "annually"> = {
    monthly: "monthly", quarterly: "quarterly", semi_annually: "semi_annually",
    semiannual: "semi_annually", annual: "annually", annually: "annually", yearly: "annually",
  };
  return freqMap[(frequency || "monthly").toLowerCase()] || "monthly";
}

/**
 * Map internal payment method to Ejar format
 */
function mapPaymentMethod(method?: string): "bank_transfer" | "check" | "cash" | "online" {
  const methodMap: Record<string, "bank_transfer" | "check" | "cash" | "online"> = {
    bank_transfer: "bank_transfer", bank: "bank_transfer", transfer: "bank_transfer",
    check: "check", cheque: "check", cash: "cash", online: "online", card: "online",
  };
  return methodMap[(method || "bank_transfer").toLowerCase()] || "bank_transfer";
}

// ============================================================================
// Automation
// ============================================================================

/**
 * Process lease expiry notifications
 * Should be called by a scheduled job
 */
export async function processLeaseExpiryNotifications(
  orgId: string,
  notificationDays: number[] = [90, 60, 30, 14, 7]
): Promise<{ processed: number; notifications: number }> {
  try {
    const db = await getDatabase();
    
    let processed = 0;
    let notifications = 0;
    
    for (const days of notificationDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      targetDate.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      // Find leases that haven't been notified for this specific days value
      const leases = await db.collection("leases")
        .find({
          orgId,
          status: LeaseStatus.ACTIVE,
          endDate: { $gte: targetDate, $lt: nextDay },
          expiryNotificationsSentDays: { $nin: [days] }, // Use days array instead of counter
        })
        .toArray();
      
      for (const lease of leases) {
        // Atomic update with $addToSet to prevent duplicates if job runs concurrently
        const updateResult = await db.collection("leases").updateOne(
          { 
            _id: lease._id, 
            orgId,
            expiryNotificationsSentDays: { $nin: [days] }, // Double-check in filter
          },
          { $addToSet: { expiryNotificationsSentDays: days } }
        );
        
        // Only queue notification if we actually updated the document
        if (updateResult.modifiedCount > 0) {
          await db.collection("notification_queue").insertOne({
            orgId,
            type: "LEASE_EXPIRY_REMINDER",
            recipientId: lease.tenantId,
            recipientType: "tenant",
            data: {
              leaseId: lease._id.toString(),
              leaseNumber: lease.leaseNumber,
              daysUntilExpiry: days,
              endDate: lease.endDate,
              autoRenew: lease.autoRenew,
            },
            status: "pending",
            createdAt: new Date(),
          });
          notifications++;
        }
      }
      
      processed += leases.length;
    }
    
    logger.info("Processed lease expiry notifications", {
      orgId,
      processed,
      notifications,
    });
    
    return { processed, notifications };
  } catch (error) {
    logger.error("Failed to process lease expiry notifications", {
      error: error instanceof Error ? error.message : "Unknown error",
      orgId,
    });
    return { processed: 0, notifications: 0 };
  }
}

/**
 * Process auto-renewals for expiring leases
 * Should be called by a scheduled job
 */
export async function processAutoRenewals(
  orgId: string,
  daysBeforeExpiry: number = 14,
  rentIncreasePercent: number = 5
): Promise<{ processed: number; renewed: number; failed: number }> {
  try {
    const db = await getDatabase();
    
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysBeforeExpiry);
    
    const leases = await db.collection("leases")
      .find({
        orgId,
        status: LeaseStatus.ACTIVE,
        autoRenew: true,
        endDate: { $lte: expiryDate, $gte: new Date() },
        renewalReminderSent: false,
      })
      .toArray();
    
    let renewed = 0;
    let failed = 0;
    
    for (const lease of leases) {
      // Calculate new rent with increase
      const newRent = Math.round(lease.monthlyRent * (1 + rentIncreasePercent / 100));
      
      // Calculate new end date (1 year from current end)
      const newEndDate = new Date(lease.endDate);
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      
      // Use atomic state transition: mark as renewalInProgress before attempting renewal
      const stateUpdate = await db.collection("leases").updateOne(
        { _id: lease._id, orgId, renewalReminderSent: { $ne: true } },
        { $set: { renewalReminderSent: true, renewalAttemptedAt: new Date() } }
      );
      
      // Skip if another process already claimed this lease
      if (stateUpdate.modifiedCount === 0) {
        logger.debug("Lease already being processed for renewal, skipping", { leaseId: lease._id.toString() });
        continue;
      }
      
      const result = await renewLease(
        orgId,
        lease._id.toString(),
        newEndDate,
        newRent,
        "system_auto_renewal"
      );
      
      if (result.success) {
        renewed++;
        // renewalReminderSent already set atomically above
      } else {
        failed++;
        // Rollback the renewalReminderSent flag on failure so it can be retried
        await db.collection("leases").updateOne(
          { _id: lease._id, orgId },
          { $set: { renewalReminderSent: false }, $unset: { renewalAttemptedAt: "" } }
        );
        logger.warn("Auto-renewal failed", {
          leaseId: lease._id.toString(),
          error: result.error,
        });
      }
    }
    
    logger.info("Processed auto-renewals", {
      orgId,
      processed: leases.length,
      renewed,
      failed,
    });
    
    return { processed: leases.length, renewed, failed };
  } catch (error) {
    logger.error("Failed to process auto-renewals", {
      error: error instanceof Error ? error.message : "Unknown error",
      orgId,
    });
    return { processed: 0, renewed: 0, failed: 0 };
  }
}
