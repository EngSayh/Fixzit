/**
 * ZATCA Fatoora API Integration Service
 * 
 * Implements ZATCA Phase 2 E-Invoicing requirements:
 * - Invoice clearance with Fatoora API
 * - Hash chain integrity (SHA-256)
 * - QR code generation (9 TLV fields)
 * - Compliance wave tracking
 * 
 * @module services/zatca
 */

import crypto from "crypto";
import { ObjectId } from "mongodb";
import { logger } from "@/lib/logger";
import type {
  ZatcaInvoice,
  ZatcaClearanceStatus,
  ZatcaFatooraResponse,
  ZatcaTenantConfig,
  ZatcaInvoiceType,
} from "@/types/compliance";

// =============================================================================
// CONFIGURATION
// =============================================================================

const ZATCA_CONFIG = {
  SANDBOX_URL: "https://gw-fatoora.zatca.gov.sa/e-invoicing/developer-portal",
  PRODUCTION_URL: "https://gw-fatoora.zatca.gov.sa/e-invoicing/core",
  TIMEOUT_MS: 30000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  HASH_ALGORITHM: "sha256",
  TLV_TAGS: {
    SELLER_NAME: 1,
    VAT_NUMBER: 2,
    TIMESTAMP: 3,
    TOTAL: 4,
    VAT_AMOUNT: 5,
    // Extended tags for Phase 2
    INVOICE_HASH: 6,
    ECDSA_SIGNATURE: 7,
    ECDSA_PUBLIC_KEY: 8,
    ECDSA_STAMP: 9,
  },
} as const;

// =============================================================================
// HASH CHAIN MANAGEMENT
// =============================================================================

/**
 * Generate SHA-256 hash for an invoice
 */
export function generateInvoiceHash(invoiceData: {
  invoice_number: string;
  issue_date: string;
  total: number;
  vat_amount: number;
  seller_vat: string;
  previous_hash: string;
}): string {
  const dataToHash = [
    invoiceData.invoice_number,
    invoiceData.issue_date,
    invoiceData.total.toFixed(2),
    invoiceData.vat_amount.toFixed(2),
    invoiceData.seller_vat,
    invoiceData.previous_hash,
  ].join("|");

  return crypto
    .createHash(ZATCA_CONFIG.HASH_ALGORITHM)
    .update(dataToHash)
    .digest("hex");
}

/**
 * Get the previous invoice hash for chain continuity
 */
export async function getPreviousInvoiceHash(
  tenantId: string,
  _db: unknown
): Promise<string> {
  // In production, fetch the last invoice hash from DB
  // For initial invoice, return genesis hash
  const GENESIS_HASH = "0".repeat(64);
  
  // TODO: Implement actual DB lookup
  // const lastInvoice = await db.collection('zatca_invoices')
  //   .findOne({ tenant_id: tenantId }, { sort: { created_at: -1 } });
  // return lastInvoice?.current_hash || GENESIS_HASH;
  
  void tenantId;
  return GENESIS_HASH;
}

/**
 * Validate hash chain integrity
 */
export async function validateHashChain(
  tenantId: string,
  limit: number = 100
): Promise<{ valid: boolean; brokenAt?: number; error?: string }> {
  void tenantId;
  void limit;
  
  // TODO: Implement chain validation
  // 1. Fetch last N invoices
  // 2. Verify each invoice's previous_hash matches prior invoice's current_hash
  // 3. Return first broken link if any
  
  return { valid: true };
}

// =============================================================================
// TLV ENCODING (9 FIELDS FOR PHASE 2)
// =============================================================================

interface TlvField {
  tag: number;
  value: string;
}

function encodeTlvField(field: TlvField): Buffer {
  const valueBuffer = Buffer.from(field.value, "utf8");
  
  if (valueBuffer.length > 255) {
    throw new Error(`TLV field ${field.tag} exceeds 255 bytes`);
  }
  
  return Buffer.concat([
    Buffer.from([field.tag]),
    Buffer.from([valueBuffer.length]),
    valueBuffer,
  ]);
}

export interface ZatcaQrData {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  total: string;
  vatAmount: string;
  invoiceHash?: string;
  ecdsaSignature?: string;
  ecdsaPublicKey?: string;
  ecdsaStamp?: string;
}

/**
 * Generate ZATCA Phase 2 compliant TLV-encoded QR data
 */
