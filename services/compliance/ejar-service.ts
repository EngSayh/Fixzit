/**
 * @fileoverview Ejar Integration Service (Saudi Rental Registration Platform)
 * @module services/compliance/ejar-service
 * 
 * Integration with Saudi Ejar platform for:
 * - Rental contract registration
 * - Contract renewal and termination
 * - Tenant/landlord verification
 * - Dispute resolution tracking
 * - Compliance reporting
 * 
 * Ejar is mandatory for all rental contracts in Saudi Arabia
 * 
 * @status IMPLEMENTED [AGENT-0001]
 * @created 2025-12-29
 */

import { ObjectId } from "mongodb";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate the number of months between two dates
 * Uses calendar-based calculation (year*12 + month difference).
 * 
 * NOTE: This uses whole-month semantics - it ignores day-of-month by default.
 * Examples with includePartialMonths=false (default):
 *   - Jan 1 → Jan 31 = 0 months
 *   - Jan 31 → Feb 1 = 1 month  
 *   - Jan 1 → Feb 1 = 1 month
 * 
 * @param start - Start date
 * @param end - End date (must be >= start)
 * @param includePartialMonths - If true, adds 1 when end.date >= start.date
 * @returns Number of months (minimum 0)
 */
function calculateMonthsDifference(start: Date, end: Date, includePartialMonths: boolean = false): number {
  // Handle invalid date order
  if (end < start) {
    return 0;
  }
  
  let months = (end.getFullYear() - start.getFullYear()) * 12 + 
               (end.getMonth() - start.getMonth());
  
  // If including partial months, add 1 when end day >= start day
  if (includePartialMonths && end.getDate() >= start.getDate()) {
    months += 1;
  }
  
  return Math.max(0, months);
}

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Ejar contract status
 */
export enum EjarContractStatus {
  DRAFT = "draft",
  PENDING_VERIFICATION = "pending_verification",
  PENDING_SIGNATURES = "pending_signatures",
  ACTIVE = "active",
  RENEWED = "renewed",
  PENDING_TERMINATION = "pending_termination",
  TERMINATED = "terminated",
  EXPIRED = "expired",
  DISPUTED = "disputed",
  CANCELLED = "cancelled",
}

/**
 * Ejar property type
 */
export enum EjarPropertyType {
  RESIDENTIAL_APARTMENT = "residential_apartment",
  RESIDENTIAL_VILLA = "residential_villa",
  RESIDENTIAL_DUPLEX = "residential_duplex",
  COMMERCIAL_OFFICE = "commercial_office",
  COMMERCIAL_SHOP = "commercial_shop",
  COMMERCIAL_WAREHOUSE = "commercial_warehouse",
  LAND = "land",
}

/**
 * Ejar contract record
 */
export interface EjarContract {
  _id?: ObjectId;
  orgId: string;
  leaseId: string; // Reference to internal lease
  
  // Ejar identifiers
  ejarNumber?: string;
  ejarRegistrationDate?: Date;
  
  // Property details
  property: EjarPropertyDetails;
  
  // Parties
  landlord: EjarPartyDetails;
  tenant: EjarPartyDetails;
  broker?: EjarBrokerDetails;
  
  // Contract terms
  terms: EjarContractTerms;
  
  // Financial
  financial: EjarFinancialDetails;
  
  // Status
  status: EjarContractStatus;
  statusHistory: StatusHistoryEntry[];
  
  // Verification
  verification: EjarVerification;
  
  // Signatures
  signatures: EjarSignatures;
  
  // Compliance
  compliance: EjarCompliance;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  activatedAt?: Date;
  terminatedAt?: Date;
  expiresAt?: Date;
}

/**
 * Ejar property details
 */
export interface EjarPropertyDetails {
  propertyId: string;
  unitId?: string;
  type: EjarPropertyType;
  address: {
    streetAddress: string;
    streetAddressAr: string;
    district: string;
    districtAr: string;
    city: string;
    cityAr: string;
    postalCode?: string;
    buildingNumber?: string;
    additionalNumber?: string;
    nationalAddress?: string; // Saudi National Address
  };
  area: number; // Square meters
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  deedNumber?: string;
  buildingAge?: number;
}

/**
 * Ejar party details
 */
export interface EjarPartyDetails {
  userId: string;
  type: "individual" | "company";
  
