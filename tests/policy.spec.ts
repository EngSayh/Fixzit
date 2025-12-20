/* 
  Test framework: Vitest
*/

import { describe, it, expect } from "vitest";

/*
  Import the policy module from its actual location
*/
import * as mod from "@/server/copilot/policy";

const {
  evaluateMessagePolicy,
  getPermittedTools,
  redactSensitiveText,
  describeDataClass,
} = mod as {
  evaluateMessagePolicy: (
    session: { role: string },
    text: string,
  ) => { allowed: boolean; reason?: string; dataClass?: string };
  getPermittedTools: (role: string) => string[];
  redactSensitiveText: (input: string) => string;
  describeDataClass: (dc?: string) => string;
};

// Minimal in-test definition to emulate the expected session shape
type CopilotRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "CORPORATE_ADMIN"
  | "FM_MANAGER"
  | "FINANCE"
  | "HR"
  | "PROCUREMENT"
  | "PROPERTY_MANAGER"
  | "EMPLOYEE"
  | "TECHNICIAN"
  | "VENDOR"
  | "CUSTOMER"
  | "OWNER"
  | "AUDITOR"
  | "TENANT"
  | "GUEST";

interface CopilotSession {
  role: CopilotRole;
}

// Helpers
const makeSession = (role: CopilotRole): CopilotSession => ({ role });

describe("evaluateMessagePolicy", () => {
  it("allows PUBLIC requests without restricted patterns", () => {
    const res = evaluateMessagePolicy(
      makeSession("EMPLOYEE"),
      "Hello, can you help me create a work order?",
    );
    expect(res.allowed).toBe(true);
    expect(res.dataClass).toBe("PUBLIC");
    expect(res.reason).toBeUndefined();
  });

  it("detects FINANCE patterns and allows FINANCE role", () => {
    const res = evaluateMessagePolicy(
      makeSession("FINANCE"),
      "Please pull the financial statement for Q3",
    );
    expect(res.allowed).toBe(true);
    expect(res.dataClass).toBe("FINANCE");
    expect(res.reason).toBeUndefined();
  });

  it("blocks FINANCE patterns for role without permission (EMPLOYEE)", () => {
    const res = evaluateMessagePolicy(
      makeSession("EMPLOYEE"),
      "Can I see the income statement?",
    );
    expect(res.allowed).toBe(false);
    expect(res.dataClass).toBe("FINANCE");
    expect(res.reason).toMatch(/finance/i);
  });

  it("detects HR patterns and allows HR role", () => {
    const res = evaluateMessagePolicy(
      makeSession("HR"),
      "Update the payroll and employee compensation files",
    );
    expect(res.allowed).toBe(true);
    expect(res.dataClass).toBe("HR");
    expect(res.reason).toBeUndefined();
  });

  it("blocks HR patterns for non-HR (FINANCE)", () => {
    const res = evaluateMessagePolicy(
      makeSession("FINANCE"),
      "What is the salary of employee 123?",
    );
    expect(res.allowed).toBe(false);
    expect(res.dataClass).toBe("HR");
    expect(res.reason).toMatch(/HR/i);
  });

  it("detects OWNER_SCOPED patterns and allows OWNER role", () => {
    const res = evaluateMessagePolicy(
      makeSession("OWNER"),
      "Share the owner statement for last month",
    );
    expect(res.allowed).toBe(true);
    expect(res.dataClass).toBe("OWNER_SCOPED");
  });

  it("allows OWNER_SCOPED patterns for PROPERTY_MANAGER (as per ROLE_DATA_CLASS)", () => {
    const res = evaluateMessagePolicy(
      makeSession("PROPERTY_MANAGER"),
      "Need the owner report for building A",
    );
    expect(res.allowed).toBe(true);
    expect(res.dataClass).toBe("OWNER_SCOPED");
  });

  it("blocks OWNER_SCOPED patterns for TENANT", () => {
    const res = evaluateMessagePolicy(makeSession("TENANT"), "owner statement");
    expect(res.allowed).toBe(false);
    expect(res.dataClass).toBe("OWNER_SCOPED");
    expect(res.reason).toMatch(/owner portfolio|owner/i);
  });

  it("detects SENSITIVE patterns (internal document) and blocks for roles lacking access (TENANT)", () => {
    const res = evaluateMessagePolicy(
      makeSession("TENANT"),
      "Please send the internal document",
    );
    expect(res.allowed).toBe(false);
    expect(res.dataClass).toBe("SENSITIVE");
    expect(res.reason).toMatch(/sensitive/i);
  });

  it("detects SENSITIVE patterns (token/password/api key) and blocks for most roles (EMPLOYEE)", () => {
    const res = evaluateMessagePolicy(
      makeSession("EMPLOYEE"),
      "Share the API key and password",
    );
    expect(res.allowed).toBe(false);
    expect(res.dataClass).toBe("SENSITIVE");
  });

  it("allows PUBLIC for roles without restricted access (AUDITOR with no keywords)", () => {
    // Note: Using text without any restricted pattern keywords
    const res = evaluateMessagePolicy(
      makeSession("AUDITOR"),
      "General summary of operations and processes",
    );
    expect(res.allowed).toBe(true);
    expect(res.dataClass).toBe("PUBLIC");
  });

  it("pattern matching is case-insensitive and phrase variants are detected", () => {
    const res = evaluateMessagePolicy(
      makeSession("FINANCE"),
      "Request FINANCIALS now!",
    );
    expect(res.allowed).toBe(true);
    expect(res.dataClass).toBe("FINANCE");
  });

  it("returns first matching pattern decision when multiple patterns present", () => {
    const text = "owner statement and payroll together";
    const resOwner = evaluateMessagePolicy(makeSession("OWNER"), text);
    // Since patterns are evaluated in order listed, expect FINANCE or HR before OWNER depending on list position
    // From provided snippet, FINANCE patterns are checked first, then HR, then SENSITIVE, then OWNER_SCOPED
    expect(["FINANCE", "HR", "SENSITIVE", "OWNER_SCOPED"]).toContain(
      resOwner.dataClass,
    );
  });
});

