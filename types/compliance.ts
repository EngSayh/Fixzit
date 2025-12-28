/**
 * Compliance Types for Saudi Regulatory Requirements
 * 
 * Supports:
 * - ZATCA Phase 2 E-Invoicing (Fatoora API)
 * - NCA ECC-2:2024 Cybersecurity (108 controls)
 * - PDPL Privacy Law (Saudi Arabia)
 * - Nafath Identity Verification
 * - Civil Defense Certifications
 * - GOSI/WPS Integration
 * 
 * @module types/compliance
 */

import type { ObjectId } from "mongodb";

// =============================================================================
// ZATCA E-INVOICING TYPES
// =============================================================================

export type ZatcaClearanceStatus = 
  | "draft"
  | "pending"
  | "submitted"
  | "cleared"
  | "rejected"
  | "archived";

export type ZatcaInvoiceType =
  | "standard"      // B2B invoice
  | "simplified"    // B2C invoice (POS)
  | "debit_note"
  | "credit_note";

export interface ZatcaInvoice {
  /** Reference to the main invoice document */
  invoice_id: ObjectId;
  /** Tenant/organization ID for multi-tenancy */
  tenant_id: ObjectId;
  /** ZATCA-assigned 128-bit UUID */
  zatca_uuid: string;
  /** Invoice type per ZATCA classification */
  invoice_type: ZatcaInvoiceType;
  /** SHA-256 hash of previous invoice in chain */
  previous_hash: string;
  /** Current invoice hash for chain integrity */
  current_hash: string;
  /** Clearance status from ZATCA */
  clearance_status: ZatcaClearanceStatus;
  /** Full response from Fatoora API */
  fatoora_response?: ZatcaFatooraResponse;
  /** Base64-encoded QR code data with 9 TLV fields */
  qr_code_data: string;
  /** QR code as data URL for display */
  qr_code_image?: string;
  /** Tamper-evident counter */
  tamper_counter: number;
  /** Submission attempts count */
  submission_attempts: number;
  /** Last error message if rejected */
  last_error?: string;
  /** When invoice was archived */
  archive_date?: Date;
  /** Metadata timestamps */
  created_at: Date;
  updated_at: Date;
}

export interface ZatcaFatooraResponse {
  /** Response status from ZATCA */
  status: "PASS" | "WARNING" | "ERROR";
  /** Clearance token if successful */
  clearance_token?: string;
  /** Validation results */
  validation_results?: {
    info_messages?: ZatcaValidationMessage[];
    warning_messages?: ZatcaValidationMessage[];
    error_messages?: ZatcaValidationMessage[];
  };
  /** Signed invoice XML if cleared */
  signed_invoice_xml?: string;
  /** Timestamp of clearance */
  cleared_at?: string;
}

export interface ZatcaValidationMessage {
  type: "INFO" | "WARNING" | "ERROR";
  code: string;
  category: string;
  message: string;
  status: "PASS" | "WARNING" | "ERROR";
}

export interface ZatcaTenantConfig {
  tenant_id: ObjectId;
  /** Commercial Registration Number */
  commercial_reg_no: string;
  /** VAT Registration Number (15 digits) */
  vat_number: string;
  /** ZATCA rollout wave (1-9) */
  zatca_wave: number;
  /** Production environment credentials */
  production_csid?: string;
  production_secret?: string;
  /** Compliance CSID for testing */
  compliance_csid?: string;
  compliance_secret?: string;
  /** Whether in sandbox mode */
  is_sandbox: boolean;
  /** Last successful sync */
  last_sync?: Date;
  /** Onboarding status */
  onboarding_status: "not_started" | "in_progress" | "completed";
}

// =============================================================================
// NCA ECC-2:2024 CYBERSECURITY TYPES
// =============================================================================

export type NcaControlDomain =
  | "cybersecurity_governance"
  | "cybersecurity_defense"
  | "cybersecurity_resilience"
  | "third_party_cybersecurity"
  | "industrial_control_systems"
  | "cloud_computing";

export type NcaControlStatus =
  | "not_assessed"
  | "compliant"
  | "partially_compliant"
  | "non_compliant"
  | "not_applicable";

