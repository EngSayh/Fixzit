/**
 * PDPL (Personal Data Protection Law) Compliance Service
 * 
 * Implements Saudi PDPL requirements:
 * - Consent management (purpose-specific)
 * - DSAR workflows (30-day SLA)
 * - Right to erasure (soft-delete with audit)
 * - Cross-border transfer controls
 * - Breach notification (72-hour)
 * 
 * @module services/compliance/pdpl-service
 */

import type {
  PdplConsent,
  PdplConsentPurpose,
  DsarRequest,
  DsarRequestType,
  DsarStatus,
} from "@/types/compliance";
import type { ObjectId } from "mongodb";
import { logger } from "@/lib/logger";
import { COLLECTIONS } from "@/lib/db/collection-names";

// =============================================================================
// CONFIGURATION
// =============================================================================

/** 
 * Countries commonly treated as having adequate data protection for PDPL purposes.
 * Note: SDAIA has not published an official adequacy list. Cross-border transfers
 * should rely on SDAIA-approved safeguards (SCCs, BCRs, accredited certificates)
 * where applicable. This list is for internal reference only.
 */
const ADEQUATE_COUNTRIES: readonly string[] = ["SA", "AE", "BH", "OM", "KW", "QA"];

const PDPL_CONFIG = {
  /** Standard DSAR deadline (30 days) */
  DSAR_DEADLINE_DAYS: 30,
  /** Extended deadline (60 days) */
  DSAR_EXTENDED_DEADLINE_DAYS: 60,
  /** Breach notification deadline (72 hours) */
  BREACH_NOTIFICATION_HOURS: 72,
  /** Consent validity (365 days if not specified) */
  DEFAULT_CONSENT_VALIDITY_DAYS: 365,
  /** Countries with adequate data protection */
  ADEQUATE_COUNTRIES,
} as const;

// =============================================================================
// CONSENT MANAGEMENT
// =============================================================================

export interface ConsentRequest {
  user_id: ObjectId;
  tenant_id: ObjectId;
  purpose: PdplConsentPurpose;
  legal_basis: PdplConsent["legal_basis"];
  policy_version: string;
  ip_address?: string;
  user_agent?: string;
  expires_in_days?: number;
}

/**
 * Create a new consent record
 */
export function createConsent(request: ConsentRequest): Omit<PdplConsent, "consent_id" | "created_at" | "updated_at"> {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + (request.expires_in_days ?? PDPL_CONFIG.DEFAULT_CONSENT_VALIDITY_DAYS));
  
  return {
    user_id: request.user_id,
    tenant_id: request.tenant_id,
    purpose: request.purpose,
    status: "granted",
    granted_at: now,
    expires_at: expiresAt,
    legal_basis: request.legal_basis,
    policy_version: request.policy_version,
    ip_address: request.ip_address,
    user_agent: request.user_agent,
  };
}

/**
 * Withdraw consent
 */
export function withdrawConsent(consent: PdplConsent): PdplConsent {
  return {
    ...consent,
    status: "withdrawn",
    withdrawn_at: new Date(),
    updated_at: new Date(),
  };
}

/**
 * Check if consent is valid
 */
export function isConsentValid(consent: PdplConsent): boolean {
  if (consent.status !== "granted") {
    return false;
  }
  
  if (consent.expires_at && consent.expires_at < new Date()) {
    return false;
  }
  
  return true;
}

/**
 * Get all required consents for a purpose
 */
export function getRequiredConsents(
  purposes: PdplConsentPurpose[]
): { purpose: PdplConsentPurpose; required: boolean; description: string }[] {
  const consentDescriptions: Record<PdplConsentPurpose, { required: boolean; description: string }> = {
    service_delivery: {
      required: true,
      description: "Required to provide our services to you",
    },
    marketing: {
      required: false,
      description: "To send you promotional communications and offers",
    },
    analytics: {
      required: false,
      description: "To analyze usage patterns and improve our services",
    },
    third_party_sharing: {
      required: false,
      description: "To share data with our trusted partners",
    },
    profiling: {
      required: false,
      description: "To personalize your experience based on behavior",
    },
    cross_border_transfer: {
      required: false,
      description: "To transfer data outside Saudi Arabia",
    },
  };
  
  return purposes.map(purpose => ({
    purpose,
    ...consentDescriptions[purpose],
  }));
}

// =============================================================================
// DSAR (DATA SUBJECT ACCESS REQUEST) MANAGEMENT
// =============================================================================

export interface DsarCreateRequest {
  user_id: ObjectId;
  tenant_id?: ObjectId;
  request_type: DsarRequestType;
  description: string;
}

