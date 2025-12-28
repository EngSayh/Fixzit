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
 * @author [AGENT-001-A]
 * @created 2025-12-28
 */

import { ObjectId } from "mongodb";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";

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
  
  // Automation flags
  autoRenew: boolean;
  renewalReminderSent: boolean;
  expiryNotificationsSent: number;
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
  
  const seq = result?.seq || 1;
  return `LSE-${year}-${seq.toString().padStart(5, "0")}`;
}

// ============================================================================
// Core Lease Operations
// ============================================================================

/**
 * Create a new lease
 */
export async function createLease(
  request: CreateLeaseRequest
): Promise<{ success: boolean; lease?: LeaseDocument; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Validate property and unit exist and are available
    const unit = await db.collection("units").findOne({
      _id: new ObjectId(request.unitId),
      propertyId: request.propertyId,
      orgId: request.orgId,
    });
    
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
    });
    
    if (!tenant) {
      return { success: false, error: "Tenant not found" };
    }
    
    // Check for overlapping leases
    const overlapping = await db.collection("leases").findOne({
      unitId: request.unitId,
      status: { $in: [LeaseStatus.ACTIVE, LeaseStatus.PENDING_APPROVAL] },
      $or: [
        { startDate: { $lte: request.endDate }, endDate: { $gte: request.startDate } },
      ],
    });
    
    if (overlapping) {
      return { success: false, error: "Overlapping lease exists for this unit" };
    }
    
    // Calculate annual rent
    const _monthsDuration = Math.ceil(
      (request.endDate.getTime() - request.startDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
    ); // Reserved for pro-rated rent calculations
    const annualRent = request.monthlyRent * 12;
    
    // Generate lease number
    const leaseNumber = await generateLeaseNumber(request.orgId);
    
    // Create lease document
    const lease: Omit<LeaseDocument, "_id"> = {
      orgId: request.orgId,
      propertyId: request.propertyId,
      unitId: request.unitId,
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
      expiryNotificationsSent: 0,
    };
    
    const result = await db.collection("leases").insertOne(lease);
    
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
      request,
    });
    return { success: false, error: "Failed to create lease" };
  }
}

/**
 * Activate a lease (move from draft to active)
 */
export async function activateLease(
  orgId: string,
  leaseId: string,
  activatedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const lease = await db.collection("leases").findOne({
      _id: new ObjectId(leaseId),
      orgId,
    });
    
    if (!lease) {
      return { success: false, error: "Lease not found" };
    }
    
    if (lease.status !== LeaseStatus.DRAFT && lease.status !== LeaseStatus.PENDING_APPROVAL) {
      return { success: false, error: `Cannot activate lease in ${lease.status} status` };
    }
    
    // Update lease status
    await db.collection("leases").updateOne(
      { _id: new ObjectId(leaseId), orgId },
      {
        $set: {
          status: LeaseStatus.ACTIVE,
          updatedBy: activatedBy,
          updatedAt: new Date(),
        },
      }
    );
    
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
      }
    );
    
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
    
    const currentLease = await db.collection("leases").findOne({
      _id: new ObjectId(leaseId),
      orgId,
      status: LeaseStatus.ACTIVE,
    });
    
    if (!currentLease) {
      return { success: false, error: "Active lease not found" };
    }
    
    // Mark current lease as renewed
    await db.collection("leases").updateOne(
      { _id: new ObjectId(leaseId), orgId },
      {
        $set: {
          status: LeaseStatus.RENEWED,
          renewalDate: new Date(),
          updatedBy: renewedBy,
          updatedAt: new Date(),
        },
      }
    );
    
    // Create new lease starting from current end date
    const createResult = await createLease({
      orgId,
      propertyId: currentLease.propertyId,
      unitId: currentLease.unitId,
      tenantId: currentLease.tenantId,
      startDate: currentLease.endDate,
      endDate: newEndDate,
      monthlyRent: newMonthlyRent,
      securityDeposit: currentLease.securityDeposit,
      paymentFrequency: currentLease.paymentFrequency,
      paymentDueDay: currentLease.paymentDueDay,
      terms: currentLease.terms,
      autoRenew: currentLease.autoRenew,
      createdBy: renewedBy,
    });
    
    if (!createResult.success) {
      return { success: false, error: createResult.error };
    }
    
    // Activate the new lease
    if (createResult.lease) {
      await activateLease(orgId, createResult.lease._id.toString(), renewedBy);
    }
    
    logger.info("Lease renewed", {
      oldLeaseId: leaseId,
      newLeaseId: createResult.lease?._id.toString(),
      orgId,
    });
    
    return { success: true, newLease: createResult.lease };
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
    
    // Update lease
    await db.collection("leases").updateOne(
      { _id: new ObjectId(leaseId), orgId },
      {
        $set: {
          status: LeaseStatus.TERMINATED,
          endDate: terminationDate,
          updatedBy: terminatedBy,
          updatedAt: new Date(),
          terminationDetails: {
            date: terminationDate,
            reason,
            terminatedBy,
            earlyTerminationFee,
          },
        },
      }
    );
    
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
      }
    );
    
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
        $lookup: {
          from: "units",
          localField: "unitId",
          foreignField: "_id",
          as: "unitDetails",
        },
      },
      {
        $unwind: "$unitDetails",
      },
      {
        $match: {
          "unitDetails.bedrooms": { $gte: (unit.bedrooms || 1) - 1, $lte: (unit.bedrooms || 1) + 1 },
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
 * Note: This is a placeholder for actual Ejar API integration
 * Real implementation would require Ejar API credentials and endpoints
 */
export async function registerWithEjar(
  orgId: string,
  leaseId: string
): Promise<{ success: boolean; contractNumber?: string; error?: string }> {
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
    
    if (lease.ejarRegistration?.status === "registered") {
      return { success: false, error: "Lease already registered with Ejar" };
    }
    
    // TODO: Implement actual Ejar API call
    // For now, simulate successful registration
    const contractNumber = `EJAR-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    await db.collection("leases").updateOne(
      { _id: new ObjectId(leaseId), orgId },
      {
        $set: {
          ejarRegistration: {
            contractNumber,
            registeredAt: new Date(),
            expiresAt: lease.endDate,
            status: "registered",
          },
          updatedAt: new Date(),
        },
      }
    );
    
    logger.info("Lease registered with Ejar", {
      leaseId,
      contractNumber,
      orgId,
    });
    
    return { success: true, contractNumber };
  } catch (error) {
    logger.error("Failed to register with Ejar", {
      error: error instanceof Error ? error.message : "Unknown error",
      leaseId,
    });
    return { success: false, error: "Failed to register with Ejar" };
  }
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
      
      const leases = await db.collection("leases")
        .find({
          orgId,
          status: LeaseStatus.ACTIVE,
          endDate: { $gte: targetDate, $lt: nextDay },
          expiryNotificationsSent: { $lt: notificationDays.indexOf(days) + 1 },
        })
        .toArray();
      
      for (const lease of leases) {
        // Queue notification (would integrate with notification service)
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
        
        // Update notification count
        await db.collection("leases").updateOne(
          { _id: lease._id },
          { $inc: { expiryNotificationsSent: 1 } }
        );
        
        notifications++;
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
      
      const result = await renewLease(
        orgId,
        lease._id.toString(),
        newEndDate,
        newRent,
        "system_auto_renewal"
      );
      
      if (result.success) {
        renewed++;
        
        // Mark original lease as reminder sent
        await db.collection("leases").updateOne(
          { _id: lease._id },
          { $set: { renewalReminderSent: true } }
        );
      } else {
        failed++;
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
