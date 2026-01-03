/**
 * @fileoverview Contract Lifecycle Management Service
 * @module services/compliance/contract-lifecycle
 * 
 * Comprehensive contract management:
 * - Contract creation and templates
 * - E-signature integration
 * - Version control
 * - Renewal automation
 * - Termination workflows
 * - Compliance tracking
 * - Document generation (AR/EN)
 * 
 * @status IMPLEMENTED [AGENT-0001]
 * @created 2025-12-29
 */

import { ObjectId, type WithId, type Document } from "mongodb";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";

// Helper for consistent error logging
function logError(action: string, error: unknown): void {
  logger.error(`Failed to ${action}`, {
    component: "contract-lifecycle",
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * Contract type
 */
export enum ContractType {
  // Real Estate
  LEASE_RESIDENTIAL = "lease_residential",
  LEASE_COMMERCIAL = "lease_commercial",
  LEASE_INDUSTRIAL = "lease_industrial",
  SALE_PROPERTY = "sale_property",
  
  // Services
  MAINTENANCE = "maintenance",
  FACILITY_MANAGEMENT = "facility_management",
  PROPERTY_MANAGEMENT = "property_management",
  SECURITY = "security",
  CLEANING = "cleaning",
  
  // Employment
  EMPLOYMENT_FULL_TIME = "employment_full_time",
  EMPLOYMENT_PART_TIME = "employment_part_time",
  EMPLOYMENT_CONTRACT = "employment_contract",
  
  // Vendor
  VENDOR_SERVICE = "vendor_service",
  VENDOR_SUPPLY = "vendor_supply",
  VENDOR_DISTRIBUTION = "vendor_distribution",
  
  // Other
  NDA = "nda",
  SLA = "sla",
  PARTNERSHIP = "partnership",
  CUSTOM = "custom",
}

/**
 * Contract status
 */
export enum ContractStatus {
  DRAFT = "draft",
  PENDING_REVIEW = "pending_review",
  PENDING_APPROVAL = "pending_approval",
  PENDING_SIGNATURES = "pending_signatures",
  PARTIALLY_SIGNED = "partially_signed",
  ACTIVE = "active",
  SUSPENDED = "suspended",
  PENDING_RENEWAL = "pending_renewal",
  RENEWED = "renewed",
  PENDING_TERMINATION = "pending_termination",
  TERMINATED = "terminated",
  EXPIRED = "expired",
  CANCELLED = "cancelled",
  ARCHIVED = "archived",
}

/**
 * Signature status
 */
export enum SignatureStatus {
  PENDING = "pending",
  SENT = "sent",
  VIEWED = "viewed",
  SIGNED = "signed",
  DECLINED = "declined",
  EXPIRED = "expired",
}

/**
 * Contract record
 */
export interface Contract {
  _id?: ObjectId;
  orgId: string;
  
  // Identification
  contractNumber: string;
  title: string;
  titleAr: string;
  type: ContractType;
  
  // Template reference
  templateId?: string;
  templateVersion?: number;
  
  // Parties
  parties: ContractParty[];
  
  // Terms
  terms: ContractTerms;
  
  // Financial (if applicable)
  financial?: ContractFinancial;
  
  // Document
  document: ContractDocument;
  
  // Signatures
  signatures: ContractSignature[];
  signatureConfig: SignatureConfig;
  
  // Workflow
  workflow: ContractWorkflow;
  
  // Versioning
  version: number;
  versionHistory: VersionEntry[];
  
  // Related entities
  relatedEntities: RelatedEntity[];
  
  // Compliance
  compliance: ContractCompliance;
  
  // Metadata
  tags: string[];
  notes: ContractNote[];
  attachments: ContractAttachment[];
  
  // Status
  status: ContractStatus;
  statusHistory: StatusEntry[];
  
  // Timestamps
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  effectiveDate?: Date;
  expiryDate?: Date;
  terminatedAt?: Date;
  archivedAt?: Date;
}

/**
 * Contract party
 */
export interface ContractParty {
  partyId: string;
  role: "primary" | "secondary" | "witness" | "guarantor";
  type: "individual" | "company";
  
  // Identification
  name: string;
  nameAr: string;
  email: string;
  phone?: string;
  
  // For individuals
  nationalId?: string;
  iqamaNumber?: string;
  
  // For companies
  commercialRegistration?: string;
  vatNumber?: string;
  authorizedSignatory?: string;
  authorizedSignatoryTitle?: string;
  
  // Address
  address?: string;
  addressAr?: string;
  
  // Signing
  signingOrder?: number;
  signatureRequired: boolean;
}

/**
 * Contract terms
 */
export interface ContractTerms {
  startDate: Date;
  endDate: Date;
  durationMonths: number;
  
  // Renewal
  autoRenew: boolean;
  renewalTermMonths?: number;
  renewalNoticeDays?: number;
  maxRenewals?: number;
  renewalCount: number;
  
  // Termination
  terminationNoticeDays: number;
  earlyTerminationPenalty?: number;
  earlyTerminationAllowed: boolean;
  
  // Specific terms
  specificTerms: SpecificTerm[];
  
  // Governing law
  governingLaw: string;
  governingLawAr: string;
  jurisdiction: string;
  jurisdictionAr: string;
  disputeResolution: "court" | "arbitration" | "mediation";
}

/**
 * Specific term
 */
export interface SpecificTerm {
  id: string;
  section: string;
  sectionAr: string;
  clause: string;
  clauseAr: string;
  mandatory: boolean;
}

/**
 * Contract financial
 */
export interface ContractFinancial {
  totalValue: number;
  currency: string;
  paymentSchedule: PaymentScheduleItem[];
  securityDeposit?: number;
  lateFeePercentage?: number;
  discountTerms?: string;
  invoicingFrequency?: "monthly" | "quarterly" | "annually" | "milestone";
}

/**
 * Payment schedule item
 */
export interface PaymentScheduleItem {
  id: string;
  description: string;
  descriptionAr: string;
  amount: number;
  dueDate: Date;
  status: "pending" | "invoiced" | "paid" | "overdue";
  invoiceId?: string;
  paidAt?: Date;
}

/**
 * Contract document
 */
export interface ContractDocument {
  format: "pdf" | "docx" | "html";
  language: "ar" | "en" | "bilingual";
  
  // Content
  contentUrl?: string;
  contentHash?: string;
  pageCount?: number;
  
  // Generated document
  generatedAt?: Date;
  generatedUrl?: string;
  
  // Signed document
  signedUrl?: string;
  signedAt?: Date;
}

/**
 * Contract signature
 */
export interface ContractSignature {
  partyId: string;
  signerName: string;
  signerEmail: string;
  
  status: SignatureStatus;
  
  // Signing
  sentAt?: Date;
  viewedAt?: Date;
  signedAt?: Date;
  declinedAt?: Date;
  declineReason?: string;
  
  // Signature details
  signatureMethod?: "draw" | "type" | "upload" | "digital_certificate";
  signatureImageUrl?: string;
  ipAddress?: string;
  deviceInfo?: string;
  
  // Legal
  legalConsent: boolean;
  consentTimestamp?: Date;
}

/**
 * Signature config
 */
export interface SignatureConfig {
  method: "sequential" | "parallel";
  requireAllSignatures: boolean;
  signatureExpiryDays: number;
  reminderFrequencyDays: number;
  allowDecline: boolean;
  requireLegalConsent: boolean;
  legalConsentText?: string;
  legalConsentTextAr?: string;
}

/**
 * Contract workflow
 */
export interface ContractWorkflow {
  currentStep: string;
  steps: WorkflowStep[];
  approvals: WorkflowApproval[];
}

/**
 * Workflow step
 */
export interface WorkflowStep {
  id: string;
  name: string;
  nameAr: string;
  type: "review" | "approval" | "signature" | "notification";
  assignee?: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  completedAt?: Date;
  completedBy?: string;
}

/**
 * Workflow approval
 */
export interface WorkflowApproval {
  approverId: string;
  approverName: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: Date;
  respondedAt?: Date;
  comments?: string;
}

/**
 * Version entry
 */
export interface VersionEntry {
  version: number;
  changes: string;
  changesAr: string;
  changedBy: string;
  changedAt: Date;
  documentUrl?: string;
}

/**
 * Related entity
 */
export interface RelatedEntity {
  entityType: "property" | "unit" | "tenant" | "vendor" | "employee" | "project" | "work_order" | "contract";
  entityId: string;
  relationship: string;
}

/**
 * Contract compliance
 */
export interface ContractCompliance {
  ejarRequired: boolean;
  ejarRegistered: boolean;
  ejarNumber?: string;
  
  zatcaRequired: boolean;
  zatcaCompliant: boolean;
  
  governmentApprovalRequired: boolean;
  governmentApproved: boolean;
  governmentApprovalNumber?: string;
  
  complianceChecks: ComplianceCheck[];
  nextReviewDate?: Date;
}

/**
 * Compliance check
 */
export interface ComplianceCheck {
  checkType: string;
  status: "pass" | "fail" | "warning" | "pending";
  checkedAt: Date;
  details?: string;
}

/**
 * Contract note
 */
export interface ContractNote {
  id: string;
  note: string;
  createdBy: string;
  createdAt: Date;
  visibility: "internal" | "all_parties";
}

/**
 * Contract attachment
 */
export interface ContractAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: Date;
}

/**
 * Status entry
 */
export interface StatusEntry {
  status: ContractStatus;
  changedAt: Date;
  changedBy: string;
  reason?: string;
}

/**
 * Contract template
 */
export interface ContractTemplate {
  _id?: ObjectId;
  orgId: string;
  
  name: string;
  nameAr: string;
  description?: string;
  descriptionAr?: string;
  
  type: ContractType;
  category: string;
  
  // Template content
  contentHtml: string;
  contentHtmlAr?: string;
  
  // Variables
  variables: TemplateVariable[];
  
  // Default terms
  defaultTerms?: Partial<ContractTerms>;
  defaultFinancial?: Partial<ContractFinancial>;
  
  // Workflow
  defaultWorkflow?: WorkflowStep[];
  
  // Version
  version: number;
  publishedVersion?: number;
  
  // Status
  status: "draft" | "published" | "archived";
  
  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  publishedAt?: Date;
}

/**
 * Template variable
 */
export interface TemplateVariable {
  key: string;
  label: string;
  labelAr: string;
  type: "text" | "number" | "date" | "currency" | "select" | "party";
  required: boolean;
  defaultValue?: string;
  options?: { value: string; label: string; labelAr: string }[];
}

/**
 * Create contract request
 */
export interface CreateContractRequest {
  orgId: string;
  type: ContractType;
  title: string;
  titleAr: string;
  templateId?: string;
  parties: ContractParty[];
  terms: ContractTerms;
  financial?: ContractFinancial;
  relatedEntities?: RelatedEntity[];
  signatureConfig?: Partial<SignatureConfig>;
  createdBy: string;
}

// ============================================================================
// Constants
// ============================================================================

const CONTRACTS_COLLECTION = "contracts";
const TEMPLATES_COLLECTION = "contract_templates";

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Create a new contract
 */
export async function createContract(
  request: CreateContractRequest
): Promise<{ success: boolean; contractId?: string; contractNumber?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Generate contract number
    const contractNumber = await generateContractNumber(request.orgId, request.type);
    
    // Get template if specified
    let template: ContractTemplate | null = null;
    if (request.templateId) {
      template = await getTemplate(request.orgId, request.templateId);
      if (!template) {
        return { success: false, error: `Template not found: ${request.templateId}` };
      }
    }
    
    // Create contract
    const contract: Omit<Contract, "_id"> = {
      orgId: request.orgId,
      contractNumber,
      title: request.title,
      titleAr: request.titleAr,
      type: request.type,
      templateId: request.templateId,
      templateVersion: template?.version,
      parties: request.parties,
      terms: request.terms,
      financial: request.financial,
      document: {
        format: "pdf",
        language: "bilingual",
      },
      signatures: request.parties
        .filter(p => p.signatureRequired)
        .map(p => ({
          partyId: p.partyId,
          signerName: p.name,
          signerEmail: p.email,
          status: SignatureStatus.PENDING,
          legalConsent: false,
        })),
      signatureConfig: {
        method: request.signatureConfig?.method || "sequential",
        requireAllSignatures: request.signatureConfig?.requireAllSignatures ?? true,
        signatureExpiryDays: request.signatureConfig?.signatureExpiryDays || 14,
        reminderFrequencyDays: request.signatureConfig?.reminderFrequencyDays || 3,
        allowDecline: request.signatureConfig?.allowDecline ?? true,
        requireLegalConsent: true,
        legalConsentText: "I agree to sign this contract electronically.",
        legalConsentTextAr: "أوافق على توقيع هذا العقد إلكترونياً.",
      },
      workflow: {
        currentStep: "draft",
        steps: createDefaultWorkflow(request.type),
        approvals: [],
      },
      version: 1,
      versionHistory: [{
        version: 1,
        changes: "Initial creation",
        changesAr: "الإنشاء الأولي",
        changedBy: request.createdBy,
        changedAt: new Date(),
      }],
      relatedEntities: request.relatedEntities || [],
      compliance: determineComplianceRequirements(request.type, request.terms),
      tags: [],
      notes: [],
      attachments: [],
      status: ContractStatus.DRAFT,
      statusHistory: [{
        status: ContractStatus.DRAFT,
        changedAt: new Date(),
        changedBy: request.createdBy,
        reason: "Contract created",
      }],
      createdAt: new Date(),
      createdBy: request.createdBy,
      updatedAt: new Date(),
      updatedBy: request.createdBy,
      effectiveDate: request.terms.startDate,
      expiryDate: request.terms.endDate,
    };
    
    const result = await db.collection(CONTRACTS_COLLECTION).insertOne(contract);
    
    logger.info("Contract created", {
      component: "contract-lifecycle",
      action: "createContract",
    });
    
    return {
      success: true,
      contractId: result.insertedId.toString(),
      contractNumber,
    };
  } catch (error) {
    logError("create contract", error);
    return { success: false, error: "Failed to create contract" };
  }
}

/**
 * Update contract
 */
export async function updateContract(
  orgId: string,
  contractId: string,
  updates: Partial<Pick<Contract, "title" | "titleAr" | "parties" | "terms" | "financial">>,
  updatedBy: string,
  changeDescription: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const contract = await getContract(orgId, contractId);
    if (!contract) {
      return { success: false, error: "Contract not found" };
    }
    
    if (contract.status !== ContractStatus.DRAFT && contract.status !== ContractStatus.PENDING_REVIEW) {
      return { success: false, error: "Cannot edit contract in current status" };
    }
    
    const currentVersion = contract.version;
    const newVersion = currentVersion + 1;
    
    const versionEntry: VersionEntry = {
      version: newVersion,
      changes: changeDescription,
      changesAr: changeDescription, // Would be translated
      changedBy: updatedBy,
      changedAt: new Date(),
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateOp: any = {
      $set: {
        ...updates,
        version: newVersion,
        updatedAt: new Date(),
        updatedBy,
      },
      $push: { versionHistory: versionEntry },
    };
    
    // Optimistic locking: ensure version hasn't changed since read
    const result = await db.collection(CONTRACTS_COLLECTION).updateOne(
      { _id: new ObjectId(contractId), orgId, version: currentVersion },
      updateOp
    );
    
    if (result.matchedCount === 0) {
      return { success: false, error: "Contract was modified by another user. Please refresh and try again." };
    }
    
    logger.info("Contract updated", {
      component: "contract-lifecycle",
      action: "updateContract",
    });
    
    return { success: true };
  } catch (error) {
    logError("update contract", error);
    return { success: false, error: "Failed to update contract" };
  }
}

/**
 * Submit contract for review
 */
export async function submitForReview(
  orgId: string,
  contractId: string,
  submittedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const contract = await getContract(orgId, contractId);
    if (!contract) {
      return { success: false, error: "Contract not found" };
    }
    
    if (contract.status !== ContractStatus.DRAFT) {
      return { success: false, error: "Contract not in draft status" };
    }
    
    // Validate contract completeness
    const validation = validateContractCompleteness(contract);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    await updateContractStatus(orgId, contractId, ContractStatus.PENDING_REVIEW, submittedBy, "Submitted for review");
    await updateWorkflowStep(orgId, contractId, "review", submittedBy);
    
    return { success: true };
  } catch (error) {
    logError("submit for review", error);
    return { success: false, error: "Failed to submit for review" };
  }
}