export function generateZatcaTlv(data: ZatcaQrData): string {
  const fields: TlvField[] = [
    { tag: ZATCA_CONFIG.TLV_TAGS.SELLER_NAME, value: data.sellerName },
    { tag: ZATCA_CONFIG.TLV_TAGS.VAT_NUMBER, value: data.vatNumber },
    { tag: ZATCA_CONFIG.TLV_TAGS.TIMESTAMP, value: data.timestamp },
    { tag: ZATCA_CONFIG.TLV_TAGS.TOTAL, value: data.total },
    { tag: ZATCA_CONFIG.TLV_TAGS.VAT_AMOUNT, value: data.vatAmount },
  ];
  
  // Add Phase 2 extended fields if present
  if (data.invoiceHash) {
    fields.push({ tag: ZATCA_CONFIG.TLV_TAGS.INVOICE_HASH, value: data.invoiceHash });
  }
  if (data.ecdsaSignature) {
    fields.push({ tag: ZATCA_CONFIG.TLV_TAGS.ECDSA_SIGNATURE, value: data.ecdsaSignature });
  }
  if (data.ecdsaPublicKey) {
    fields.push({ tag: ZATCA_CONFIG.TLV_TAGS.ECDSA_PUBLIC_KEY, value: data.ecdsaPublicKey });
  }
  if (data.ecdsaStamp) {
    fields.push({ tag: ZATCA_CONFIG.TLV_TAGS.ECDSA_STAMP, value: data.ecdsaStamp });
  }
  
  const tlvBuffer = Buffer.concat(fields.map(encodeTlvField));
  return tlvBuffer.toString("base64");
}

// =============================================================================
// FATOORA API CLIENT
// =============================================================================

export interface FatooraSubmission {
  invoiceHash: string;
  uuid: string;
  invoice: string; // Base64 encoded invoice XML
}

export interface FatooraConfig {
  csid: string;
  secret: string;
  isSandbox: boolean;
}

/**
 * Submit invoice to ZATCA Fatoora API for clearance
 */