/**
 * Create a new DSAR
 */
export function createDsar(request: DsarCreateRequest): Omit<DsarRequest, "request_id" | "created_at" | "updated_at"> {
  const now = new Date();
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + PDPL_CONFIG.DSAR_DEADLINE_DAYS);
  
  return {
    user_id: request.user_id,
    tenant_id: request.tenant_id,
    request_type: request.request_type,
    status: "received",
    description: request.description,
    identity_verified: false,
    notes: [`Request received on ${now.toISOString()}`],
    response_documents: [],
    deadline,
    extension_granted: false,
  };
}

/**
 * Update DSAR status
 */
export function updateDsarStatus(
  dsar: DsarRequest,
  newStatus: DsarStatus,
  note?: string,
  assignee?: ObjectId
): DsarRequest {
  const updates: Partial<DsarRequest> = {
    status: newStatus,
    updated_at: new Date(),
  };
  
  if (note) {
    updates.notes = [...dsar.notes, `[${new Date().toISOString()}] ${note}`];
  }
  
  if (assignee) {
    updates.assigned_to = assignee;
  }
  
  if (newStatus === "completed") {
    updates.completed_at = new Date();
  }
  
  return { ...dsar, ...updates };
}

/**
 * Grant deadline extension
 */
export function grantDsarExtension(dsar: DsarRequest, reason: string): DsarRequest {
  if (dsar.extension_granted) {
    throw new Error("Extension already granted for this DSAR");
  }
  
  const extendedDeadline = new Date(dsar.deadline);
  const extensionDays = PDPL_CONFIG.DSAR_EXTENDED_DEADLINE_DAYS - PDPL_CONFIG.DSAR_DEADLINE_DAYS;
  extendedDeadline.setDate(extendedDeadline.getDate() + extensionDays);
  
  return {
    ...dsar,
    extension_granted: true,
    extended_deadline: extendedDeadline,
    notes: [...dsar.notes, `[${new Date().toISOString()}] Extension granted: ${reason}`],
    updated_at: new Date(),
  };
}

/**
 * Check if DSAR is overdue
 */
export function isDsarOverdue(dsar: DsarRequest): boolean {
  if (dsar.status === "completed" || dsar.status === "closed" || dsar.status === "denied") {
    return false;
  }
  
  const effectiveDeadline = dsar.extended_deadline ?? dsar.deadline;
  return new Date() > effectiveDeadline;
}

/**
 * Get DSAR SLA status
 */
export function getDsarSlaStatus(dsar: DsarRequest): {
  status: "on_track" | "at_risk" | "overdue";
  days_remaining: number;
  deadline: Date;
} {
  const effectiveDeadline = dsar.extended_deadline ?? dsar.deadline;
  
  // Handle terminal statuses - completed/closed/denied DSARs are never overdue
  const terminalStatuses = ["completed", "closed", "denied"];
  if (terminalStatuses.includes(dsar.status)) {
    // Use actual completion timestamp if available, otherwise current time
    const dsarRecord = dsar as unknown as Record<string, unknown>;
    const completedAt = (dsarRecord.completed_at as Date | undefined) 
      ?? (dsarRecord.closed_at as Date | undefined) 
      ?? new Date();
    const msPerDay = 24 * 60 * 60 * 1000;
    const daysRemaining = Math.max(0, Math.ceil((effectiveDeadline.getTime() - completedAt.getTime()) / msPerDay));
    
    return {
      status: "on_track",
      days_remaining: daysRemaining,
      deadline: effectiveDeadline,
    };
  }
  
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.ceil((effectiveDeadline.getTime() - now.getTime()) / msPerDay);
  
  let status: "on_track" | "at_risk" | "overdue";
  if (daysRemaining < 0) {
    status = "overdue";
  } else if (daysRemaining <= 7) {
    status = "at_risk";
  } else {
    status = "on_track";
  }
  
  return {
    status,
    days_remaining: daysRemaining,
    deadline: effectiveDeadline,
  };
}

// =============================================================================
// RIGHT TO ERASURE
// =============================================================================

export interface ErasureResult {
  success: boolean;
  collections_processed: string[];
  records_anonymized: number;
  records_deleted: number;
  errors: string[];
  audit_log_id?: ObjectId;
}

/**
 * Anonymization constants for PDPL erasure
 * These values replace PII fields during erasure
 */
const ANONYMIZATION_VALUES = {
  email: "deleted@erased.local",
  name: "[ERASED]",
  firstName: "[ERASED]",
  lastName: "[ERASED]",
  phone: "+000000000000",
  address: "[ERASED]",
  nationalId: "[ERASED]",
  iban: "[ERASED]",
  ip: "0.0.0.0",
} as const;

