import { CopilotRole, CopilotSession } from "./session";

export type DataClass =
  | "PUBLIC"
  | "TENANT_SCOPED"
  | "OWNER_SCOPED"
  | "FINANCE"
  | "HR"
  | "INTERNAL"
  | "SENSITIVE";

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  dataClass?: DataClass;
}

/**
 * ROLE_DATA_CLASS - 🔒 STRICT v4.1 COMPLIANT
 * Maps roles to their permitted data classification levels.
 * Includes both canonical roles and legacy aliases.
 */
const ROLE_DATA_CLASS: Record<CopilotRole, DataClass[]> = {
  // Canonical STRICT v4.1 roles
  SUPER_ADMIN: [
    "PUBLIC",
    "TENANT_SCOPED",
    "OWNER_SCOPED",
    "FINANCE",
    "HR",
    "INTERNAL",
  ],
  ADMIN: ["PUBLIC", "TENANT_SCOPED", "OWNER_SCOPED", "FINANCE", "INTERNAL"],
  CORPORATE_OWNER: ["PUBLIC", "OWNER_SCOPED", "FINANCE"], // Canonical (was OWNER)
  TEAM_MEMBER: ["PUBLIC", "TENANT_SCOPED"], // Canonical base for specialized staff
  TECHNICIAN: ["PUBLIC", "TENANT_SCOPED"],
  PROPERTY_MANAGER: ["PUBLIC", "TENANT_SCOPED", "OWNER_SCOPED"],
  TENANT: ["PUBLIC", "TENANT_SCOPED"],
  VENDOR: ["PUBLIC", "TENANT_SCOPED"],
  GUEST: ["PUBLIC"],
  // Legacy aliases (kept for backward compatibility)
  CORPORATE_ADMIN: [
    "PUBLIC",
    "TENANT_SCOPED",
    "OWNER_SCOPED",
    "FINANCE",
    "INTERNAL",
  ], // → ADMIN
  FM_MANAGER: ["PUBLIC", "TENANT_SCOPED", "OWNER_SCOPED"], // → PROPERTY_MANAGER
  FINANCE: ["PUBLIC", "TENANT_SCOPED", "FINANCE"], // → TEAM_MEMBER + FINANCE_OFFICER
  HR: ["PUBLIC", "TENANT_SCOPED", "HR"], // → TEAM_MEMBER + HR_OFFICER
  PROCUREMENT: ["PUBLIC", "TENANT_SCOPED"], // → TEAM_MEMBER
  EMPLOYEE: ["PUBLIC", "TENANT_SCOPED"], // → TEAM_MEMBER
  CUSTOMER: ["PUBLIC"], // → TENANT
  OWNER: ["PUBLIC", "OWNER_SCOPED", "FINANCE"], // → CORPORATE_OWNER
  AUDITOR: ["PUBLIC", "INTERNAL"], // → GUEST
};

const RESTRICTED_PATTERNS: { pattern: RegExp; dataClass: DataClass }[] = [
  // OWNER_SCOPED must come before FINANCE to match "owner statement" correctly
  { pattern: /(owner statement|owner report)/i, dataClass: "OWNER_SCOPED" },
  {
    pattern:
      /(financial statement|income statement|balance sheet|revenue|expense|invoice|financials?)/i,
    dataClass: "FINANCE",
  },
  {
    pattern: /(payroll|salary|employee compensation|hr record|leave balance)/i,
    dataClass: "HR",
  },
  {
    pattern:
      /(other tenant|another tenant|other company|different company|competitor)/i,
    dataClass: "SENSITIVE",
  },
  {
    pattern: /(internal document|confidential|secret|token|password|api key)/i,
    dataClass: "SENSITIVE",
  },
  // Note: OWNER_SCOPED pattern is at the top of the list to match before FINANCE
  // Enhanced Arabic patterns for Saudi market
  {
    pattern: /(iqama|residence permit|national id|passport|civil id)/i,
    dataClass: "SENSITIVE",
  },
  {
    pattern: /(apartment|flat|unit|studio|property for rent)/i,
    dataClass: "PUBLIC",
  }, // Apartment search keywords
];

export function evaluateMessagePolicy(
  session: CopilotSession,
  text: string,
): PolicyDecision {
  const normalized = text.toLowerCase();

  for (const restricted of RESTRICTED_PATTERNS) {
    if (restricted.pattern.test(normalized)) {
      const permitted = ROLE_DATA_CLASS[session.role]?.includes(
        restricted.dataClass,
      );
      return {
        allowed: Boolean(permitted),
        reason: permitted
          ? undefined
          : `This request touches ${restricted.dataClass.replace("_", " ").toLowerCase()} data that your role cannot access.`,
        dataClass: restricted.dataClass,
      };
    }
  }

  return { allowed: true, dataClass: "PUBLIC" };
}