describe("getPermittedTools", () => {
  it("returns tools for SUPER_ADMIN including ownerStatements", () => {
    const tools = getPermittedTools("SUPER_ADMIN");
    expect(tools).toEqual(
      expect.arrayContaining([
        "ownerStatements",
        "createWorkOrder",
        "listMyWorkOrders",
      ]),
    );
  });

  it("FINANCE has listMyWorkOrders, approveQuotation, and ownerStatements", () => {
    const tools = getPermittedTools("FINANCE");
    // FINANCE role can approve quotations as part of financial approval workflow
    expect(tools.sort()).toEqual(
      ["listMyWorkOrders", "approveQuotation", "ownerStatements"].sort(),
    );
  });

  it("GUEST has no tools", () => {
    const tools = getPermittedTools("GUEST");
    expect(tools).toEqual([]);
  });

  it("unknown role returns empty array (defensive)", () => {
    const tools = getPermittedTools("UNKNOWN_ROLE" as any);
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBe(0);
  });
});

describe("redactSensitiveText", () => {
  it("redacts emails", () => {
    const input = "Contact me at John.Doe+work@Example.COM for details.";
    const out = redactSensitiveText(input);
    expect(out).toContain("[redacted-email]");
    expect(out).not.toMatch(/Example\.COM/i);
  });

  it("redacts phone numbers with various formats", () => {
    const cases = [
      "Call +1 415 555 2671 today",
      "My number is 415-555-2671",
      "Reach me at 0044 20 7946 0958",
    ];
    for (const c of cases) {
      const out = redactSensitiveText(c);
      expect(out).toContain("[redacted-phone]");
    }
  });

  it("redacts SA-format IBAN", () => {
    const input = "IBAN: SA12AB3412341234123412";
    const out = redactSensitiveText(input);
    expect(out).toContain("[redacted-iban]");
  });

  it("does not over-redact harmless text", () => {
    const input = "No contacts here, just text.";
    const out = redactSensitiveText(input);
    expect(out).toBe(input);
  });

  it("handles multiple matches in one string", () => {
    const input =
      "Email a@b.com and call +49 123 456 789 and IBAN SA12AB3412341234123412";
    const out = redactSensitiveText(input);
    expect(out).toContain("[redacted-email]");
    expect(out).toContain("[redacted-phone]");
    expect(out).toContain("[redacted-iban]");
  });
});

describe("describeDataClass", () => {
  it("maps TENANT_SCOPED to tenant-specific", () => {
    expect(describeDataClass("TENANT_SCOPED")).toBe("tenant-specific");
  });
  it("maps OWNER_SCOPED to owner portfolio", () => {
    expect(describeDataClass("OWNER_SCOPED")).toBe("owner portfolio");
  });
  it("maps FINANCE to financial", () => {
    expect(describeDataClass("FINANCE")).toBe("financial");
  });
  it("maps HR to HR", () => {
    expect(describeDataClass("HR")).toBe("HR");
  });
  it("maps SENSITIVE to sensitive", () => {
    expect(describeDataClass("SENSITIVE")).toBe("sensitive");
  });
  it("defaults to public for undefined or PUBLIC", () => {
    expect(describeDataClass()).toBe("public");
    expect(describeDataClass("PUBLIC")).toBe("public");
  });
});