/**
 * Execute erasure request (anonymization/deletion)
 * 
 * PDPL Compliance:
 * - Article 22: Right to erasure within 30 days
 * - ZATCA retention: Financial records retained 6 years (anonymized only)
 * - Audit trail: All erasure operations logged
 * 
 * Strategy:
 * - DELETE: Non-essential data (activities, preferences, consents)
 * - ANONYMIZE: Essential structure + financial data (keep for ZATCA)
 */
export async function executeErasure(
  userId: ObjectId,
  tenantId: ObjectId | undefined,
  db: unknown
): Promise<ErasureResult> {
  const result: ErasureResult = {
    success: false,
    collections_processed: [],
    records_anonymized: 0,
    records_deleted: 0,
    errors: [],
  };
  
  // Type guard for MongoDB database handle
  const dbHandle = db as { collection: (name: string) => {
    updateMany: (filter: object, update: object) => Promise<{ modifiedCount: number }>;
    deleteMany: (filter: object) => Promise<{ deletedCount: number }>;
  } } | null;
  
  if (!dbHandle || typeof dbHandle.collection !== "function") {
    result.errors.push("Invalid database handle provided");
    logger.error("PDPL erasure failed: Invalid database handle", { userId: userId.toString() });
    return result;
  }
  
  // Build tenant-scoped filter
  const baseFilter: Record<string, unknown> = { user_id: userId };
  if (tenantId) {
    baseFilter.tenant_id = tenantId;
  }
  
  // Alternative filters for collections with different field names
  const orgFilter: Record<string, unknown> = { userId };
  if (tenantId) {
    orgFilter.orgId = tenantId;
  }
  
  try {
    // =========================================================================
    // STEP 1: Delete non-essential collections (GDPR/PDPL right to erasure)
    // =========================================================================
    const collectionsToDelete = [
      { name: "activities", filter: baseFilter },
      { name: "preferences", filter: baseFilter },
      { name: "sessions", filter: { userId } }, // Auth sessions
    ];
    
    for (const { name, filter } of collectionsToDelete) {
      try {
        const deleteResult = await dbHandle.collection(name).deleteMany(filter);
        result.records_deleted += deleteResult.deletedCount;
        result.collections_processed.push(`${name}:deleted`);
        
        logger.info("PDPL erasure: Collection deleted", {
          collection: name,
          userId: userId.toString(),
          deletedCount: deleteResult.deletedCount,
        });
      } catch (collError) {
        // Collection may not exist - log but continue
        const msg = collError instanceof Error ? collError.message : String(collError);
        if (!msg.includes("ns not found") && !msg.includes("doesn't exist")) {
          result.errors.push(`${name}: ${msg}`);
        }
      }
    }
    
    // =========================================================================
    // STEP 2: Anonymize user profiles (retain structure, remove PII)
    // =========================================================================
    const collectionsToAnonymize = [
      {
        name: "users",
        filter: { _id: userId },
        update: {
          $set: {
            email: ANONYMIZATION_VALUES.email,
            firstName: ANONYMIZATION_VALUES.firstName,
            lastName: ANONYMIZATION_VALUES.lastName,
            phone: ANONYMIZATION_VALUES.phone,
            "profile.address": ANONYMIZATION_VALUES.address,
            "profile.nationalId": ANONYMIZATION_VALUES.nationalId,
            isDeleted: true,
            deletedAt: new Date(),
            deletionReason: "PDPL_ERASURE_REQUEST",
          },
        },
      },
      {
        name: "profiles",
        filter: baseFilter,
        update: {
          $set: {
            email: ANONYMIZATION_VALUES.email,
            name: ANONYMIZATION_VALUES.name,
            phone: ANONYMIZATION_VALUES.phone,
            address: ANONYMIZATION_VALUES.address,
            isDeleted: true,
            deletedAt: new Date(),
          },
        },
      },
      {
        name: "employees",
        filter: orgFilter,
        update: {
          $set: {
            firstName: ANONYMIZATION_VALUES.firstName,
            lastName: ANONYMIZATION_VALUES.lastName,
            email: ANONYMIZATION_VALUES.email,
            phone: ANONYMIZATION_VALUES.phone,
            "personal.firstName": ANONYMIZATION_VALUES.firstName,
            "personal.lastName": ANONYMIZATION_VALUES.lastName,
            "personal.email": ANONYMIZATION_VALUES.email,
            "personal.phone": ANONYMIZATION_VALUES.phone,
            "bankDetails.iban": ANONYMIZATION_VALUES.iban,
            "bankDetails.accountNumber": ANONYMIZATION_VALUES.iban,
            isDeleted: true,
            deletedAt: new Date(),
          },
        },
      },
    ];
    
    for (const { name, filter, update } of collectionsToAnonymize) {
      try {
        const updateResult = await dbHandle.collection(name).updateMany(filter, update);
        result.records_anonymized += updateResult.modifiedCount;
        result.collections_processed.push(`${name}:anonymized`);
        
        logger.info("PDPL erasure: Collection anonymized", {
          collection: name,
          userId: userId.toString(),
          modifiedCount: updateResult.modifiedCount,
        });
      } catch (collError) {
        const msg = collError instanceof Error ? collError.message : String(collError);
        if (!msg.includes("ns not found") && !msg.includes("doesn't exist")) {
          result.errors.push(`${name}: ${msg}`);
        }
      }
    }
    
    // =========================================================================
    // STEP 3: Anonymize consents (keep for audit trail, remove identifying info)
    // =========================================================================
    try {
      const consentResult = await dbHandle.collection(COLLECTIONS.CONSENTS).updateMany(
        baseFilter,
        {
          $set: {
            ip_address: ANONYMIZATION_VALUES.ip,
            user_agent: "[ERASED]",
            status: "withdrawn",
            withdrawn_at: new Date(),
            erasure_applied: true,
          },
        }
      );
      result.records_anonymized += consentResult.modifiedCount;
      result.collections_processed.push("consents:anonymized");
    } catch (consentError) {
      const msg = consentError instanceof Error ? consentError.message : String(consentError);
      if (!msg.includes("ns not found")) {
        result.errors.push(`consents: ${msg}`);
      }
    }
    
    // =========================================================================
    // STEP 4: Mark financial records (ZATCA 6-year retention - anonymize only)
    // =========================================================================
    try {
      const invoiceResult = await dbHandle.collection(COLLECTIONS.INVOICES).updateMany(
        { ...orgFilter, "customer.userId": userId },
        {
          $set: {
            "customer.name": ANONYMIZATION_VALUES.name,
            "customer.email": ANONYMIZATION_VALUES.email,
            "customer.phone": ANONYMIZATION_VALUES.phone,
            "customer.address": ANONYMIZATION_VALUES.address,
            pdplErasureApplied: true,
            pdplErasureDate: new Date(),
            // DO NOT delete - ZATCA requires 6-year retention
          },
        }
      );
      result.records_anonymized += invoiceResult.modifiedCount;
      if (invoiceResult.modifiedCount > 0) {
        result.collections_processed.push("invoices:pii_anonymized");
      }
    } catch (invoiceError) {
      const msg = invoiceError instanceof Error ? invoiceError.message : String(invoiceError);
      if (!msg.includes("ns not found")) {
        result.errors.push(`invoices: ${msg}`);
      }
    }
    
    // =========================================================================
    // FINALIZE
    // =========================================================================
    result.success = result.errors.length === 0;
    
    logger.info("PDPL erasure completed", {
      userId: userId.toString(),
      tenantId: tenantId?.toString(),
      success: result.success,
      collectionsProcessed: result.collections_processed,
      recordsAnonymized: result.records_anonymized,
      recordsDeleted: result.records_deleted,
      errors: result.errors,
    });
    
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(message);
    
    logger.error("PDPL erasure failed", {
      userId: userId.toString(),
      error: message,
    });
  }
  
  return result;
}

