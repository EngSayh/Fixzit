import { CopilotRole, CopilotSession } from "./session";

export type DataClass = "PUBLIC" | "TENANT_SCOPED" | "OWNER_SCOPED" | "FINANCE" | "HR" | "INTERNAL" | "SENSITIVE";

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
  dataClass?: DataClass;
}

const ROLE_DATA_CLASS: Record<CopilotRole, DataClass[]> = {
  SUPER_ADMIN: ["PUBLIC","TENANT_SCOPED","OWNER_SCOPED","FINANCE","HR","INTERNAL"],
  ADMIN: ["PUBLIC","TENANT_SCOPED","OWNER_SCOPED","FINANCE","INTERNAL"],
  CORPORATE_ADMIN: ["PUBLIC","TENANT_SCOPED","OWNER_SCOPED","FINANCE","INTERNAL"],
  FM_MANAGER: ["PUBLIC","TENANT_SCOPED","OWNER_SCOPED"],
  FINANCE: ["PUBLIC","TENANT_SCOPED","FINANCE"],
  HR: ["PUBLIC","TENANT_SCOPED","HR"],
  PROCUREMENT: ["PUBLIC","TENANT_SCOPED"],
  PROPERTY_MANAGER: ["PUBLIC","TENANT_SCOPED","OWNER_SCOPED"],
  EMPLOYEE: ["PUBLIC","TENANT_SCOPED"],
  TECHNICIAN: ["PUBLIC","TENANT_SCOPED"],
  VENDOR: ["PUBLIC","TENANT_SCOPED"],
  CUSTOMER: ["PUBLIC"],
  OWNER: ["PUBLIC","OWNER_SCOPED"],
  AUDITOR: ["PUBLIC","INTERNAL"],
  TENANT: ["PUBLIC","TENANT_SCOPED"],
  GUEST: ["PUBLIC"]
};

const RESTRICTED_PATTERNS: { pattern: RegExp; dataClass: DataClass; }[] = [
  { pattern: /(financial statement|income statement|owner statement|balance sheet|revenue|expense|invoice|financials?)/i, dataClass: "FINANCE" },
  { pattern: /(payroll|salary|employee compensation|hr record|leave balance)/i, dataClass: "HR" },
  { pattern: /(other tenant|another tenant|other company|different company|competitor)/i, dataClass: "SENSITIVE" },
  { pattern: /(internal document|confidential|secret|token|password|api key)/i, dataClass: "SENSITIVE" },
  { pattern: /(owner statement|owner report)/i, dataClass: "OWNER_SCOPED" },
  // Enhanced Arabic patterns for Saudi market
  { pattern: /(iqama|residence permit|national id|passport|civil id)/i, dataClass: "SENSITIVE" },
  { pattern: /(apartment|flat|unit|studio|property for rent)/i, dataClass: "PUBLIC" }, // Apartment search keywords
];

export function evaluateMessagePolicy(session: CopilotSession, text: string): PolicyDecision {
  const normalized = text.toLowerCase();

  for (const restricted of RESTRICTED_PATTERNS) {
    if (restricted.pattern.test(normalized)) {
      const permitted = ROLE_DATA_CLASS[session.role]?.includes(restricted.dataClass);
      return {
        allowed: Boolean(permitted),
        reason: permitted ? undefined :
          `This request touches ${restricted.dataClass.replace("_", " ").toLowerCase()} data that your role cannot access.`,
        dataClass: restricted.dataClass
      };
    }
  }

  return { allowed: true, dataClass: "PUBLIC" };
}

const ROLE_TOOLS: Record<CopilotRole, string[]> = {
  SUPER_ADMIN: ["createWorkOrder","listMyWorkOrders","dispatchWorkOrder","scheduleVisit","uploadWorkOrderPhoto","approveQuotation","ownerStatements"],
  ADMIN: ["createWorkOrder","listMyWorkOrders","dispatchWorkOrder","scheduleVisit","uploadWorkOrderPhoto","approveQuotation","ownerStatements"],
  CORPORATE_ADMIN: ["createWorkOrder","listMyWorkOrders","dispatchWorkOrder","scheduleVisit","uploadWorkOrderPhoto","approveQuotation","ownerStatements"],
  FM_MANAGER: ["createWorkOrder","listMyWorkOrders","dispatchWorkOrder","scheduleVisit","uploadWorkOrderPhoto","approveQuotation"],
  FINANCE: ["listMyWorkOrders","approveQuotation","ownerStatements"],
  HR: ["listMyWorkOrders"],
  PROCUREMENT: ["listMyWorkOrders","approveQuotation"],
  PROPERTY_MANAGER: ["createWorkOrder","listMyWorkOrders","dispatchWorkOrder","scheduleVisit","uploadWorkOrderPhoto","approveQuotation","ownerStatements"],
  EMPLOYEE: ["createWorkOrder","listMyWorkOrders","scheduleVisit"],
  TECHNICIAN: ["listMyWorkOrders","dispatchWorkOrder","scheduleVisit","uploadWorkOrderPhoto"],
  VENDOR: ["listMyWorkOrders","uploadWorkOrderPhoto"],
  CUSTOMER: ["createWorkOrder","listMyWorkOrders"],
  OWNER: ["listMyWorkOrders","approveQuotation","ownerStatements"],
  AUDITOR: ["listMyWorkOrders"],
  TENANT: ["createWorkOrder","listMyWorkOrders","uploadWorkOrderPhoto"],
  GUEST: []
};

export function getPermittedTools(role: CopilotRole): string[] {
  return ROLE_TOOLS[role] || [];
}

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_REGEX = /\b(\+?\d[\d\s-]{7,}\d)\b/g;
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