/**
 * Request approval
 */
export async function requestApproval(
  orgId: string,
  contractId: string,
  approverId: string,
  approverName: string,
  requestedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const contract = await getContract(orgId, contractId);
    if (!contract) {
      return { success: false, error: "Contract not found" };
    }
    
    // Validate contract is in the correct status for approval request
    if (contract.status !== ContractStatus.PENDING_REVIEW) {
      return { success: false, error: "Contract not in review state" };
    }
    
    const approval: WorkflowApproval = {
      approverId,
      approverName,
      status: "pending",
      requestedAt: new Date(),
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateOp: any = {
      $set: { updatedAt: new Date() },
      $push: { "workflow.approvals": approval },
    };
    
    await db.collection(CONTRACTS_COLLECTION).updateOne(
      { _id: new ObjectId(contractId), orgId },
      updateOp
    );
    
    await updateContractStatus(orgId, contractId, ContractStatus.PENDING_APPROVAL, requestedBy, `Approval requested from ${approverName}`);
    
    // In production, would send notification to approver
    
    return { success: true };
  } catch (error) {
    logError("request approval", error);
    return { success: false, error: "Failed to request approval" };
  }
}

/**
 * Approve or reject contract
 */
export async function respondToApproval(
  orgId: string,
  contractId: string,
  approverId: string,
  approved: boolean,
  comments?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Use atomic update with array filters to avoid stale data race condition
    // This prevents the issue where approval array could change between read and write
    const newStatus = approved ? "approved" : "rejected";
    const result = await db.collection(CONTRACTS_COLLECTION).updateOne(
      { 
        _id: new ObjectId(contractId), 
        orgId,
        "workflow.approvals": {
          $elemMatch: { approverId, status: "pending" }
        }
      },
      {
        $set: {
          "workflow.approvals.$[approval].status": newStatus,
          "workflow.approvals.$[approval].respondedAt": new Date(),
          "workflow.approvals.$[approval].comments": comments,
          updatedAt: new Date(),
        },
      },
      {
        arrayFilters: [{ "approval.approverId": approverId, "approval.status": "pending" }]
      }
    );
    
    if (result.matchedCount === 0) {
      // Either contract not found or no pending approval
      const contract = await getContract(orgId, contractId);
      if (!contract) {
        return { success: false, error: "Contract not found" };
      }
      return { success: false, error: "No pending approval found for this approver" };
    }
    
    // Fetch fresh contract state for subsequent status updates
    const contract = await getContract(orgId, contractId);
    if (!contract) {
      return { success: false, error: "Contract not found after update" };
    }
    
    if (approved) {
      // Check if all approvals are complete using fresh data
      const allApproved = contract.workflow.approvals.every(
        a => a.status === "approved"
      );
      
      if (allApproved) {
        await updateContractStatus(orgId, contractId, ContractStatus.PENDING_SIGNATURES, approverId, "All approvals received");
        await updateWorkflowStep(orgId, contractId, "signature", approverId);
      }
    } else {
      await updateContractStatus(orgId, contractId, ContractStatus.DRAFT, approverId, `Rejected: ${comments}`);
    }
    
    return { success: true };
  } catch (error) {
    logError("respond to approval", error);
    return { success: false, error: "Failed to respond to approval" };
  }
}

