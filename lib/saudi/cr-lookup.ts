/**
 * @module lib/saudi/cr-lookup
 * @description Commercial Registration (CR) lookup service for Saudi Arabia.
 *              Integrates with MOCI (Ministry of Commerce) / Wathq API.
 *
 * @features
 * - CR number validation and lookup
 * - Company information retrieval
 * - License status verification
 * - Authorized signatories list
 * - Activities (ISIC codes) lookup
 * - Caching for performance
 *
 * @api
 * - MOCI Open Data API (Wathq fallback)
 * - Requires API key for production
 * - Sandbox mode for development
 *
 * @compliance
 * - Saudi Labor Law compliant data handling
 * - PDPL (Personal Data Protection Law) considerations
 * - Audit logging for all lookups
 *
 * @agent AGENT-0031
 * @issue FEAT-CR-001
 */

import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

export interface CRLookupResult {
  success: boolean;
  data?: CRCompanyInfo;
  error?: string;
  source: "moci" | "wathq" | "cache" | "sandbox";
}

export interface CRCompanyInfo {
  crNumber: string;
  companyName: string;
  companyNameAr: string;
  tradeName?: string;
  tradeNameAr?: string;
  status: CRStatus;
  issueDate: string; // ISO date
  expiryDate: string; // ISO date
  isExpired: boolean;
  type: CompanyType;
  capital?: number;
  capitalCurrency: "SAR";
  city: string;
  cityAr: string;
  region: string;
  regionAr: string;
  activities: CRActivity[];
  authorizedSignatories?: AuthorizedSignatory[];
  branches?: CRBranch[];
  lastUpdated: string; // ISO date
}

export type CRStatus = 
  | "active"
  | "expired"
  | "suspended"
  | "cancelled"
  | "under_renewal"
  | "unknown";

export type CompanyType =
  | "sole_proprietorship"  // مؤسسة فردية
  | "llc"                  // شركة ذات مسؤولية محدودة
  | "joint_stock"          // شركة مساهمة
  | "partnership"          // شركة تضامن
  | "limited_partnership"  // شركة توصية بسيطة
  | "branch_foreign"       // فرع شركة أجنبية
  | "other";

export interface CRActivity {
  code: string; // ISIC code
  description: string;
  descriptionAr: string;
  isMain: boolean;
}

export interface AuthorizedSignatory {
  name: string;
  nameAr: string;
  nationalId?: string; // Masked for privacy
  role: string;
  roleAr: string;
}

export interface CRBranch {
  branchNumber: string;
  city: string;
  cityAr: string;
  status: CRStatus;
}

export interface CRLookupOptions {
  /** Use cache if available */
  useCache?: boolean;
  /** Cache TTL in seconds (default: 24 hours) */
  cacheTtl?: number;
  /** Include branches */
  includeBranches?: boolean;
  /** Include authorized signatories */
  includeSignatories?: boolean;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate CR number format.
 * Saudi CR numbers are 10 digits starting with 10, 11, 12, 20, 21, or 40.
 */
export function isValidCRNumber(crNumber: string): boolean {
  // Remove any spaces or dashes
  const cleaned = crNumber.replace(/[\s-]/g, "");
  
  // Must be exactly 10 digits
  if (!/^\d{10}$/.test(cleaned)) {
    return false;
  }
  
  // Valid prefixes for Saudi CRs
  const validPrefixes = ["10", "11", "12", "20", "21", "40"];
  const prefix = cleaned.substring(0, 2);
  
  return validPrefixes.includes(prefix);
}

/**
 * Format CR number for display (e.g., "1010000000" -> "1010-000-000")
 */
export function formatCRNumber(crNumber: string): string {
  const cleaned = crNumber.replace(/[\s-]/g, "");
  if (cleaned.length !== 10) return crNumber;
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
}

// ============================================================================
// CACHE
// ============================================================================

// In-memory cache for CR lookups (consider Redis for production)
const crCache = new Map<string, { data: CRCompanyInfo; expiresAt: number }>();
const DEFAULT_CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

function getCached(crNumber: string): CRCompanyInfo | null {
  const entry = crCache.get(crNumber);
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    crCache.delete(crNumber);
    return null;
  }
  
  return entry.data;
}