// =============================================================================
// CROSS-BORDER TRANSFER
// =============================================================================

export interface TransferAssessment {
  allowed: boolean;
  destination_country: string;
  has_adequacy: boolean;
  requires_consent: boolean;
  requires_contract: boolean;
  reasons: string[];
}

/**
 * Assess if cross-border transfer is allowed
 */
export function assessCrossBorderTransfer(
  destinationCountry: string,
  dataTypes: string[],
  hasExplicitConsent: boolean,
  hasContractualSafeguards: boolean
): TransferAssessment {
  const assessment: TransferAssessment = {
    allowed: false,
    destination_country: destinationCountry,
    has_adequacy: PDPL_CONFIG.ADEQUATE_COUNTRIES.includes(destinationCountry),
    requires_consent: true,
    requires_contract: true,
    reasons: [],
  };
  
  // Check for sensitive data FIRST - blocks auto-allowance even for adequate destinations
  const sensitiveTypes = ["health", "biometric", "genetic", "religion", "criminal"];
  const hasSensitiveData = dataTypes.some(t => sensitiveTypes.includes(t));
  
  if (hasSensitiveData) {
    assessment.reasons.push("Contains sensitive personal data - requires SDAIA approval for cross-border transfer");
    assessment.allowed = false;
    return assessment;
  }
  
  // Check if destination has adequacy (only if no sensitive data)
  if (assessment.has_adequacy) {
    assessment.allowed = true;
    assessment.reasons.push(`${destinationCountry} has adequate data protection recognized by SDAIA`);
    return assessment;
  }
  
  // Check if explicit consent exists
  if (!hasExplicitConsent) {
    assessment.reasons.push("Explicit consent for cross-border transfer not obtained");
  }
  
  // Check if contractual safeguards exist
  if (!hasContractualSafeguards) {
    assessment.reasons.push("Standard contractual clauses not in place");
  }
  
  // Allow if both consent and contract are in place
  if (hasExplicitConsent && hasContractualSafeguards) {
    assessment.allowed = true;
    assessment.reasons.push("Transfer allowed with explicit consent and contractual safeguards");
  }
  
  return assessment;
}