/**
 * Send for signatures
 */
export async function sendForSignatures(
  orgId: string,
  contractId: string,
  _sentBy: string // Reserved for future audit tracking of who initiated signatures
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const contract = await getContract(orgId, contractId);
    if (!contract) {
      return { success: false, error: "Contract not found" };
    }
    
    // Validate contract status before sending signatures
    const allowedStatuses = [
      ContractStatus.PENDING_APPROVAL,
      ContractStatus.DRAFT,
      ContractStatus.PENDING_SIGNATURES,
    ];
    if (!allowedStatuses.includes(contract.status)) {
      logger.warn("Invalid contract status for sending signatures", {
        component: "contract-lifecycle",
        action: "sendForSignatures",
        contractId,
        currentStatus: contract.status,
      });
      return { success: false, error: "Invalid contract status for sending signatures" };
    }
    
    // Generate document if not already generated
    if (!contract.document.generatedUrl) {
      await generateContractDocument(orgId, contractId);
    }
    
    // Update signature statuses
    const updatedSignatures = contract.signatures.map((sig, index) => {
      const shouldSend = contract.signatureConfig.method === "parallel" || index === 0;
      if (!shouldSend || sig.status !== SignatureStatus.PENDING) {
        return sig;
      }
      return { ...sig, status: SignatureStatus.SENT, sentAt: new Date() };
    });
    
    await db.collection(CONTRACTS_COLLECTION).updateOne(
      { _id: new ObjectId(contractId), orgId },
      {
        $set: {
          signatures: updatedSignatures,
          status: ContractStatus.PENDING_SIGNATURES,
          updatedAt: new Date(),
        },
      }
    );
    
    // In production, would send signature request emails
    
    logger.info("Signatures requested", {
      component: "contract-lifecycle",
      action: "sendForSignatures",
    });
    
    return { success: true };
  } catch (error) {
    logError("send for signatures", error);
    return { success: false, error: "Failed to send for signatures" };
  }
}

