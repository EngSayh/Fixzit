/**
 * ZATCA Phase 2 E-Invoicing Module
 * @module lib/zatca
 */

// Types
export type {
  ZatcaInvoiceRequest,
  ZatcaInvoiceLine,
  ZatcaSubmissionResult,
  ZatcaComplianceResponse,
  ZatcaProductionCsidResponse,
  ZatcaCsrConfig,
  SimplifiedInvoiceData,
  ZatcaApiError,
  ZatcaApiStatus,
  ZatcaInvoiceTypeCode,
  ZatcaInvoiceSubtype,
  ZatcaValidationError,
} from "./fatoora-types";

// Crypto utilities
export {
  ZatcaCrypto,
  generateInvoiceHash,
  generateInvoiceUuid,
  generateKeyPair,
  generateCsr,
  signData,
  generatePhase2TlvData,
  getInitialInvoiceHash,
} from "./crypto";

// XML builder
export {
  ZatcaXmlBuilder,
  buildInvoiceXml,
  buildSimplifiedInvoiceXml,
  hashInvoice,
  newInvoiceUuid,
  formatDate,
  formatTime,
  formatAmount,
} from "./xml-builder";

// Fatoora client
export {
  FatooraClient,
  submitForClearance,
  submitForReporting,
  requestComplianceCsid,
  requestProductionCsid,
  submitComplianceInvoice,
  encodeInvoiceXml,
  decodeInvoiceXml,
} from "./fatoora-client";
