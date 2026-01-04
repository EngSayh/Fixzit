/**
 * ZATCA Configuration
 * Environment-based configuration for ZATCA Fatoora API integration.
 * @module config/zatca.config
 */

import { z } from "zod";

export const ZATCA_ENDPOINTS = {
  sandbox: {
    base: "https://gw-fatoora.zatca.gov.sa/e-invoicing/simulation",
    compliance: "/compliance",
    complianceInvoices: "/compliance/invoices",
    production: "/production/csids",
    clearance: "/invoices/clearance/single",
    reporting: "/invoices/reporting/single",
  },
  production: {
    base: "https://gw-fatoora.zatca.gov.sa/e-invoicing/core",
    compliance: "/compliance",
    complianceInvoices: "/compliance/invoices",
    production: "/production/csids",
    clearance: "/invoices/clearance/single",
    reporting: "/invoices/reporting/single",
  },
} as const;

export const ZATCA_INVOICE_TYPE_CODES = { INVOICE: "388", CREDIT_NOTE: "381", DEBIT_NOTE: "383" } as const;
export const ZATCA_INVOICE_SUBTYPE = { STANDARD_INVOICE: "0100000", SIMPLIFIED_INVOICE: "0200000" } as const;
export const ZATCA_TAX_CATEGORIES = { S: "Standard rate", Z: "Zero rated", E: "Exempt from VAT", O: "Out of scope" } as const;

const ZatcaConfigSchema = z.object({
  environment: z.enum(["sandbox", "production"]),
  vatNumber: z.string().length(15, "VAT number must be exactly 15 digits"),
  sellerName: z.string().min(1, "Seller name is required"),
  branchName: z.string().optional(),
  streetAddress: z.string().optional(),
  buildingNumber: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  industryCode: z.string().optional(),
  complianceCsid: z.string().optional(),
  complianceSecret: z.string().optional(),
  productionCsid: z.string().optional(),
  productionSecret: z.string().optional(),
});

export type ZatcaConfig = z.infer<typeof ZatcaConfigSchema>;

let cachedConfig: ZatcaConfig | null = null;

export function getZatcaConfig(): ZatcaConfig | null {
  if (cachedConfig) return cachedConfig;
  const vatNumber = process.env.ZATCA_VAT_NUMBER;
  const sellerName = process.env.ZATCA_SELLER_NAME;
  if (!vatNumber || !sellerName) return null;
  try {
    cachedConfig = ZatcaConfigSchema.parse({
      environment: process.env.ZATCA_ENVIRONMENT === "production" ? "production" : "sandbox",
      vatNumber,
      sellerName,
      branchName: process.env.ZATCA_BRANCH_NAME,
      streetAddress: process.env.ZATCA_STREET_ADDRESS,
      buildingNumber: process.env.ZATCA_BUILDING_NUMBER,
      postalCode: process.env.ZATCA_POSTAL_CODE,
      city: process.env.ZATCA_CITY,
      district: process.env.ZATCA_DISTRICT,
      industryCode: process.env.ZATCA_INDUSTRY_CODE,
      complianceCsid: process.env.ZATCA_COMPLIANCE_CSID,
      complianceSecret: process.env.ZATCA_COMPLIANCE_SECRET,
      productionCsid: process.env.ZATCA_PRODUCTION_CSID,
      productionSecret: process.env.ZATCA_PRODUCTION_SECRET,
    });
    return cachedConfig;
  } catch { return null; }
}

export function getZatcaEndpoints() {
  const config = getZatcaConfig();
  const env = config?.environment || "sandbox";
  const base = ZATCA_ENDPOINTS[env].base;
  const endpoints = ZATCA_ENDPOINTS[env];
  return {
    complianceApiUrl: `${base}${endpoints.compliance}`,
    complianceInvoicesApiUrl: `${base}${endpoints.complianceInvoices}`,
    productionCsidApiUrl: `${base}${endpoints.production}`,
    clearanceApiUrl: `${base}${endpoints.clearance}`,
    reportingApiUrl: `${base}${endpoints.reporting}`,
    compliance: `${base}${endpoints.compliance}`,
    production: `${base}${endpoints.production}`,
    clearance: `${base}${endpoints.clearance}`,
    reporting: `${base}${endpoints.reporting}`,
    timeouts: { clearanceMs: 30000, reportingMs: 30000 },
    retries: { maxAttempts: 3 as const, baseDelayMs: 1000 },
  };
}

export function isZatcaConfigured(): boolean { return getZatcaConfig() !== null; }
export function isZatcaSandbox(): boolean { return getZatcaConfig()?.environment !== "production"; }
export function getZatcaProductionCredentials(): { csid: string; secret: string } | null {
  const config = getZatcaConfig();
  if (!config?.productionCsid || !config?.productionSecret) return null;
  return { csid: config.productionCsid, secret: config.productionSecret };
}
export function getZatcaComplianceCredentials(): { csid: string; secret: string } | null {
  const config = getZatcaConfig();
  if (!config?.complianceCsid || !config?.complianceSecret) return null;
  return { csid: config.complianceCsid, secret: config.complianceSecret };
}