/**
 * Record signature
 */
export async function recordSignature(
  orgId: string,
  contractId: string,
  partyId: string,
  signatureData: {
    method: "draw" | "type" | "upload" | "digital_certificate";
    signatureImageUrl?: string;
    ipAddress?: string;
    deviceInfo?: string;
  }
): Promise<{ success: boolean; allSigned?: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const contract = await getContract(orgId, contractId);
    if (!contract) {
      return { success: false, error: "Contract not found" };
    }
    
    const sigIndex = contract.signatures.findIndex(s => s.partyId === partyId);
    if (sigIndex === -1) {
      return { success: false, error: "Party not found in signatures" };
    }
    
    const signature = contract.signatures[sigIndex];
    if (signature.status === SignatureStatus.SIGNED) {
      return { success: false, error: "Already signed" };
    }
    
    // Update signature using arrayFilters for safe concurrent updates
    // This targets the specific signature element by partyId rather than index
    const updates = {
      "signatures.$[sig].status": SignatureStatus.SIGNED,
      "signatures.$[sig].signedAt": new Date(),
      "signatures.$[sig].signatureMethod": signatureData.method,
      "signatures.$[sig].signatureImageUrl": signatureData.signatureImageUrl,
      "signatures.$[sig].ipAddress": signatureData.ipAddress,
      "signatures.$[sig].deviceInfo": signatureData.deviceInfo,
      "signatures.$[sig].legalConsent": true,
      "signatures.$[sig].consentTimestamp": new Date(),
      updatedAt: new Date(),
    };
    
    await db.collection(CONTRACTS_COLLECTION).updateOne(
      { _id: new ObjectId(contractId), orgId },
      { $set: updates },
      { arrayFilters: [{ "sig.partyId": partyId }] }
    );
    
    // Check if all signatures complete
    const updatedContract = await getContract(orgId, contractId);
    const allSigned = updatedContract?.signatures.every(s => s.status === SignatureStatus.SIGNED);
    
    if (allSigned) {
      await activateContract(orgId, contractId, "system");
    } else if (contract.signatureConfig.method === "sequential") {
      // Send to next signer
      await sendToNextSigner(orgId, contractId, sigIndex);
    } else {
      await updateContractStatus(orgId, contractId, ContractStatus.PARTIALLY_SIGNED, partyId, "Partial signature");
    }
    
    logger.info("Signature recorded", {
      component: "contract-lifecycle",
      action: "recordSignature",
    });
    
    return { success: true, allSigned };
  } catch (error) {
    logError("record signature", error);
    return { success: false, error: "Failed to record signature" };
  }
}