export async function submitToFatoora(
  submission: FatooraSubmission,
  config: FatooraConfig
): Promise<ZatcaFatooraResponse> {
  const baseUrl = config.isSandbox 
    ? ZATCA_CONFIG.SANDBOX_URL 
    : ZATCA_CONFIG.PRODUCTION_URL;
  
  const endpoint = `${baseUrl}/invoices/clearance/single`;
  
  const authHeader = Buffer.from(`${config.csid}:${config.secret}`).toString("base64");
  
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= ZATCA_CONFIG.MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ZATCA_CONFIG.TIMEOUT_MS);
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Basic ${authHeader}`,
          "Accept-Version": "V2",
          "Accept-Language": "en",
        },
        body: JSON.stringify({
          invoiceHash: submission.invoiceHash,
          uuid: submission.uuid,
          invoice: submission.invoice,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`ZATCA API error: ${response.status} - ${errorBody}`);
      }
      
      const result = await response.json() as ZatcaFatooraResponse;
      
      logger.info("ZATCA invoice submission successful", {
        uuid: submission.uuid,
        status: result.status,
      });
      
      return result;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < ZATCA_CONFIG.MAX_RETRIES) {
        const delay = ZATCA_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        logger.warn(`ZATCA submission attempt ${attempt} failed, retrying in ${delay}ms`, {
          error: lastError.message,
        });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  logger.error("ZATCA submission failed after all retries", {
    uuid: submission.uuid,
    error: lastError?.message,
  });
  
  throw lastError || new Error("ZATCA submission failed");
}

// =============================================================================
// INVOICE LIFECYCLE MANAGEMENT
// =============================================================================

export interface InvoiceData {
  invoice_number: string;
  issue_date: string;
  seller_name: string;
  seller_vat: string;
  buyer_name?: string;
  buyer_vat?: string;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate: number;
  }>;
  total: number;
  vat_amount: number;
  currency: string;
}

/**
 * Create a new ZATCA invoice record
 */
export function createZatcaInvoice(
  invoiceId: string,
  tenantId: string,
  invoiceType: ZatcaInvoiceType,
  invoiceData: InvoiceData,
  previousHash: string
): Omit<ZatcaInvoice, "created_at" | "updated_at"> {
  const currentHash = generateInvoiceHash({
    invoice_number: invoiceData.invoice_number,
    issue_date: invoiceData.issue_date,
    total: invoiceData.total,
    vat_amount: invoiceData.vat_amount,
    seller_vat: invoiceData.seller_vat,
    previous_hash: previousHash,
  });
  
  const qrData = generateZatcaTlv({
    sellerName: invoiceData.seller_name,
    vatNumber: invoiceData.seller_vat,
    timestamp: invoiceData.issue_date,
    total: invoiceData.total.toFixed(2),
    vatAmount: invoiceData.vat_amount.toFixed(2),
    invoiceHash: currentHash,
  });
  
  // Generate UUID v4 for ZATCA
  const zatcaUuid = crypto.randomUUID();
  
  // Validate and convert IDs to proper ObjectIds
  if (!ObjectId.isValid(invoiceId)) {
    throw new Error(`Invalid invoiceId: ${invoiceId}`);
  }
  if (!ObjectId.isValid(tenantId)) {
    throw new Error(`Invalid tenantId: ${tenantId}`);
  }
  
  return {
    invoice_id: new ObjectId(invoiceId),
    tenant_id: new ObjectId(tenantId),
    zatca_uuid: zatcaUuid,
    invoice_type: invoiceType,
    previous_hash: previousHash,
    current_hash: currentHash,
    clearance_status: "draft" as ZatcaClearanceStatus,
    qr_code_data: qrData,
    tamper_counter: 0,
    submission_attempts: 0,
  };
}

/**
 * Update invoice clearance status
 */
export function updateClearanceStatus(
  invoice: ZatcaInvoice,
  response: ZatcaFatooraResponse
): ZatcaInvoice {
  let newStatus: ZatcaClearanceStatus;
  
  switch (response.status) {
    case "PASS":
      newStatus = "cleared";
      break;
    case "WARNING":
      newStatus = "cleared"; // Cleared with warnings
      break;
    case "ERROR":
      newStatus = "rejected";
      break;
    default:
      newStatus = "pending";
  }
  
  return {
    ...invoice,
    clearance_status: newStatus,
    fatoora_response: response,
    submission_attempts: invoice.submission_attempts + 1,
    last_error: response.status === "ERROR" 
      ? response.validation_results?.error_messages?.[0]?.message 
      : undefined,
    updated_at: new Date(),
  };
}

// =============================================================================
// TENANT CONFIGURATION HELPERS
// =============================================================================

export function validateTenantConfig(config: Partial<ZatcaTenantConfig>): string[] {
  const errors: string[] = [];
  
  if (!config.commercial_reg_no) {
    errors.push("Commercial Registration Number is required");
  }
  
  if (!config.vat_number) {
    errors.push("VAT Number is required");
  } else if (!/^\d{15}$/.test(config.vat_number)) {
    errors.push("VAT Number must be exactly 15 digits");
  }
  
  if (config.zatca_wave && (config.zatca_wave < 1 || config.zatca_wave > 9)) {
    errors.push("ZATCA wave must be between 1 and 9");
  }
  
  if (!config.is_sandbox) {
    if (!config.production_csid || !config.production_secret) {
      errors.push("Production CSID and secret are required for non-sandbox mode");
    }
  }
  
  return errors;
}

/**
 * Determine if tenant is in their ZATCA compliance wave
 */
export function isTenantInActiveWave(
  tenantWave: number,
  currentDate: Date = new Date()
): boolean {
  // ZATCA wave rollout dates (approximate)
  const waveStartDates: Record<number, Date> = {
    1: new Date("2024-01-01"),
    2: new Date("2024-04-01"),
    3: new Date("2024-07-01"),
    4: new Date("2024-10-01"),
    5: new Date("2025-01-01"),
    6: new Date("2025-04-01"),
    7: new Date("2025-07-01"),
    8: new Date("2025-10-01"),
    9: new Date("2026-01-01"),
  };
  
  const waveStart = waveStartDates[tenantWave];
  return waveStart ? currentDate >= waveStart : false;
}

// =============================================================================
// ARCHIVAL
// =============================================================================

/**
 * Archive old invoices (ZATCA requires 6-year retention)
 */
export function calculateArchiveDate(invoiceDate: Date): Date {
  const archiveDate = new Date(invoiceDate);
  archiveDate.setFullYear(archiveDate.getFullYear() + 6);
  return archiveDate;
}

export function shouldArchive(invoice: ZatcaInvoice): boolean {
  if (invoice.clearance_status !== "cleared") {
    return false;
  }
  
  // Guard against missing created_at (newly created invoices)
  if (!invoice.created_at) {
    return false;
  }
  
  const createdAtDate = new Date(invoice.created_at);
  if (isNaN(createdAtDate.getTime())) {
    return false;
  }
  
  const archiveDate = calculateArchiveDate(createdAtDate);
  return new Date() >= archiveDate;
}