// =============================================================================
// BREACH NOTIFICATION
// =============================================================================

export interface BreachRecord {
  breach_id?: ObjectId;
  tenant_id: ObjectId;
  discovered_at: Date;
  breach_type: "confidentiality" | "integrity" | "availability";
  affected_data_types: string[];
  affected_records_count: number;
  affected_users_count: number;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  root_cause?: string;
  remediation_steps: string[];
  sdaia_notified: boolean;
  sdaia_notification_date?: Date;
  users_notified: boolean;
  users_notification_date?: Date;
  created_at?: Date;
  updated_at?: Date;
}

/**
 * Calculate breach notification deadline
 */
export function getBreachNotificationDeadline(discoveredAt: Date): Date {
  const deadline = new Date(discoveredAt);
  deadline.setHours(deadline.getHours() + PDPL_CONFIG.BREACH_NOTIFICATION_HOURS);
  return deadline;
}

/**
 * Check if breach notification is required
 */
export function isBreachNotificationRequired(breach: BreachRecord): boolean {
  // High and critical severity always require notification
  if (breach.severity === "high" || breach.severity === "critical") {
    return true;
  }
  
  // Large number of affected users requires notification
  if (breach.affected_users_count >= 1000) {
    return true;
  }
  
  // Certain data types always require notification
  const sensitiveTypes = ["national_id", "financial", "health", "biometric"];
  const hasSensitiveData = breach.affected_data_types.some(t => sensitiveTypes.includes(t));
  
  return hasSensitiveData;
}

/**
 * Get breach notification status
 */
export function getBreachNotificationStatus(breach: BreachRecord): {
  sdaia_status: "not_required" | "pending" | "overdue" | "completed";
  users_status: "not_required" | "pending" | "overdue" | "completed";
  deadline: Date;
} {
  const deadline = getBreachNotificationDeadline(breach.discovered_at);
  const now = new Date();
  const isRequired = isBreachNotificationRequired(breach);
  
  let sdaiaStatus: "not_required" | "pending" | "overdue" | "completed";
  let usersStatus: "not_required" | "pending" | "overdue" | "completed";
  
  if (!isRequired) {
    sdaiaStatus = "not_required";
    usersStatus = "not_required";
  } else if (breach.sdaia_notified) {
    sdaiaStatus = "completed";
  } else if (now > deadline) {
    sdaiaStatus = "overdue";
  } else {
    sdaiaStatus = "pending";
  }
  
  if (!isRequired) {
    usersStatus = "not_required";
  } else if (breach.users_notified) {
    usersStatus = "completed";
  } else if (now > deadline) {
    usersStatus = "overdue";
  } else {
    usersStatus = "pending";
  }
  
  return {
    sdaia_status: sdaiaStatus,
    users_status: usersStatus,
    deadline,
  };
}

// =============================================================================
// DASHBOARD SUMMARY
// =============================================================================

export interface PdplDashboardSummary {
  total_consents: number;
  active_consents: number;
  pending_dsars: number;
  overdue_dsars: number;
  completed_dsars_30d: number;
  avg_dsar_completion_days: number;
  breaches_30d: number;
  compliance_score: number;
}

/**
 * Calculate PDPL compliance score
 */
export function calculatePdplComplianceScore(
  consentRate: number,
  dsarCompletionRate: number,
  breachHandlingScore: number
): number {
  // Weighted average
  const weights = {
    consent: 0.3,
    dsar: 0.4,
    breach: 0.3,
  };
  
  return Math.round(
    consentRate * weights.consent +
    dsarCompletionRate * weights.dsar +
    breachHandlingScore * weights.breach
  );
}