/**
 * Activate contract
 */
export async function activateContract(
  orgId: string,
  contractId: string,
  activatedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    // Validate pre-activation status atomically - only PENDING_SIGNATURES can be activated
    const result = await db.collection(CONTRACTS_COLLECTION).updateOne(
      { 
        _id: new ObjectId(contractId), 
        orgId,
        status: ContractStatus.PENDING_SIGNATURES 
      },
      {
        $set: {
          status: ContractStatus.ACTIVE,
          activatedAt: new Date(), // Track when activated, preserve original effectiveDate
          updatedAt: new Date(),
          "document.signedAt": new Date(),
        },
      }
    );
    
    if (result.matchedCount === 0) {
      const contract = await getContract(orgId, contractId);
      if (!contract) {
        return { success: false, error: "Contract not found" };
      }
      return { success: false, error: `Cannot activate contract in ${contract.status} status. Must be ${ContractStatus.PENDING_SIGNATURES}` };
    }
    
    await updateWorkflowStep(orgId, contractId, "complete", activatedBy);
    
    // In production, would generate final signed PDF
    
    logger.info("Contract activated", {
      component: "contract-lifecycle",
      action: "activateContract",
    });
    
    return { success: true };
  } catch (error) {
    logError("activate contract", error);
    return { success: false, error: "Failed to activate contract" };
  }
}

/**
 * Initiate renewal
 */