export interface NcaControl {
  /** Control ID (e.g., "1-1-1") */
  control_id: string;
  /** Control domain */
  domain: NcaControlDomain;
  /** Control name */
  name: string;
  /** Control description */
  description: string;
  /** Compliance level required (1-3) */
  level: 1 | 2 | 3;
  /** Current status */
  status: NcaControlStatus;
  /** Evidence document IDs */
  evidence_ids: ObjectId[];
  /** Last assessment date */
  last_assessed?: Date;
  /** Next review date */
  next_review?: Date;
  /** Assessor notes */
  notes?: string;
  /** Remediation plan if non-compliant */
  remediation_plan?: string;
  /** Remediation deadline */
  remediation_deadline?: Date;
}

export interface NcaComplianceRecord {
  tenant_id: ObjectId;
  /** All 108 controls status */
  controls: NcaControl[];
  /** Overall compliance score (0-100) */
  overall_score: number;
  /** Risk level based on score */
  risk_level: "low" | "medium" | "high" | "critical";
  /** Last full assessment date */
  last_assessment_date?: Date;
  /** Next scheduled assessment */
  next_assessment_date?: Date;
  /** Certification status */
  certification_status: "not_started" | "in_progress" | "certified" | "expired";
  /** Certification expiry date */
  certification_expiry?: Date;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// PDPL PRIVACY LAW TYPES
// =============================================================================

export type PdplConsentPurpose =
  | "service_delivery"
  | "marketing"
  | "analytics"
  | "third_party_sharing"
  | "profiling"
  | "cross_border_transfer";

export type PdplConsentStatus = "granted" | "denied" | "withdrawn" | "expired";

export interface PdplConsent {
  /** Consent record ID */
  consent_id: ObjectId;
  /** User who gave consent */
  user_id: ObjectId;
  /** Tenant context */
  tenant_id: ObjectId;
  /** What the consent is for */
  purpose: PdplConsentPurpose;
  /** Current status */
  status: PdplConsentStatus;
  /** When consent was given */
  granted_at?: Date;
  /** When consent was withdrawn */
  withdrawn_at?: Date;
  /** Consent expiry date */
  expires_at?: Date;
  /** Legal basis for processing */
  legal_basis: "consent" | "contract" | "legal_obligation" | "vital_interest" | "public_interest" | "legitimate_interest";
  /** Version of privacy policy consented to */
  policy_version: string;
  /** IP address at time of consent */
  ip_address?: string;
  /** User agent at time of consent */
  user_agent?: string;
  created_at: Date;
  updated_at: Date;
}

export type DsarRequestType =
  | "access"           // Right to access personal data
  | "rectification"    // Right to correct data
  | "erasure"          // Right to be forgotten
  | "portability"      // Right to data portability
  | "restriction"      // Right to restrict processing
  | "objection";       // Right to object

export type DsarStatus =
  | "received"
  | "identity_verification"
  | "processing"
  | "pending_approval"
  | "completed"
  | "denied"
  | "closed";

export interface DsarRequest {
  /** Request ID */
  request_id: ObjectId;
  /** User making the request */
  user_id: ObjectId;
  /** Tenant context (if applicable) */
  tenant_id?: ObjectId;
  /** Type of DSAR */
  request_type: DsarRequestType;
  /** Current status */
  status: DsarStatus;
  /** Request description */
  description: string;
  /** Identity verification completed */
  identity_verified: boolean;
  /** Identity verification method used */
  verification_method?: "nafath" | "otp" | "document" | "in_person";
  /** Assigned processor */
  assigned_to?: ObjectId;
  /** Processing notes */
  notes: string[];
  /** Response to requester */
  response?: string;
  /** Denial reason if applicable */
  denial_reason?: string;
  /** Response document IDs */
  response_documents: ObjectId[];
  /** 30-day SLA deadline */
  deadline: Date;
  /** Extension granted (up to 60 days total) */
  extension_granted: boolean;
  /** Extended deadline if applicable */
  extended_deadline?: Date;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

// =============================================================================
// NAFATH IDENTITY TYPES
// =============================================================================

export type NafathVerificationStatus =
  | "not_verified"
  | "pending"
  | "verified"
  | "failed"
  | "expired";

export interface NafathVerification {
  /** User ID */
  user_id: ObjectId;
  /** National ID number */
  national_id: string;
  /** Verification status */
  status: NafathVerificationStatus;
  /** Nafath transaction ID */
  transaction_id?: string;
  /** Random code shown to user */
  random_code?: string;
  /** Verification expiry */
  expires_at?: Date;
  /** Last verification date */
  verified_at?: Date;
  /** Number of failed attempts */
  failed_attempts: number;
  /** Lockout until (after too many failures) */
  locked_until?: Date;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// CIVIL DEFENSE TYPES
// =============================================================================

export type CertificationType =
  | "fire_safety"
  | "building_safety"
  | "electrical_safety"
  | "emergency_evacuation"
  | "hazardous_materials";

export type CertificationStatus =
  | "valid"
  | "expiring_soon"    // Within 30 days
  | "expired"
  | "pending_renewal"
  | "suspended";

export interface CivilDefenseCertification {
  /** Certification ID */
  certification_id: ObjectId;
  /** Tenant/Property owner */
  tenant_id: ObjectId;
  /** Property/Building ID */
  property_id: ObjectId;
  /** Type of certification */
  type: CertificationType;
  /** Current status */
  status: CertificationStatus;
  /** Certificate number */
  certificate_number: string;
  /** Issue date */
  issued_at: Date;
  /** Expiry date */
  expires_at: Date;
  /** Issuing authority */
  issuing_authority: string;
  /** Document attachment IDs */
  document_ids: ObjectId[];
  /** Renewal reminder sent */
  reminder_sent: boolean;
  /** Notes */
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

// =============================================================================
// GOSI/WPS TYPES
// =============================================================================

export interface GosiEmployee {
  /** Employee ID */
  employee_id: ObjectId;
  /** Tenant/Employer ID */
  tenant_id: ObjectId;
  /** GOSI subscription number */
  gosi_subscription_no: string;
  /** National ID or Iqama number */
  id_number: string;
  /** Is Saudi national */
  is_saudi: boolean;
  /** Monthly salary for GOSI calculation */
  gosi_salary: number;
  /** Employer contribution (12% for Saudis, 2% for non-Saudis) */
  employer_contribution: number;
  /** Employee contribution (10% for Saudis only) */
  employee_contribution: number;
  /** Registration date */
  registered_at: Date;
  /** Last contribution date */
  last_contribution_date?: Date;
  /** Status */
  status: "active" | "suspended" | "terminated";
  created_at: Date;
  updated_at: Date;
}

export interface WpsPayment {
  /** Payment ID */
  payment_id: ObjectId;
  /** Tenant/Employer ID */
  tenant_id: ObjectId;
  /** Payment month (YYYY-MM) */
  payment_month: string;
  /** Employees included in payment */
  employee_ids: ObjectId[];
  /** Total amount */
  total_amount: number;
  /** Bank reference number */
  bank_reference?: string;
  /** Mudad file reference */
  mudad_reference?: string;
  /** Status */
  status: "pending" | "submitted" | "confirmed" | "rejected";
  /** Submission date */
  submitted_at?: Date;
  /** Confirmation date */
  confirmed_at?: Date;
  /** Rejection reason */
  rejection_reason?: string;
  created_at: Date;
  updated_at: Date;
}

export interface SaudizationQuota {
  /** Tenant ID */
  tenant_id: ObjectId;
  /** Industry classification */
  industry: string;
  /** Total employees */
  total_employees: number;
  /** Saudi employees */
  saudi_employees: number;
  /** Non-Saudi employees */
  non_saudi_employees: number;
  /** Required percentage */
  required_percentage: number;
  /** Actual percentage */
  actual_percentage: number;
  /** Nitaqat band */
  nitaqat_band: "platinum" | "green_high" | "green_mid" | "green_low" | "yellow" | "red";
  /** Compliance status */
  is_compliant: boolean;
  /** Last updated */
  updated_at: Date;
}

// =============================================================================
// UNIFIED COMPLIANCE RECORD
// =============================================================================

export type RegulationType = "ZATCA" | "NCA" | "PDPL" | "CIVIL_DEFENSE" | "GOSI";

export interface ComplianceRecord {
  /** Tenant ID */
  tenant_id: ObjectId;
  /** Regulation type */
  regulation: RegulationType;
  /** Requirements with status */
  requirements: ComplianceRequirement[];
  /** Overall compliance score (0-100) */
  overall_score: number;
  /** Risk level */
  risk_level: "low" | "medium" | "high" | "critical";
  /** Last assessment date */
  last_assessed?: Date;
  /** Next assessment date */
  next_assessment?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ComplianceRequirement {
  /** Requirement code */
  code: string;
  /** Description */
  description: string;
  /** Current status */
  status: "compliant" | "non_compliant" | "partial" | "not_applicable";
  /** Evidence document IDs */
  evidence: ObjectId[];
  /** Last assessment date */
  last_assessed: Date;
  /** Next review date */
  next_review: Date;
  /** Priority */
  priority: "critical" | "high" | "medium" | "low";
}