  // For individuals
  nationalId?: string; // Saudi ID
  iqamaNumber?: string; // Resident ID for non-Saudis
  passportNumber?: string;
  
  // For companies
  commercialRegistration?: string;
  unifiedNumber?: string; // 700 number
  
  // Common
  name: string;
  nameAr: string;
  email: string;
  phone: string;
  nationality?: string;
  address?: string;
  addressAr?: string;
  
  // Verification
  verified: boolean;
  verifiedAt?: Date;
  verificationMethod?: string;
}

/**
 * Ejar broker details
 */
export interface EjarBrokerDetails {
  brokerId: string;
  name: string;
  nameAr: string;
  license: string;
  licenseExpiry: Date;
  commission: number;
  commissionType: "percentage" | "fixed";
}

/**
 * Ejar contract terms
 */
export interface EjarContractTerms {
  startDate: Date;
  endDate: Date;
  durationMonths: number;
  purpose: "residential" | "commercial";
  furnishingStatus: "furnished" | "semi_furnished" | "unfurnished";
  allowSubletting: boolean;
  specialConditions?: string;
  specialConditionsAr?: string;
  autoRenew: boolean;
  renewalNoticeDays: number;
}

/**
 * Ejar financial details
 */
export interface EjarFinancialDetails {
  annualRent: number;
  monthlyRent: number;
  securityDeposit: number;
  paymentFrequency: "monthly" | "quarterly" | "semi_annually" | "annually";
  paymentMethod: "bank_transfer" | "check" | "cash" | "online";
  utilities: {
    electricity: "landlord" | "tenant";
    water: "landlord" | "tenant";
    gas: "landlord" | "tenant";
  };
  maintenanceResponsibility: "landlord" | "tenant" | "shared";
  lateFee?: number;
  lateFeeType?: "percentage" | "fixed";
  currency: "SAR";
}

/**
 * Status history entry
 */
export interface StatusHistoryEntry {
  status: EjarContractStatus;
  changedAt: Date;
  changedBy: string;
  reason?: string;
}

/**
 * Ejar verification
 */
export interface EjarVerification {
  propertyVerified: boolean;
  propertyVerifiedAt?: Date;
  landlordVerified: boolean;
  landlordVerifiedAt?: Date;
  tenantVerified: boolean;
  tenantVerifiedAt?: Date;
  documentsVerified: boolean;
  documentsVerifiedAt?: Date;
  nationalAddressVerified: boolean;
  nationalAddressVerifiedAt?: Date;
}

/**
 * Ejar signatures
 */
export interface EjarSignatures {
  landlordSigned: boolean;
  landlordSignedAt?: Date;
  landlordSignatureMethod?: "electronic" | "manual";
  tenantSigned: boolean;
  tenantSignedAt?: Date;
  tenantSignatureMethod?: "electronic" | "manual";
  brokerSigned?: boolean;
  brokerSignedAt?: Date;
  witnessSigned?: boolean;
  witnessSignedAt?: Date;
}

/**
 * Ejar compliance
 */
export interface EjarCompliance {
  compliant: boolean;
  issues: ComplianceIssue[];
  lastCheckAt?: Date;
  nextCheckDue?: Date;
}

/**
 * Compliance issue
 */
export interface ComplianceIssue {
  code: string;
  severity: "info" | "warning" | "error";
  message: string;
  messageAr: string;
  detectedAt: Date;
  resolvedAt?: Date;
}

/**
 * Ejar registration request
 */
export interface EjarRegistrationRequest {
  orgId: string;
  leaseId: string;
  property: EjarPropertyDetails;
  landlord: EjarPartyDetails;
  tenant: EjarPartyDetails;
  broker?: EjarBrokerDetails;
  terms: EjarContractTerms;
  financial: EjarFinancialDetails;
}

// ============================================================================
// Constants
// ============================================================================

const EJAR_COLLECTION = "ejar_contracts";

// Ejar API endpoints (would be configured per environment)
const _EJAR_API_BASE = process.env.EJAR_API_URL || "https://api.ejar.sa/v1";

// Compliance check frequency
const COMPLIANCE_CHECK_INTERVAL_DAYS = 30;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Register contract with Ejar
 */