export async function initiateRenewal(
  orgId: string,
  contractId: string,
  newTerms: {
    endDate: Date;
    financialChanges?: Partial<ContractFinancial>;
  },
  initiatedBy: string
): Promise<{ success: boolean; renewalContractId?: string; error?: string }> {
  try {
    const contract = await getContract(orgId, contractId);
    if (!contract) {
      return { success: false, error: "Contract not found" };
    }
    
    if (contract.status !== ContractStatus.ACTIVE) {
      return { success: false, error: "Only active contracts can be renewed" };
    }
    
    // Check renewal limits
    if (contract.terms.maxRenewals && contract.terms.renewalCount >= contract.terms.maxRenewals) {
      return { success: false, error: "Maximum renewals reached" };
    }
    
    // Create renewal contract
    const renewalRequest: CreateContractRequest = {
      orgId,
      type: contract.type,
      title: `${contract.title} - Renewal`,
      titleAr: `${contract.titleAr} - تجديد`,
      templateId: contract.templateId,
      parties: contract.parties,
      terms: {
        ...contract.terms,
        startDate: contract.terms.endDate,
        endDate: newTerms.endDate,
        // Calculate calendar month difference using year/month components
        durationMonths: (
          (newTerms.endDate.getFullYear() - contract.terms.endDate.getFullYear()) * 12 +
          (newTerms.endDate.getMonth() - contract.terms.endDate.getMonth())
        ),
        renewalCount: contract.terms.renewalCount + 1,
      },
      financial: contract.financial
        ? (newTerms.financialChanges
          ? { ...contract.financial, ...newTerms.financialChanges } as ContractFinancial
          : contract.financial)
        : undefined,
      relatedEntities: [
        ...contract.relatedEntities,
        { entityType: "contract", entityId: contractId, relationship: "renewed_from" },
      ],
      createdBy: initiatedBy,
    };
    
    const result = await createContract(renewalRequest);
    
    if (result.success) {
      // Update original contract
      await updateContractStatus(orgId, contractId, ContractStatus.PENDING_RENEWAL, initiatedBy, "Renewal initiated");
    }
    
    return {
      success: result.success,
      renewalContractId: result.contractId,
      error: result.error,
    };
  } catch (error) {
    logError("initiate renewal", error);
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
  terminatedBy: string,
  effectiveDate?: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = await getDatabase();
    
    const contract = await getContract(orgId, contractId);
    if (!contract) {
      return { success: false, error: "Contract not found" };
    }
    
    if (contract.status !== ContractStatus.ACTIVE) {
      return { success: false, error: "Only active contracts can be terminated" };
    }
    
    const terminationDate = effectiveDate || new Date();
    
    // Check early termination
    if (terminationDate < contract.terms.endDate && !contract.terms.earlyTerminationAllowed) {
      return { success: false, error: "Early termination not allowed" };
    }
    
    // Atomic update: set termination fields and status in single operation
    // Include expected status in filter to prevent race condition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateOp: any = {
      $set: {
        status: ContractStatus.TERMINATED,
        terminatedAt: terminationDate,
        updatedAt: new Date(),
        updatedBy: terminatedBy,
      },
      $push: {
        statusHistory: {
          status: ContractStatus.TERMINATED,
          changedAt: new Date(),
          changedBy: terminatedBy,
          reason,
        },
      },
    };
    
    const result = await db.collection(CONTRACTS_COLLECTION).updateOne(
      { _id: new ObjectId(contractId), orgId, status: ContractStatus.ACTIVE },
      updateOp
    );
    
    // Check if update succeeded (status may have changed concurrently)
    if (result.matchedCount === 0) {
      return { success: false, error: "Contract status changed concurrently - termination aborted" };
    }
    
    logger.info("Contract terminated", {
      component: "contract-lifecycle",
      action: "terminateContract",
    });
    
    return { success: true };
  } catch (error) {
    logError("terminate contract", error);
    return { success: false, error: "Failed to terminate contract" };
  }
}

// ============================================================================
// Template Functions
// ============================================================================

/**
 * Create template
 */
export async function createTemplate(
  template: Omit<ContractTemplate, "_id" | "createdAt" | "updatedAt" | "version" | "status">
): Promise<{ success: boolean; templateId?: string; error?: string }> {
  try {
    const db = await getDatabase();
    
    const fullTemplate: Omit<ContractTemplate, "_id"> = {
      ...template,
      version: 1,
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await db.collection(TEMPLATES_COLLECTION).insertOne(fullTemplate);
    
    return { success: true, templateId: result.insertedId.toString() };
  } catch (error) {
    logError("create template", error);
    return { success: false, error: "Failed to create template" };
  }
}

/**
 * Get template
 */
export async function getTemplate(
  orgId: string,
  templateId: string
): Promise<ContractTemplate | null> {
  try {
    const db = await getDatabase();
    
    const template = await db.collection(TEMPLATES_COLLECTION).findOne({
      _id: new ObjectId(templateId),
      orgId,
    }) as WithId<Document> | null;
    
    return template as unknown as ContractTemplate | null;
  } catch (error) {
    logError("get template", error);
    return null;
  }
}

/**
 * List templates
 */
export async function listTemplates(
  orgId: string,
  filters?: {
    type?: ContractType;
    status?: string;
  }
): Promise<ContractTemplate[]> {
  try {
    const db = await getDatabase();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { orgId };
    
    if (filters?.type) {
      query.type = filters.type;
    }
    if (filters?.status) {
      query.status = filters.status;
    }
    
    const templates = await db.collection(TEMPLATES_COLLECTION)
      .find(query)
      .sort({ updatedAt: -1 })
      .toArray();
    
    return templates as unknown as ContractTemplate[];
  } catch (error) {
    logError("list templates", error);
    return [];
  }
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Get contract
 */
export async function getContract(
  orgId: string,
  contractId: string
): Promise<Contract | null> {
  try {
    const db = await getDatabase();
    
    const contract = await db.collection(CONTRACTS_COLLECTION).findOne({
      _id: new ObjectId(contractId),
      orgId,
    }) as WithId<Document> | null;
    
    return contract as unknown as Contract | null;
  } catch (error) {
    logError("get contract", error);
    return null;
  }
}

/**
 * List contracts
 */
export async function listContracts(
  orgId: string,
  filters?: {
    status?: ContractStatus[];
    type?: ContractType[];
    partyId?: string;
    expiringBefore?: Date;
    search?: string;
  },
  options?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 1 | -1 }
): Promise<{ contracts: Contract[]; total: number }> {
  try {
    const db = await getDatabase();
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: any = { orgId };
    
    if (filters?.status?.length) {
      query.status = { $in: filters.status };
    }
    if (filters?.type?.length) {
      query.type = { $in: filters.type };
    }
    if (filters?.partyId) {
      query["parties.partyId"] = filters.partyId;
    }
    if (filters?.expiringBefore) {
      query.expiryDate = { $lte: filters.expiringBefore };
      // Only set status to ACTIVE if no status filter was provided
      if (!filters?.status?.length) {
        query.status = ContractStatus.ACTIVE;
      }
    }
    if (filters?.search) {
      // Escape regex special characters to prevent injection/ReDoS
      const escapedSearch = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { title: { $regex: escapedSearch, $options: "i" } },
        { titleAr: { $regex: escapedSearch, $options: "i" } },
        { contractNumber: { $regex: escapedSearch, $options: "i" } },
      ];
    }
    
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;
    const sort = { [options?.sortBy || "createdAt"]: options?.sortOrder || -1 };
    
    const [contracts, total] = await Promise.all([
      db.collection(CONTRACTS_COLLECTION)
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(CONTRACTS_COLLECTION).countDocuments(query),
    ]);
    
    return {
      contracts: contracts as unknown as Contract[],
      total,
    };
  } catch (error) {
    logError("list contracts", error);
    return { contracts: [], total: 0 };
  }
}