/**
 * ROLE_TOOLS - 🔒 STRICT v4.1 COMPLIANT
 * Maps roles to their permitted AI tools.
 * Includes both canonical roles and legacy aliases.
 */
const ROLE_TOOLS: Record<CopilotRole, string[]> = {
  // Canonical STRICT v4.1 roles
  SUPER_ADMIN: [
    "createWorkOrder",
    "listMyWorkOrders",
    "dispatchWorkOrder",
    "scheduleVisit",
    "uploadWorkOrderPhoto",
    "approveQuotation",
    "ownerStatements",
  ],
  ADMIN: [
    "createWorkOrder",
    "listMyWorkOrders",
    "dispatchWorkOrder",
    "scheduleVisit",
    "uploadWorkOrderPhoto",
    "approveQuotation",
    "ownerStatements",
  ],
  CORPORATE_OWNER: ["listMyWorkOrders", "approveQuotation", "ownerStatements"], // Canonical (was OWNER)
  TEAM_MEMBER: ["createWorkOrder", "listMyWorkOrders", "scheduleVisit"], // Canonical base
  TECHNICIAN: [
    "listMyWorkOrders",
    "dispatchWorkOrder",
    "scheduleVisit",
    "uploadWorkOrderPhoto",
  ],
  PROPERTY_MANAGER: [
    "createWorkOrder",
    "listMyWorkOrders",
    "dispatchWorkOrder",
    "scheduleVisit",
    "uploadWorkOrderPhoto",
    "approveQuotation",
    "ownerStatements",
  ],
  TENANT: ["createWorkOrder", "listMyWorkOrders", "uploadWorkOrderPhoto"],
  VENDOR: ["listMyWorkOrders", "uploadWorkOrderPhoto"],
  GUEST: [],
  // Legacy aliases (kept for backward compatibility)
  CORPORATE_ADMIN: [
    "createWorkOrder",
    "listMyWorkOrders",
    "dispatchWorkOrder",
    "scheduleVisit",
    "uploadWorkOrderPhoto",
    "approveQuotation",
    "ownerStatements",
  ], // → ADMIN
  FM_MANAGER: [
    "createWorkOrder",
    "listMyWorkOrders",
    "dispatchWorkOrder",
    "scheduleVisit",
    "uploadWorkOrderPhoto",
    "approveQuotation",
  ], // → PROPERTY_MANAGER
  FINANCE: ["listMyWorkOrders", "approveQuotation", "ownerStatements"], // → TEAM_MEMBER + FINANCE_OFFICER
  HR: ["listMyWorkOrders"], // → TEAM_MEMBER + HR_OFFICER
  PROCUREMENT: ["listMyWorkOrders", "approveQuotation"], // → TEAM_MEMBER
  EMPLOYEE: ["createWorkOrder", "listMyWorkOrders", "scheduleVisit"], // → TEAM_MEMBER
  CUSTOMER: ["createWorkOrder", "listMyWorkOrders"], // → TENANT
  OWNER: ["listMyWorkOrders", "approveQuotation", "ownerStatements"], // → CORPORATE_OWNER
  AUDITOR: ["listMyWorkOrders"], // → GUEST
};

export function getPermittedTools(role: CopilotRole): string[] {
  return ROLE_TOOLS[role] || [];
}

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_REGEX = /\b(\+?\d[\d\s-]{7,}\d)\b/g;
// Saudi IBAN format: SA + 2 check digits + 2 bank code + 18 account digits = 24 chars total
const IBAN_REGEX = /SA\d{2}[A-Z0-9]{2}\d{18}/gi;
// Enhanced: Saudi National ID (10 digits starting with 1 or 2)
const SAUDI_ID_REGEX = /\b[12]\d{9}\b/g;
// Iqama/Residence ID (10 digits)
const IQAMA_REGEX = /\b\d{10}\b/g;

export function redactSensitiveText(input: string): string {
  return input
    .replace(EMAIL_REGEX, "[redacted-email]")
    .replace(PHONE_REGEX, "[redacted-phone]")
    .replace(IBAN_REGEX, "[redacted-iban]")
    .replace(SAUDI_ID_REGEX, "[redacted-national-id]")
    .replace(IQAMA_REGEX, "[redacted-id]");
}

export function describeDataClass(dataClass?: DataClass) {
  switch (dataClass) {
    case "TENANT_SCOPED":
      return "tenant-specific";
    case "OWNER_SCOPED":
      return "owner portfolio";
    case "FINANCE":
      return "financial";
    case "HR":
      return "HR";
    case "SENSITIVE":
      return "sensitive";
    default:
      return "public";
  }
}
