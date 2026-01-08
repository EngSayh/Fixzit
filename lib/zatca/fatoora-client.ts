/**
 * ZATCA Fatoora API Client
 * @module lib/zatca/fatoora-client
 */

import { getZatcaEndpoints } from "@/config/zatca.config";
import { logger } from "@/lib/logger";
import type { ZatcaClearanceRequest, ZatcaReportingRequest, ZatcaComplianceResponse, ZatcaProductionCsidResponse, ZatcaSubmissionResult } from "./fatoora-types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function createAuthHeader(csid: string, secret: string): string { return `Basic ${Buffer.from(`${csid}:${secret}`).toString("base64")}`; }
export function encodeInvoiceXml(xml: string): string { return Buffer.from(xml, "utf8").toString("base64"); }
export function decodeInvoiceXml(base64: string): string { return Buffer.from(base64, "base64").toString("utf8"); }

function extractUuidFromXml(xml: string): string {
  const match = xml.match(/<cbc:UUID>([^<]+)<\/cbc:UUID>/);
  const uuid = match ? match[1].trim() : "";
  if (!uuid) {
    throw new Error(`Failed to extract UUID from invoice XML: <cbc:UUID> element not found. XML snippet: ${xml.substring(0, 200)}...`);
  }
  if (!UUID_PATTERN.test(uuid)) {
    throw new Error(`Invalid UUID format extracted from XML: "${uuid}". Expected format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`);
  }
  return uuid;
}

/**
 * Safely parse JSON response, with fallback for non-JSON bodies
 */
async function safeParseJson(response: Response): Promise<Record<string, unknown>> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      const text = await response.text();
      return { parseError: true, rawText: text, message: "Failed to parse JSON response" };
    }
  }
  // Non-JSON response
  const text = await response.text();
  return { parseError: true, rawText: text, message: `Non-JSON response (${contentType})` };
}