export async function registerContract(
  request: EjarRegistrationRequest
): Promise<{ success: boolean; contractId?: string; ejarNumber?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Validate request
    const validation = validateRegistrationRequest(request);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    // Check for duplicate
    const existing = await db.collection(EJAR_COLLECTION).findOne({
      orgId: request.orgId,
      leaseId: request.leaseId,
      status: { $nin: [EjarContractStatus.CANCELLED, EjarContractStatus.TERMINATED, EjarContractStatus.EXPIRED] },
    });
    
    if (existing) {
      return { success: false, error: "Lease already has an active Ejar contract" };
    }
    
    // Create contract record
    const contract: Omit<EjarContract, "_id"> = {
      orgId: request.orgId,
      leaseId: request.leaseId,
      property: request.property,
      landlord: request.landlord,
      tenant: request.tenant,
      broker: request.broker,
      terms: request.terms,
      financial: request.financial,
      status: EjarContractStatus.DRAFT,
      statusHistory: [{
        status: EjarContractStatus.DRAFT,
        changedAt: new Date(),
        changedBy: "system",
        reason: "Initial creation",
      }],
      verification: {
        propertyVerified: false,
        landlordVerified: false,
        tenantVerified: false,
        documentsVerified: false,
        nationalAddressVerified: false,
      },
      signatures: {
        landlordSigned: false,
        tenantSigned: false,
      },
      compliance: {
        compliant: false,
        issues: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: request.terms.endDate,
    };
    
    const result = await db.collection(EJAR_COLLECTION).insertOne(contract);
    
    logger.info("Ejar contract created", {
      component: "ejar-service",
      action: "registerContract",
    });
    
    return {
      success: true,
      contractId: result.insertedId.toString(),
    };
  } catch (error) {
    logger.error("Failed to register Ejar contract", { 
      component: "ejar-service",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: "Failed to register contract" };
  }
}

/**
 * Submit contract to Ejar platform
 */
export async function submitToEjar(
  orgId: string,
  contractId: string
): Promise<{ success: boolean; ejarNumber?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Get contract
    const contract = await getContract(orgId, contractId);
    if (!contract) {
      return { success: false, error: "Contract not found" };
    }
    
    // Validate readiness
    const readiness = await checkSubmissionReadiness(contract);
    if (!readiness.ready) {
      return { success: false, error: readiness.error };
    }
    
    // In production, this would call the actual Ejar API
    // Simulating successful submission
    const ejarNumber = generateEjarNumber();
    
    // Single atomic update: status + ejarNumber + timestamps + history
    const historyEntry = {
      status: EjarContractStatus.PENDING_VERIFICATION,
      changedAt: new Date(),
      changedBy: "system",
      reason: "Submitted to Ejar platform",
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateOp: any = {
      $set: {
        status: EjarContractStatus.PENDING_VERIFICATION,
        ejarNumber,
        ejarRegistrationDate: new Date(),
        submittedAt: new Date(),
        updatedAt: new Date(),
      },
      $push: { statusHistory: historyEntry },
    };
    
    await db.collection(EJAR_COLLECTION).updateOne(
      { _id: new ObjectId(contractId), orgId },
      updateOp
    );
    
    logger.info("Contract submitted to Ejar", {
      component: "ejar-service",
      action: "submitToEjar",
    });
    
    return { success: true, ejarNumber };
  } catch (error) {
    logger.error("Failed to submit to Ejar", { 
      component: "ejar-service",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: "Failed to submit to Ejar" };
  }
}

/**
 * Verify party (landlord or tenant)
 */
export async function verifyParty(
  orgId: string,
  contractId: string,
  partyType: "landlord" | "tenant",
  verificationData: {
    method: string;
    verified: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const updateField = partyType === "landlord" 
      ? "verification.landlordVerified"
      : "verification.tenantVerified";
    
    const updateTimeField = partyType === "landlord"
      ? "verification.landlordVerifiedAt"
      : "verification.tenantVerifiedAt";
    
    const result = await db.collection(EJAR_COLLECTION).updateOne(
      { _id: new ObjectId(contractId), orgId },
      {
        $set: {
          [updateField]: verificationData.verified,
          [updateTimeField]: new Date(),
          [`${partyType}.verified`]: verificationData.verified,
          [`${partyType}.verifiedAt`]: new Date(),
          [`${partyType}.verificationMethod`]: verificationData.method,
          updatedAt: new Date(),
        },
      }
    );
    
    if (result.matchedCount === 0) {
      return { success: false, error: "Contract not found" };
    }
    
    // Check if both parties verified to update status
    await checkAndUpdatePendingSignatures(orgId, contractId);
    
    return { success: true };
  } catch (error) {
    logger.error("Failed to verify party", { 
      component: "ejar-service",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: "Failed to verify party" };
  }
}

/**
 * Record signature
 */
export async function recordSignature(
  orgId: string,
  contractId: string,
  partyType: "landlord" | "tenant" | "broker",
  signatureMethod: "electronic" | "manual"
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const signedField = `signatures.${partyType}Signed`;
    const signedAtField = `signatures.${partyType}SignedAt`;
    const methodField = `signatures.${partyType}SignatureMethod`;
    
    const result = await db.collection(EJAR_COLLECTION).updateOne(
      { _id: new ObjectId(contractId), orgId },
      {
        $set: {
          [signedField]: true,
          [signedAtField]: new Date(),
          [methodField]: signatureMethod,
          updatedAt: new Date(),
        },
      }
    );
    
    if (result.matchedCount === 0) {
      return { success: false, error: "Contract not found" };
    }
    
    // Check if all required signatures collected
    await checkAndActivateContract(orgId, contractId);
    
    return { success: true };
  } catch (error) {
    logger.error("Failed to record signature", { 
      component: "ejar-service",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: "Failed to record signature" };
  }
}

/**
 * Initiate contract renewal
 */
export async function initiateRenewal(
  orgId: string,
  contractId: string,
  newTerms: {
    endDate: Date;
    newRent?: number;
  }
): Promise<{ success: boolean; renewalContractId?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    const contract = await getContract(orgId, contractId);
    if (!contract) {
      return { success: false, error: "Contract not found" };
    }
    
    if (contract.status !== EjarContractStatus.ACTIVE) {
      return { success: false, error: "Only active contracts can be renewed" };
    }
    
    // Create renewal contract based on existing
    const { _id: _existingId, ejarNumber: _existingEjarNumber, ejarRegistrationDate: _existingRegDate, ...contractBase } = contract;
    const renewalContract: Omit<EjarContract, "_id"> = {
      ...contractBase,
      terms: {
        ...contract.terms,
        startDate: contract.terms.endDate,
        endDate: newTerms.endDate,
        durationMonths: calculateMonthsDifference(contract.terms.endDate, newTerms.endDate),
      },
      financial: {
        ...contract.financial,
        annualRent: newTerms.newRent || contract.financial.annualRent,
        monthlyRent: Math.round((newTerms.newRent || contract.financial.annualRent) / 12),
      },
      status: EjarContractStatus.DRAFT,
      statusHistory: [{
        status: EjarContractStatus.DRAFT,
        changedAt: new Date(),
        changedBy: "system",
        reason: `Renewal of contract ${contract.ejarNumber}`,
      }],
      signatures: {
        landlordSigned: false,
        tenantSigned: false,
      },
      // Reset verification state for renewal - requires fresh verification
      verification: {
        landlordVerified: false,
        tenantVerified: false,
        propertyVerified: false,
        documentsVerified: false,
        nationalAddressVerified: false,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      submittedAt: undefined,
      activatedAt: undefined,
      expiresAt: newTerms.endDate,
    };
    
    const result = await db.collection(EJAR_COLLECTION).insertOne(renewalContract);
    
    // Update original contract status
    await updateContractStatus(
      orgId,
      contractId,
      EjarContractStatus.RENEWED,
      "system",
      `Renewed with contract ${result.insertedId.toString()}`
    );
    
    logger.info("Contract renewal initiated", {
      component: "ejar-service",
      action: "initiateRenewal",
    });
    
    return {
      success: true,
      renewalContractId: result.insertedId.toString(),
    };
  } catch (error) {
    logger.error("Failed to initiate renewal", { 
      component: "ejar-service",
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, error: "Failed to initiate renewal" };
  }
}

/**
 * Terminate contract
 */
export async function terminateContract(
  orgId: string,
  contractId: string,
  reason: string,
  terminatedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const contract = await getContract(orgId, contractId);
    if (!contract) {
      return { success: false, error: "Contract not found" };
    }
    
    if (contract.status === EjarContractStatus.TERMINATED) {
      return { success: false, error: "Contract already terminated" };
    }
    
    // Atomic update: combine status update and terminatedAt in single operation
    // This prevents race conditions from separate DB writes
    const historyEntry: StatusHistoryEntry = {
      status: EjarContractStatus.TERMINATED,
      changedAt: new Date(),
      changedBy: terminatedBy,
      reason,
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateOp: any = {
      $set: {
        status: EjarContractStatus.TERMINATED,
        terminatedAt: new Date(),
        updatedAt: new Date(),
      },
      $push: { statusHistory: historyEntry },
    };
    
    await db.collection(EJAR_COLLECTION).updateOne(
      { _id: new ObjectId(contractId), orgId },
      updateOp
    );
    
    // In production, would notify Ejar platform
    
    logger.info("Contract terminated", {
      component: "ejar-service",
      action: "terminateContract",
    });
    
    return { success: true };
  } catch (error) {
    logger.error("Failed to terminate contract", { 
      component: "ejar-service",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: "Failed to terminate contract" };
  }
}

/**
 * Run compliance check
 */
export async function runComplianceCheck(
  orgId: string,
  contractId: string
): Promise<{ compliant: boolean; issues: ComplianceIssue[] }> {
  try {
    const db = await getDatabase();
    
    const contract = await getContract(orgId, contractId);
    if (!contract) {
      return { compliant: false, issues: [{
        code: "CONTRACT_NOT_FOUND",
        severity: "error",
        message: "Contract not found",
        messageAr: "العقد غير موجود",
        detectedAt: new Date(),
      }]};
    }
    
    const issues: ComplianceIssue[] = [];
    
    // Check Ejar registration
    if (!contract.ejarNumber) {
      issues.push({
        code: "NO_EJAR_NUMBER",
        severity: "error",
        message: "Contract not registered with Ejar",
        messageAr: "العقد غير مسجل في إيجار",
        detectedAt: new Date(),
      });
    }
    
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiresAt = contract.expiresAt ? new Date(contract.expiresAt) : null;
    
    // Check expiration
    if (expiresAt && expiresAt < now) {
      issues.push({
        code: "CONTRACT_EXPIRED",
        severity: "error",
        message: "Contract has expired",
        messageAr: "العقد منتهي الصلاحية",
        detectedAt: now,
      });
    }
    
    // Check upcoming expiration
    if (expiresAt && expiresAt > now && expiresAt < thirtyDaysFromNow) {
      issues.push({
        code: "EXPIRING_SOON",
        severity: "warning",
        message: "Contract expires within 30 days",
        messageAr: "العقد ينتهي خلال 30 يوم",
        detectedAt: now,
      });
    }
    
    // Check landlord verification
    if (!contract.verification.landlordVerified) {
      issues.push({
        code: "LANDLORD_NOT_VERIFIED",
        severity: "warning",
        message: "Landlord identity not verified",
        messageAr: "هوية المالك غير موثقة",
        detectedAt: new Date(),
      });
    }
    
    // Check tenant verification
    if (!contract.verification.tenantVerified) {
      issues.push({
        code: "TENANT_NOT_VERIFIED",
        severity: "warning",
        message: "Tenant identity not verified",
        messageAr: "هوية المستأجر غير موثقة",
        detectedAt: new Date(),
      });
    }
    
    // Check signatures
    if (!contract.signatures.landlordSigned || !contract.signatures.tenantSigned) {
      issues.push({
        code: "MISSING_SIGNATURES",
        severity: "error",
        message: "Contract missing required signatures",
        messageAr: "العقد يفتقر إلى التوقيعات المطلوبة",
        detectedAt: new Date(),
      });
    }
    
    // Check national address
    if (!contract.verification.nationalAddressVerified) {
      issues.push({
        code: "NATIONAL_ADDRESS_NOT_VERIFIED",
        severity: "info",
        message: "National address not verified",
        messageAr: "العنوان الوطني غير موثق",
        detectedAt: new Date(),
      });
    }
    
    const compliant = issues.filter(i => i.severity === "error").length === 0;
    
    // Update contract compliance status
    const nextCheckDue = new Date();
    nextCheckDue.setDate(nextCheckDue.getDate() + COMPLIANCE_CHECK_INTERVAL_DAYS);
    
    await db.collection(EJAR_COLLECTION).updateOne(
      { _id: new ObjectId(contractId), orgId },
      {
        $set: {
          compliance: {
            compliant,
            issues,
            lastCheckAt: new Date(),
            nextCheckDue,
          },
          updatedAt: new Date(),
        },
      }
    );
    
    return { compliant, issues };
  } catch (error) {
    logger.error("Failed to run compliance check", { 
      component: "ejar-service",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Return a clear error indicator instead of hiding the failure
    return { 
      compliant: false, 
      issues: [{
        code: "SYSTEM_ERROR",
        severity: "error",
        message: "Compliance check failed due to internal error - please retry",
        messageAr: "فشل فحص الامتثال بسبب خطأ داخلي - يرجى إعادة المحاولة",
        detectedAt: new Date(),
      }],
    };
  }
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get contract by ID
 */
export async function getContract(
  orgId: string,
  contractId: string
): Promise<EjarContract | null> {
  try {
    const db = await getDatabase();
    
    const contract = await db.collection<EjarContract>(EJAR_COLLECTION).findOne({
      _id: new ObjectId(contractId),
      orgId,
    });
    
    return contract;
  } catch (error) {
    logger.error("Failed to get contract", { 
      component: "ejar-service",
      contractId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * Get contract by Ejar number
 */
export async function getContractByEjarNumber(
  orgId: string,
  ejarNumber: string
): Promise<EjarContract | null> {
  try {
    const db = await getDatabase();
    
    const contract = await db.collection<EjarContract>(EJAR_COLLECTION).findOne({
      orgId,
      ejarNumber,
    });
    
    return contract;
  } catch (error) {
    logger.error("Failed to get contract by Ejar number", { 
      component: "ejar-service",
      ejarNumber,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return null;
  }
}

/**
 * List contracts
 */
export async function listContracts(
  orgId: string,
  filters?: {
    status?: EjarContractStatus[];
    propertyId?: string;
    landlordId?: string;
    tenantId?: string;
    expiringBefore?: Date;
  },
  options?: { page?: number; limit?: number }
): Promise<{ contracts: EjarContract[]; total: number }> {
  try {
    const db = await getDatabase();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { orgId };
    
    if (filters?.status?.length) {
      query.status = { $in: filters.status };
    }
    if (filters?.propertyId) {
      query["property.propertyId"] = filters.propertyId;
    }
    if (filters?.landlordId) {
      query["landlord.userId"] = filters.landlordId;
    }
    if (filters?.tenantId) {
      query["tenant.userId"] = filters.tenantId;
    }
    if (filters?.expiringBefore) {
      query.expiresAt = { $lte: filters.expiringBefore };
    }
    
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;
    
    const [contracts, total] = await Promise.all([
      db.collection<EjarContract>(EJAR_COLLECTION)
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(EJAR_COLLECTION).countDocuments(query),
    ]);
    
    return {
      contracts,
      total,
    };
  } catch (error) {
    logger.error("Failed to list contracts", { 
      component: "ejar-service",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { contracts: [], total: 0 };
  }
}

/**
 * Get compliance summary
 */
export async function getComplianceSummary(
  orgId: string
): Promise<{
  total: number;
  compliant: number;
  nonCompliant: number;
  expiringSoon: number;
  pendingVerification: number;
}> {
  try {
    const db = await getDatabase();
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const pipeline = [
      { $match: { orgId, status: { $ne: EjarContractStatus.CANCELLED } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          compliant: {
            $sum: { $cond: [{ $eq: ["$compliance.compliant", true] }, 1, 0] },
          },
          expiringSoon: {
            $sum: {
              $cond: [
                { $and: [
                  { $lte: ["$expiresAt", thirtyDaysFromNow] },
                  { $gt: ["$expiresAt", new Date()] },
                ]},
                1,
                0,
              ],
            },
          },
          pendingVerification: {
            $sum: {
              $cond: [{ $eq: ["$status", EjarContractStatus.PENDING_VERIFICATION] }, 1, 0],
            },
          },
        },
      },
    ];
    
    const results = await db.collection(EJAR_COLLECTION)
      .aggregate(pipeline)
      .toArray();
    
    const data = results[0] || {};
    
    return {
      total: data.total || 0,
      compliant: data.compliant || 0,
      nonCompliant: (data.total || 0) - (data.compliant || 0),
      expiringSoon: data.expiringSoon || 0,
      pendingVerification: data.pendingVerification || 0,
    };
  } catch (error) {
    logger.error("Failed to get compliance summary", { 
      component: "ejar-service",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return {
      total: 0,
      compliant: 0,
      nonCompliant: 0,
      expiringSoon: 0,
      pendingVerification: 0,
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function validateRegistrationRequest(
  request: EjarRegistrationRequest
): { valid: boolean; error?: string } {
  // Check required fields
  if (!request.property.address.streetAddress) {
    return { valid: false, error: "Property address is required" };
  }
  
  if (!request.landlord.nationalId && !request.landlord.commercialRegistration) {
    return { valid: false, error: "Landlord ID or CR is required" };
  }
  
  if (!request.tenant.nationalId && !request.tenant.iqamaNumber) {
    return { valid: false, error: "Tenant ID or Iqama is required" };
  }
  
  if (request.terms.startDate >= request.terms.endDate) {
    return { valid: false, error: "End date must be after start date" };
  }
  
  return { valid: true };
}

async function checkSubmissionReadiness(
  contract: EjarContract
): Promise<{ ready: boolean; error?: string }> {
  if (contract.status !== EjarContractStatus.DRAFT) {
    return { ready: false, error: "Contract already submitted" };
  }
  
  if (!contract.property.deedNumber) {
    return { ready: false, error: "Property deed number is required" };
  }
  
  return { ready: true };
}

function generateEjarNumber(): string {
  const year = new Date().getFullYear();
  // Use crypto.randomUUID for robust random generation instead of Math.random
  const uuid = crypto.randomUUID().replace(/-/g, "").substring(0, 8).toUpperCase();
  return `EJAR-${year}-${uuid}`;
}

async function updateContractStatus(
  orgId: string,
  contractId: string,
  status: EjarContractStatus,
  changedBy: string,
  reason?: string
): Promise<void> {
  try {
    const db = await getDatabase();
    
    const historyEntry: StatusHistoryEntry = {
      status,
      changedAt: new Date(),
      changedBy,
      reason,
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateOp: any = {
      $set: {
        status,
        updatedAt: new Date(),
      },
      $push: { statusHistory: historyEntry },
    };
    
    await db.collection(EJAR_COLLECTION).updateOne(
      { _id: new ObjectId(contractId), orgId },
      updateOp
    );
  } catch (error) {
    logger.error("Failed to update contract status", { 
      component: "ejar-service",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
}

async function checkAndUpdatePendingSignatures(
  orgId: string,
  contractId: string
): Promise<void> {
  const contract = await getContract(orgId, contractId);
  if (!contract) return;
  
  if (
    contract.status === EjarContractStatus.PENDING_VERIFICATION &&
    contract.verification.landlordVerified &&
    contract.verification.tenantVerified
  ) {
    await updateContractStatus(
      orgId,
      contractId,
      EjarContractStatus.PENDING_SIGNATURES,
      "system",
      "All parties verified"
    );
  }
}

async function checkAndActivateContract(
  orgId: string,
  contractId: string
): Promise<void> {
  const db = await getDatabase();
  
  const contract = await getContract(orgId, contractId);
  if (!contract) return;
  
  if (
    contract.status === EjarContractStatus.PENDING_SIGNATURES &&
    contract.signatures.landlordSigned &&
    contract.signatures.tenantSigned
  ) {
    // Atomic update: combine status change and activatedAt in single operation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MongoDB $push operator typing
    const update: any = {
      $set: {
        status: EjarContractStatus.ACTIVE,
        activatedAt: new Date(),
        updatedAt: new Date(),
      },
      $push: {
        statusHistory: {
          status: EjarContractStatus.ACTIVE,
          changedBy: "system",
          changedAt: new Date(),
          reason: "All required signatures collected",
        },
      },
    };
    await db.collection(EJAR_COLLECTION).updateOne(
      { _id: new ObjectId(contractId), orgId },
      update
    );
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  registerContract,
  submitToEjar,
  verifyParty,
  recordSignature,
  initiateRenewal,
  terminateContract,
  runComplianceCheck,
  getContract,
  getContractByEjarNumber,
  listContracts,
  getComplianceSummary,
};