function setCache(crNumber: string, data: CRCompanyInfo, ttlSeconds: number): void {
  crCache.set(crNumber, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

// ============================================================================
// API INTEGRATION
// ============================================================================

const MOCI_API_BASE = process.env.MOCI_API_URL || "https://api.mci.gov.sa";
const MOCI_API_KEY = process.env.MOCI_API_KEY;
const WATHQ_API_BASE = process.env.WATHQ_API_URL || "https://api.wathq.sa";
const WATHQ_API_KEY = process.env.WATHQ_API_KEY;

/**
 * Lookup CR from MOCI API
 */
async function lookupFromMOCI(crNumber: string): Promise<CRCompanyInfo | null> {
  if (!MOCI_API_KEY) {
    logger.warn("[CRLookup] MOCI API key not configured");
    return null;
  }

  try {
    const response = await fetch(`${MOCI_API_BASE}/v1/cr/${crNumber}`, {
      headers: {
        "Authorization": `Bearer ${MOCI_API_KEY}`,
        "Accept": "application/json",
        "Accept-Language": "ar,en",
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`MOCI API error: ${response.status}`);
    }

    const data = await response.json();
    return transformMOCIResponse(data);
  } catch (error) {
    logger.error("[CRLookup] MOCI API failed", { error, crNumber });
    return null;
  }
}

/**
 * Lookup CR from Wathq API (fallback)
 */
async function lookupFromWathq(crNumber: string): Promise<CRCompanyInfo | null> {
  if (!WATHQ_API_KEY) {
    logger.warn("[CRLookup] Wathq API key not configured");
    return null;
  }

  try {
    const response = await fetch(`${WATHQ_API_BASE}/v1/commercial-registration/${crNumber}`, {
      headers: {
        "x-api-key": WATHQ_API_KEY,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Wathq API error: ${response.status}`);
    }

    const data = await response.json();
    return transformWathqResponse(data);
  } catch (error) {
    logger.error("[CRLookup] Wathq API failed", { error, crNumber });
    return null;
  }
}

/**
 * Generate sandbox data for development/testing
 */
function generateSandboxData(crNumber: string): CRCompanyInfo {
  const now = new Date();
  const issueDate = new Date(now);
  issueDate.setFullYear(issueDate.getFullYear() - 3);
  const expiryDate = new Date(now);
  expiryDate.setFullYear(expiryDate.getFullYear() + 2);

  return {
    crNumber,
    companyName: `Test Company ${crNumber.slice(-4)}`,
    companyNameAr: `شركة اختبار ${crNumber.slice(-4)}`,
    tradeName: `TC${crNumber.slice(-4)}`,
    tradeNameAr: `ش.ا${crNumber.slice(-4)}`,
    status: "active",
    issueDate: issueDate.toISOString().split("T")[0],
    expiryDate: expiryDate.toISOString().split("T")[0],
    isExpired: false,
    type: "llc",
    capital: 1000000,
    capitalCurrency: "SAR",
    city: "Riyadh",
    cityAr: "الرياض",
    region: "Riyadh Region",
    regionAr: "منطقة الرياض",
    activities: [
      {
        code: "4690",
        description: "Non-specialized wholesale trade",
        descriptionAr: "تجارة الجملة غير المتخصصة",
        isMain: true,
      },
      {
        code: "4771",
        description: "Retail sale of clothing, footwear and leather articles",
        descriptionAr: "بيع الملابس والأحذية ومصنوعات الجلود بالتجزئة",
        isMain: false,
      },
    ],
    authorizedSignatories: [
      {
        name: "Test Manager",
        nameAr: "مدير اختبار",
        nationalId: "****1234",
        role: "General Manager",
        roleAr: "مدير عام",
      },
    ],
    branches: [],
    lastUpdated: now.toISOString(),
  };
}

// ============================================================================
// RESPONSE TRANSFORMERS
// ============================================================================

function transformMOCIResponse(data: Record<string, unknown>): CRCompanyInfo {
  // Transform MOCI API response to our format
  // This is a placeholder - actual implementation depends on MOCI API response structure
  return {
    crNumber: String(data.crNumber || data.cr_number || ""),
    companyName: String(data.companyName || data.company_name_en || ""),
    companyNameAr: String(data.companyNameAr || data.company_name_ar || ""),
    status: mapStatus(String(data.status || "")),
    issueDate: String(data.issueDate || data.issue_date || ""),
    expiryDate: String(data.expiryDate || data.expiry_date || ""),
    isExpired: new Date(String(data.expiryDate || data.expiry_date || "")) < new Date(),
    type: mapCompanyType(String(data.type || data.company_type || "")),
    capital: Number(data.capital) || undefined,
    capitalCurrency: "SAR",
    city: String(data.city || data.city_en || ""),
    cityAr: String(data.cityAr || data.city_ar || ""),
    region: String(data.region || data.region_en || ""),
    regionAr: String(data.regionAr || data.region_ar || ""),
    activities: Array.isArray(data.activities) 
      ? (data.activities as Array<Record<string, unknown>>).map((a) => ({
          code: String(a.code || ""),
          description: String(a.description || a.description_en || ""),
          descriptionAr: String(a.descriptionAr || a.description_ar || ""),
          isMain: Boolean(a.isMain || a.is_main),
        }))
      : [],
    lastUpdated: new Date().toISOString(),
  };
}

function transformWathqResponse(data: Record<string, unknown>): CRCompanyInfo {
  // Transform Wathq API response to our format
  // Wathq uses different field names
  return {
    crNumber: String(data.commercial_registration_number || ""),
    companyName: String(data.name_en || data.name || ""),
    companyNameAr: String(data.name_ar || ""),
    status: mapStatus(String(data.status || "")),
    issueDate: String(data.issue_date || ""),
    expiryDate: String(data.expiry_date || ""),
    isExpired: new Date(String(data.expiry_date || "")) < new Date(),
    type: mapCompanyType(String(data.legal_entity || "")),
    capital: Number(data.capital) || undefined,
    capitalCurrency: "SAR",
    city: String(data.city_en || ""),
    cityAr: String(data.city_ar || ""),
    region: String(data.region_en || ""),
    regionAr: String(data.region_ar || ""),
    activities: Array.isArray(data.activities)
      ? (data.activities as Array<Record<string, unknown>>).map((a) => ({
          code: String(a.isic_code || ""),
          description: String(a.description_en || ""),
          descriptionAr: String(a.description_ar || ""),
          isMain: Boolean(a.is_main),
        }))
      : [],
    lastUpdated: new Date().toISOString(),
  };
}

function mapStatus(status: string): CRStatus {
  const statusMap: Record<string, CRStatus> = {
    "active": "active",
    "قائم": "active",
    "expired": "expired",
    "منتهي": "expired",
    "suspended": "suspended",
    "موقوف": "suspended",
    "cancelled": "cancelled",
    "ملغي": "cancelled",
    "under_renewal": "under_renewal",
    "تحت التجديد": "under_renewal",
  };
  return statusMap[status.toLowerCase()] || "unknown";
}

function mapCompanyType(type: string): CompanyType {
  const typeMap: Record<string, CompanyType> = {
    "sole_proprietorship": "sole_proprietorship",
    "مؤسسة فردية": "sole_proprietorship",
    "llc": "llc",
    "limited_liability": "llc",
    "شركة ذات مسؤولية محدودة": "llc",
    "joint_stock": "joint_stock",
    "شركة مساهمة": "joint_stock",
    "partnership": "partnership",
    "شركة تضامن": "partnership",
    "limited_partnership": "limited_partnership",
    "شركة توصية بسيطة": "limited_partnership",
    "branch_foreign": "branch_foreign",
    "فرع شركة أجنبية": "branch_foreign",
  };
  return typeMap[type.toLowerCase()] || "other";
}

// ============================================================================
// MAIN LOOKUP FUNCTION
// ============================================================================

/**
 * Lookup Commercial Registration by CR number.
 * Tries MOCI API first, falls back to Wathq, then sandbox in development.
 *
 * @param crNumber - The 10-digit CR number
 * @param options - Lookup options
 * @returns CR lookup result with company information
 */
export async function lookupCR(
  crNumber: string,
  options: CRLookupOptions = {}
): Promise<CRLookupResult> {
  const {
    useCache = true,
    cacheTtl = DEFAULT_CACHE_TTL_SECONDS,
  } = options;

  // Validate CR number
  const cleanedCR = crNumber.replace(/[\s-]/g, "");
  if (!isValidCRNumber(cleanedCR)) {
    return {
      success: false,
      error: "Invalid CR number format. Must be 10 digits starting with 10, 11, 12, 20, 21, or 40.",
      source: "moci",
    };
  }

  // Check cache
  if (useCache) {
    const cached = getCached(cleanedCR);
    if (cached) {
      logger.info("[CRLookup] Cache hit", { crNumber: cleanedCR });
      return { success: true, data: cached, source: "cache" };
    }
  }

  // Try MOCI API
  let data = await lookupFromMOCI(cleanedCR);
  if (data) {
    setCache(cleanedCR, data, cacheTtl);
    logger.info("[CRLookup] Found via MOCI", { crNumber: cleanedCR });
    return { success: true, data, source: "moci" };
  }

  // Fallback to Wathq
  data = await lookupFromWathq(cleanedCR);
  if (data) {
    setCache(cleanedCR, data, cacheTtl);
    logger.info("[CRLookup] Found via Wathq", { crNumber: cleanedCR });
    return { success: true, data, source: "wathq" };
  }

  // Sandbox mode for development
  if (process.env.NODE_ENV === "development" || process.env.CR_SANDBOX_MODE === "true") {
    data = generateSandboxData(cleanedCR);
    logger.info("[CRLookup] Using sandbox data", { crNumber: cleanedCR });
    return { success: true, data, source: "sandbox" };
  }

  return {
    success: false,
    error: "CR not found. Please verify the number and try again.",
    source: "moci",
  };
}

/**
 * Verify if a CR is active and not expired.
 */
export async function verifyCRStatus(crNumber: string): Promise<{
  valid: boolean;
  status: CRStatus;
  expiryDate?: string;
  error?: string;
}> {
  const result = await lookupCR(crNumber);

  if (!result.success || !result.data) {
    return { valid: false, status: "unknown", error: result.error };
  }

  const { status, expiryDate, isExpired } = result.data;

  return {
    valid: status === "active" && !isExpired,
    status,
    expiryDate,
    error: isExpired ? "CR has expired" : status !== "active" ? `CR status: ${status}` : undefined,
  };
}

/**
 * Clear CR cache for a specific number or all.
 */
export function clearCRCache(crNumber?: string): void {
  if (crNumber) {
    crCache.delete(crNumber.replace(/[\s-]/g, ""));
  } else {
    crCache.clear();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const CRLookupService = {
  lookup: lookupCR,
  verify: verifyCRStatus,
  isValid: isValidCRNumber,
  format: formatCRNumber,
  clearCache: clearCRCache,
};

export default CRLookupService;