/**
 * Get contract statistics
 */
export async function getContractStats(
  orgId: string
): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  expiringSoon: number;
  totalValue: number;
}> {
  try {
    const db = await getDatabase();
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const pipeline = [
      { $match: { orgId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalValue: { $sum: { $ifNull: ["$financial.totalValue", 0] } },
          expiringSoon: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$status", ContractStatus.ACTIVE] },
                    { $lte: ["$expiryDate", thirtyDaysFromNow] },
                    { $gt: ["$expiryDate", new Date()] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ];
    
    const statusPipeline = [
      { $match: { orgId } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ];
    
    const typePipeline = [
      { $match: { orgId } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ];
    
    const [summaryResults, statusResults, typeResults] = await Promise.all([
      db.collection(CONTRACTS_COLLECTION).aggregate(pipeline).toArray(),
      db.collection(CONTRACTS_COLLECTION).aggregate(statusPipeline).toArray(),
      db.collection(CONTRACTS_COLLECTION).aggregate(typePipeline).toArray(),
    ]);
    
    const summary = summaryResults[0] || {};
    
    const byStatus: Record<string, number> = {};
    statusResults.forEach(r => {
      byStatus[r._id] = r.count;
    });
    
    const byType: Record<string, number> = {};
    typeResults.forEach(r => {
      byType[r._id] = r.count;
    });
    
    return {
      total: summary.total || 0,
      byStatus,
      byType,
      expiringSoon: summary.expiringSoon || 0,
      totalValue: summary.totalValue || 0,
    };
  } catch (error) {
    logError("get contract stats", error);
    return {
      total: 0,
      byStatus: {},
      byType: {},
      expiringSoon: 0,
      totalValue: 0,
    };
  }
}

/**
 * Get expiring contracts
 */
export async function getExpiringContracts(
  orgId: string,
  daysAhead: number = 30
): Promise<Contract[]> {
  try {
    const db = await getDatabase();
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    const contracts = await db.collection(CONTRACTS_COLLECTION)
      .find({
        orgId,
        status: ContractStatus.ACTIVE,
        expiryDate: { $lte: futureDate, $gt: new Date() },
      })
      .sort({ expiryDate: 1 })
      .toArray();
    
    return contracts as unknown as Contract[];
  } catch (error) {
    logError("get expiring contracts", error);
    return [];
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function generateContractNumber(orgId: string, type: ContractType): Promise<string> {
  const db = await getDatabase();
  
  const year = new Date().getFullYear();
  const prefix = type.substring(0, 3).toUpperCase();
  const counterKey = `contract-${orgId}-${prefix}-${year}`;
  
  // Atomic counter using counters collection - use string _id directly
  const result = await db.collection<{ _id: string; seq: number }>("counters").findOneAndUpdate(
    { _id: counterKey },
    { $inc: { seq: 1 }, $setOnInsert: { _id: counterKey } },
    { upsert: true, returnDocument: "after" }
  );
  
  // Read sequence from result directly (MongoDB driver v6+ returns document directly)
  const sequence = result?.seq ?? 1;
  return `${prefix}-${year}-${String(sequence).padStart(5, "0")}`;
}

function createDefaultWorkflow(type: ContractType): WorkflowStep[] {
  const baseSteps: WorkflowStep[] = [
    {
      id: "draft",
      name: "Draft",
      nameAr: "مسودة",
      type: "review",
      status: "completed",
      completedAt: new Date(),
    },
    {
      id: "review",
      name: "Internal Review",
      nameAr: "المراجعة الداخلية",
      type: "review",
      status: "pending",
    },
    {
      id: "approval",
      name: "Management Approval",
      nameAr: "موافقة الإدارة",
      type: "approval",
      status: "pending",
    },
    {
      id: "signature",
      name: "Signatures",
      nameAr: "التوقيعات",
      type: "signature",
      status: "pending",
    },
    {
      id: "complete",
      name: "Active",
      nameAr: "نشط",
      type: "notification",
      status: "pending",
    },
  ];
  
  // Add legal review for certain contract types
  if ([ContractType.SALE_PROPERTY, ContractType.PARTNERSHIP].includes(type)) {
    baseSteps.splice(2, 0, {
      id: "legal_review",
      name: "Legal Review",
      nameAr: "المراجعة القانونية",
      type: "approval",
      status: "pending",
    });
  }
  
  return baseSteps;
}

function determineComplianceRequirements(
  type: ContractType,
  _terms: ContractTerms // Reserved for future compliance logic based on contract terms
): ContractCompliance {
  return {
    ejarRequired: [
      ContractType.LEASE_RESIDENTIAL,
      ContractType.LEASE_COMMERCIAL,
      ContractType.LEASE_INDUSTRIAL,
    ].includes(type),
    ejarRegistered: false,
    zatcaRequired: true,
    zatcaCompliant: false,
    governmentApprovalRequired: [
      ContractType.SALE_PROPERTY,
      ContractType.EMPLOYMENT_FULL_TIME,
    ].includes(type),
    governmentApproved: false,
    complianceChecks: [],
  };
}

function validateContractCompleteness(
  contract: Contract
): { valid: boolean; error?: string } {
  if (!contract.parties.length) {
    return { valid: false, error: "At least one party is required" };
  }
  
  if (!contract.terms.startDate || !contract.terms.endDate) {
    return { valid: false, error: "Contract dates are required" };
  }
  
  const signaturesRequired = contract.parties.filter(p => p.signatureRequired).length;
  if (signaturesRequired === 0) {
    return { valid: false, error: "At least one signature is required" };
  }
  
  return { valid: true };
}

async function updateContractStatus(
  orgId: string,
  contractId: string,
  status: ContractStatus,
  changedBy: string,
  reason?: string
): Promise<void> {
  try {
    const db = await getDatabase();
    
    const statusEntry: StatusEntry = {
      status,
      changedAt: new Date(),
      changedBy,
      reason,
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateOp: any = {
      $set: { status, updatedAt: new Date() },
      $push: { statusHistory: statusEntry },
    };
    
    await db.collection(CONTRACTS_COLLECTION).updateOne(
      { _id: new ObjectId(contractId), orgId },
      updateOp
    );
  } catch (error) {
    logError("update contract status", error);
  }
}

async function updateWorkflowStep(
  orgId: string,
  contractId: string,
  stepId: string,
  completedBy: string
): Promise<void> {
  try {
    const db = await getDatabase();
    
    const contract = await getContract(orgId, contractId);
    if (!contract) return;
    
    // Validate stepId exists in workflow
    const stepExists = contract.workflow.steps.some(step => step.id === stepId);
    if (!stepExists) {
      logger.warn("Invalid workflow stepId", {
        component: "contract-lifecycle",
        action: "updateWorkflowStep",
        contractId,
        stepId,
        validSteps: contract.workflow.steps.map(s => s.id),
      });
      return;
    }
    
    const updatedSteps = contract.workflow.steps.map(step => {
      if (step.id === stepId) {
        return { ...step, status: "in_progress" as const };
      }
      if (step.id === contract.workflow.currentStep) {
        return { ...step, status: "completed" as const, completedAt: new Date(), completedBy };
      }
      return step;
    });
    
    // Use atomic update with currentStep check to prevent race conditions
    const result = await db.collection(CONTRACTS_COLLECTION).updateOne(
      { 
        _id: new ObjectId(contractId), 
        orgId,
        "workflow.currentStep": contract.workflow.currentStep // Ensure step hasn't changed
      },
      {
        $set: {
          "workflow.currentStep": stepId,
          "workflow.steps": updatedSteps,
          updatedAt: new Date(),
        },
      }
    );
    
    if (result.matchedCount === 0) {
      logger.warn("Workflow step update failed - concurrent modification", {
        component: "contract-lifecycle",
        action: "updateWorkflowStep",
        contractId,
        stepId,
      });
    }
  } catch (error) {
    logError("update workflow step", error);
  }
}

async function generateContractDocument(
  orgId: string,
  contractId: string
): Promise<void> {
  try {
    const db = await getDatabase();
    
    // In production, would generate actual PDF document
    const documentUrl = `/documents/contracts/${contractId}.pdf`;
    
    await db.collection(CONTRACTS_COLLECTION).updateOne(
      { _id: new ObjectId(contractId), orgId },
      {
        $set: {
          "document.generatedAt": new Date(),
          "document.generatedUrl": documentUrl,
          updatedAt: new Date(),
        },
      }
    );
  } catch (error) {
    logError("generate contract document", error);
  }
}

async function sendToNextSigner(
  orgId: string,
  contractId: string,
  currentSignerIndex: number
): Promise<void> {
  try {
    const db = await getDatabase();
    
    const contract = await getContract(orgId, contractId);
    if (!contract) return;
    
    const nextIndex = currentSignerIndex + 1;
    if (nextIndex < contract.signatures.length) {
      await db.collection(CONTRACTS_COLLECTION).updateOne(
        { _id: new ObjectId(contractId), orgId },
        {
          $set: {
            [`signatures.${nextIndex}.status`]: SignatureStatus.SENT,
            [`signatures.${nextIndex}.sentAt`]: new Date(),
            updatedAt: new Date(),
          },
        }
      );
      
      // In production, would send notification to next signer
    }
  } catch (error) {
    logError("send to next signer", error);
  }
}

// ============================================================================
// Exports
// ============================================================================

export default {
  // Contract management
  createContract,
  updateContract,
  getContract,
  listContracts,
  getContractStats,
  getExpiringContracts,
  
  // Workflow
  submitForReview,
  requestApproval,
  respondToApproval,
  sendForSignatures,
  recordSignature,
  activateContract,
  initiateRenewal,
  terminateContract,
  
  // Templates
  createTemplate,
  getTemplate,
  listTemplates,
};