/**
 * Create a fetch with timeout using AbortController
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function submitForClearance(csid: string, secret: string, invoiceXml: string, invoiceHash: string): Promise<ZatcaSubmissionResult> {
  const endpoints = getZatcaEndpoints();
  let uuid: string;
  try {
    uuid = extractUuidFromXml(invoiceXml);
  } catch (error) {
    return { success: false, status: "ERROR", errors: [{ type: "VALIDATION", code: "UUID_EXTRACTION_FAILED", category: "XML", message: String(error), status: "ERROR" }] };
  }
  const requestBody: ZatcaClearanceRequest = { invoiceHash, uuid, invoice: encodeInvoiceXml(invoiceXml) };
  try {
    const response = await fetchWithTimeout(endpoints.clearanceApiUrl, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json", "Accept-Version": "V2", "Authorization": createAuthHeader(csid, secret), "Clearance-Status": "1" }, body: JSON.stringify(requestBody) }, endpoints.timeouts.clearanceMs);
    const data = await safeParseJson(response);
    if (!response.ok) return { success: false, status: "ERROR", errors: (data as { validationResults?: { errorMessages?: Array<{ type: string; code: string; category: string; message: string; status: string }> } }).validationResults?.errorMessages || [{ type: "API", code: String(response.status), category: "HTTP", message: (data as { message?: string }).message || (data as { rawText?: string }).rawText || "Request failed", status: "ERROR" }] };
    return { success: true, status: (data as { validationResults?: { status?: "PASS" | "WARNING" | "ERROR" } }).validationResults?.status || "PASS", invoiceHash: (data as { invoiceHash?: string }).invoiceHash, clearanceStatus: (data as { clearanceStatus?: string }).clearanceStatus, signedInvoice: (data as { clearedInvoice?: string }).clearedInvoice, qrCode: (data as { qrCode?: string }).qrCode, validationResults: (data as { validationResults?: ZatcaSubmissionResult["validationResults"] }).validationResults, warnings: (data as { validationResults?: { warningMessages?: ZatcaSubmissionResult["warnings"] } }).validationResults?.warningMessages };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      logger.error("[Fatoora] Clearance timeout:", { error });
      return { success: false, status: "ERROR", errors: [{ type: "NETWORK", code: "TIMEOUT", category: "Network", message: `Request timed out after ${endpoints.timeouts.clearanceMs}ms`, status: "ERROR" }] };
    }
    logger.error("[Fatoora] Clearance error:", { error });
    return { success: false, status: "ERROR", errors: [{ type: "NETWORK", code: "FETCH_ERROR", category: "Network", message: String(error), status: "ERROR" }] };
  }
}

export async function submitForReporting(csid: string, secret: string, invoiceXml: string, invoiceHash: string): Promise<ZatcaSubmissionResult> {
  const endpoints = getZatcaEndpoints();
  let uuid: string;
  try {
    uuid = extractUuidFromXml(invoiceXml);
  } catch (error) {
    return { success: false, status: "ERROR", errors: [{ type: "VALIDATION", code: "UUID_EXTRACTION_FAILED", category: "XML", message: String(error), status: "ERROR" }] };
  }
  const requestBody: ZatcaReportingRequest = { invoiceHash, uuid, invoice: encodeInvoiceXml(invoiceXml) };
  try {
    const response = await fetchWithTimeout(endpoints.reportingApiUrl, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json", "Accept-Version": "V2", "Authorization": createAuthHeader(csid, secret) }, body: JSON.stringify(requestBody) }, endpoints.timeouts.reportingMs);
    const data = await safeParseJson(response);
    if (!response.ok) return { success: false, status: "ERROR", errors: (data as { validationResults?: { errorMessages?: Array<{ type: string; code: string; category: string; message: string; status: string }> } }).validationResults?.errorMessages || [{ type: "API", code: String(response.status), category: "HTTP", message: (data as { message?: string }).message || (data as { rawText?: string }).rawText || "Request failed", status: "ERROR" }] };
    return { success: true, status: (data as { validationResults?: { status?: "PASS" | "WARNING" | "ERROR" } }).validationResults?.status || "PASS", invoiceHash: (data as { invoiceHash?: string }).invoiceHash, reportingStatus: (data as { reportingStatus?: string }).reportingStatus, validationResults: (data as { validationResults?: ZatcaSubmissionResult["validationResults"] }).validationResults, warnings: (data as { validationResults?: { warningMessages?: ZatcaSubmissionResult["warnings"] } }).validationResults?.warningMessages };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      logger.error("[Fatoora] Reporting timeout:", { error });
      return { success: false, status: "ERROR", errors: [{ type: "NETWORK", code: "TIMEOUT", category: "Network", message: `Request timed out after ${endpoints.timeouts.reportingMs}ms`, status: "ERROR" }] };
    }
    logger.error("[Fatoora] Reporting error:", { error });
    return { success: false, status: "ERROR", errors: [{ type: "NETWORK", code: "FETCH_ERROR", category: "Network", message: String(error), status: "ERROR" }] };
  }
}

export async function requestComplianceCsid(csr: string, otp: string): Promise<ZatcaComplianceResponse> {
  const endpoints = getZatcaEndpoints();
  try {
    const response = await fetchWithTimeout(endpoints.complianceApiUrl, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json", "Accept-Version": "V2", "OTP": otp }, body: JSON.stringify({ csr }) }, endpoints.timeouts.clearanceMs);
    const data = await safeParseJson(response);
    if (!response.ok) return { success: false, errors: [{ type: "API", code: String(response.status), category: "HTTP", message: (data as { message?: string }).message || (data as { rawText?: string }).rawText || "Request failed", status: "ERROR" }] };
    return { success: true, requestId: (data as { requestID?: string }).requestID, csid: (data as { binarySecurityToken?: string }).binarySecurityToken, secret: (data as { secret?: string }).secret, binarySecurityToken: (data as { binarySecurityToken?: string }).binarySecurityToken, expiresAt: (data as { tokenExpiry?: string }).tokenExpiry };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      logger.error("[Fatoora] Compliance CSID timeout:", { error });
      return { success: false, errors: [{ type: "NETWORK", code: "TIMEOUT", category: "Network", message: `Request timed out`, status: "ERROR" }] };
    }
    logger.error("[Fatoora] Compliance CSID error:", { error });
    return { success: false, errors: [{ type: "NETWORK", code: "FETCH_ERROR", category: "Network", message: String(error), status: "ERROR" }] };
  }
}

export async function requestProductionCsid(csid: string, secret: string, complianceRequestId: string): Promise<ZatcaProductionCsidResponse> {
  const endpoints = getZatcaEndpoints();
  try {
    const response = await fetchWithTimeout(endpoints.productionCsidApiUrl, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json", "Accept-Version": "V2", "Authorization": createAuthHeader(csid, secret) }, body: JSON.stringify({ complianceRequestId }) }, endpoints.timeouts.clearanceMs);
    const data = await safeParseJson(response);
    if (!response.ok) return { success: false, errors: [{ type: "API", code: String(response.status), category: "HTTP", message: (data as { message?: string }).message || (data as { rawText?: string }).rawText || "Request failed", status: "ERROR" }] };
    return { success: true, requestId: (data as { requestID?: string }).requestID, csid: (data as { binarySecurityToken?: string }).binarySecurityToken, secret: (data as { secret?: string }).secret, binarySecurityToken: (data as { binarySecurityToken?: string }).binarySecurityToken, expiresAt: (data as { tokenExpiry?: string }).tokenExpiry };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      logger.error("[Fatoora] Production CSID timeout:", { error });
      return { success: false, errors: [{ type: "NETWORK", code: "TIMEOUT", category: "Network", message: `Request timed out`, status: "ERROR" }] };
    }
    logger.error("[Fatoora] Production CSID error:", { error });
    return { success: false, errors: [{ type: "NETWORK", code: "FETCH_ERROR", category: "Network", message: String(error), status: "ERROR" }] };
  }
}

export async function submitComplianceInvoice(csid: string, secret: string, invoiceXml: string, invoiceHash: string): Promise<ZatcaSubmissionResult> {
  const endpoints = getZatcaEndpoints();
  let uuid: string;
  try {
    uuid = extractUuidFromXml(invoiceXml);
  } catch (error) {
    return { success: false, status: "ERROR", errors: [{ type: "VALIDATION", code: "UUID_EXTRACTION_FAILED", category: "XML", message: String(error), status: "ERROR" }] };
  }
  const requestBody = { invoiceHash, uuid, invoice: encodeInvoiceXml(invoiceXml) };
  try {
    // Use the pre-configured complianceInvoicesApiUrl instead of manually appending /invoices
    const response = await fetchWithTimeout(endpoints.complianceInvoicesApiUrl, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json", "Accept-Version": "V2", "Authorization": createAuthHeader(csid, secret) }, body: JSON.stringify(requestBody) }, endpoints.timeouts.clearanceMs);
    const data = await safeParseJson(response);
    if (!response.ok) return { success: false, status: "ERROR", errors: (data as { validationResults?: { errorMessages?: Array<{ type: string; code: string; category: string; message: string; status: string }> } }).validationResults?.errorMessages || [{ type: "API", code: String(response.status), category: "HTTP", message: (data as { message?: string }).message || (data as { rawText?: string }).rawText || "Request failed", status: "ERROR" }] };
    return { success: true, status: (data as { validationResults?: { status?: "PASS" | "WARNING" | "ERROR" } }).validationResults?.status || "PASS", invoiceHash: (data as { invoiceHash?: string }).invoiceHash, clearanceStatus: (data as { clearanceStatus?: string }).clearanceStatus, reportingStatus: (data as { reportingStatus?: string }).reportingStatus, validationResults: (data as { validationResults?: ZatcaSubmissionResult["validationResults"] }).validationResults, warnings: (data as { validationResults?: { warningMessages?: ZatcaSubmissionResult["warnings"] } }).validationResults?.warningMessages };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      logger.error("[Fatoora] Compliance invoice timeout:", { error });
      return { success: false, status: "ERROR", errors: [{ type: "NETWORK", code: "TIMEOUT", category: "Network", message: `Request timed out`, status: "ERROR" }] };
    }
    logger.error("[Fatoora] Compliance invoice error:", { error });
    return { success: false, status: "ERROR", errors: [{ type: "NETWORK", code: "FETCH_ERROR", category: "Network", message: String(error), status: "ERROR" }] };
  }
}

export const FatooraClient = { submitForClearance, submitForReporting, requestComplianceCsid, requestProductionCsid, submitComplianceInvoice, encodeInvoiceXml, decodeInvoiceXml };
