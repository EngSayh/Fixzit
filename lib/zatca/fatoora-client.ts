/**
 * ZATCA Fatoora API Client
 * @module lib/zatca/fatoora-client
 */

import { getZatcaEndpoints } from "@/config/zatca.config";
import { logger } from "@/lib/logger";
import type { ZatcaClearanceRequest, ZatcaReportingRequest, ZatcaComplianceResponse, ZatcaProductionCsidResponse, ZatcaSubmissionResult } from "./fatoora-types";

function createAuthHeader(csid: string, secret: string): string { return `Basic ${Buffer.from(`${csid}:${secret}`).toString("base64")}`; }
export function encodeInvoiceXml(xml: string): string { return Buffer.from(xml, "utf8").toString("base64"); }
export function decodeInvoiceXml(base64: string): string { return Buffer.from(base64, "base64").toString("utf8"); }
function extractUuidFromXml(xml: string): string { const match = xml.match(/<cbc:UUID>([^<]+)<\/cbc:UUID>/); return match ? match[1] : ""; }

export async function submitForClearance(csid: string, secret: string, invoiceXml: string, invoiceHash: string): Promise<ZatcaSubmissionResult> {
  const endpoints = getZatcaEndpoints();
  const requestBody: ZatcaClearanceRequest = { invoiceHash, uuid: extractUuidFromXml(invoiceXml), invoice: encodeInvoiceXml(invoiceXml) };
  try {
    const response = await fetch(endpoints.clearanceApiUrl, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json", "Accept-Version": "V2", "Authorization": createAuthHeader(csid, secret), "Clearance-Status": "1" }, body: JSON.stringify(requestBody) });
    const data = await response.json();
    if (!response.ok) return { success: false, status: "ERROR", errors: data.validationResults?.errorMessages || [{ type: "API", code: String(response.status), category: "HTTP", message: data.message || "Request failed", status: "ERROR" }] };
    return { success: true, status: data.validationResults?.status || "PASS", invoiceHash: data.invoiceHash, clearanceStatus: data.clearanceStatus, signedInvoice: data.clearedInvoice, qrCode: data.qrCode, validationResults: data.validationResults, warnings: data.validationResults?.warningMessages };
  } catch (error) { logger.error("[Fatoora] Clearance error:", { error }); return { success: false, status: "ERROR", errors: [{ type: "NETWORK", code: "FETCH_ERROR", category: "Network", message: String(error), status: "ERROR" }] }; }
}

export async function submitForReporting(csid: string, secret: string, invoiceXml: string, invoiceHash: string): Promise<ZatcaSubmissionResult> {
  const endpoints = getZatcaEndpoints();
  const requestBody: ZatcaReportingRequest = { invoiceHash, uuid: extractUuidFromXml(invoiceXml), invoice: encodeInvoiceXml(invoiceXml) };
  try {
    const response = await fetch(endpoints.reportingApiUrl, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json", "Accept-Version": "V2", "Authorization": createAuthHeader(csid, secret) }, body: JSON.stringify(requestBody) });
    const data = await response.json();
    if (!response.ok) return { success: false, status: "ERROR", errors: data.validationResults?.errorMessages || [{ type: "API", code: String(response.status), category: "HTTP", message: data.message || "Request failed", status: "ERROR" }] };
    return { success: true, status: data.validationResults?.status || "PASS", invoiceHash: data.invoiceHash, reportingStatus: data.reportingStatus, validationResults: data.validationResults, warnings: data.validationResults?.warningMessages };
  } catch (error) { logger.error("[Fatoora] Reporting error:", { error }); return { success: false, status: "ERROR", errors: [{ type: "NETWORK", code: "FETCH_ERROR", category: "Network", message: String(error), status: "ERROR" }] }; }
}

export async function requestComplianceCsid(csr: string, otp: string): Promise<ZatcaComplianceResponse> {
  const endpoints = getZatcaEndpoints();
  try {
    const response = await fetch(endpoints.complianceApiUrl, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json", "Accept-Version": "V2", "OTP": otp }, body: JSON.stringify({ csr }) });
    const data = await response.json();
    if (!response.ok) return { success: false, errors: [{ type: "API", code: String(response.status), category: "HTTP", message: data.message || "Request failed", status: "ERROR" }] };
    return { success: true, requestId: data.requestID, csid: data.binarySecurityToken, secret: data.secret, binarySecurityToken: data.binarySecurityToken, expiresAt: data.tokenExpiry };
  } catch (error) { logger.error("[Fatoora] Compliance CSID error:", { error }); return { success: false, errors: [{ type: "NETWORK", code: "FETCH_ERROR", category: "Network", message: String(error), status: "ERROR" }] }; }
}

export async function requestProductionCsid(csid: string, secret: string, complianceRequestId: string): Promise<ZatcaProductionCsidResponse> {
  const endpoints = getZatcaEndpoints();
  try {
    const response = await fetch(endpoints.productionCsidApiUrl, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json", "Accept-Version": "V2", "Authorization": createAuthHeader(csid, secret) }, body: JSON.stringify({ complianceRequestId }) });
    const data = await response.json();
    if (!response.ok) return { success: false, errors: [{ type: "API", code: String(response.status), category: "HTTP", message: data.message || "Request failed", status: "ERROR" }] };
    return { success: true, requestId: data.requestID, csid: data.binarySecurityToken, secret: data.secret, binarySecurityToken: data.binarySecurityToken, expiresAt: data.tokenExpiry };
  } catch (error) { logger.error("[Fatoora] Production CSID error:", { error }); return { success: false, errors: [{ type: "NETWORK", code: "FETCH_ERROR", category: "Network", message: String(error), status: "ERROR" }] }; }
}

export async function submitComplianceInvoice(csid: string, secret: string, invoiceXml: string, invoiceHash: string): Promise<ZatcaSubmissionResult> {
  const endpoints = getZatcaEndpoints();
  const requestBody = { invoiceHash, uuid: extractUuidFromXml(invoiceXml), invoice: encodeInvoiceXml(invoiceXml) };
  try {
    const response = await fetch(`${endpoints.complianceApiUrl}/invoices`, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json", "Accept-Version": "V2", "Authorization": createAuthHeader(csid, secret) }, body: JSON.stringify(requestBody) });
    const data = await response.json();
    if (!response.ok) return { success: false, status: "ERROR", errors: data.validationResults?.errorMessages || [{ type: "API", code: String(response.status), category: "HTTP", message: data.message || "Request failed", status: "ERROR" }] };
    return { success: true, status: data.validationResults?.status || "PASS", invoiceHash: data.invoiceHash, clearanceStatus: data.clearanceStatus, reportingStatus: data.reportingStatus, validationResults: data.validationResults, warnings: data.validationResults?.warningMessages };
  } catch (error) { logger.error("[Fatoora] Compliance invoice error:", { error }); return { success: false, status: "ERROR", errors: [{ type: "NETWORK", code: "FETCH_ERROR", category: "Network", message: String(error), status: "ERROR" }] }; }
}

export const FatooraClient = { submitForClearance, submitForReporting, requestComplianceCsid, requestProductionCsid, submitComplianceInvoice, encodeInvoiceXml, decodeInvoiceXml };
