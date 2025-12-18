#!/usr/bin/env tsx
/**
 * Generate client-safe RBAC constants from server canon (types/user.ts).
 * Keeps client bundles free of Mongoose/server code while staying in sync with role definitions.
 *
 * Usage:
 *   pnpm rbac:client:generate   # writes lib/rbac/client-roles.ts
 *   pnpm rbac:client:check      # exits 1 if file is out of date
 */

import fs from "fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

// Import server-side role definitions (pure constants, no Mongoose)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { UserRole, TEAM_MEMBER_SUB_ROLES } from "../../types/user";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetPath = path.resolve(__dirname, "../../lib/rbac/client-roles.ts");

const roles = Array.from(new Set(Object.values(UserRole))).filter(Boolean);
const subRoles = Array.from(new Set(TEAM_MEMBER_SUB_ROLES)).filter(Boolean);
const extraRoles = ["GUEST"];
const primaryRoles = [...roles.filter((r) => !subRoles.includes(r)), ...extraRoles];

const header = `/**
 * Client-safe RBAC definitions (generated).
 * Source of truth: types/user.ts (UserRole, TEAM_MEMBER_SUB_ROLES).
 * Do NOT import server-only modules into client bundles.
 */
`;

const fmImports =
  'import { Plan, SubmoduleKey, PLAN_GATES, inferSubRoleFromRole as inferSubRoleFromRoleV4 } from "@/domain/fm/fm.types";\n';

const enumFromArray = (name: string, values: string[]) =>
  `export enum ${name} {\n${values
    .map((v) => `  ${v} = "${v}",`)
    .join("\n")}\n}\n`;

const MODULE_KEYS = [
  "DASHBOARD",
  "WORK_ORDERS",
  "PROPERTIES",
  "FINANCE",
  "HR",
  "ADMINISTRATION",
  "CRM",
  "MARKETPLACE",
  "SUPPORT",
  "COMPLIANCE",
  "REPORTS",
  "SYSTEM_MANAGEMENT",
] as const;

const roleModulePresets: Record<string, string[]> = {
  SUPER_ADMIN: ["*"],
  CORPORATE_ADMIN: ["*"],
  ADMIN: ["*"],
  MANAGER: ["*"],
  CORPORATE_OWNER: ["*"],
  FM_MANAGER: ["DASHBOARD", "WORK_ORDERS", "PROPERTIES", "REPORTS"],
  PROPERTY_MANAGER: ["DASHBOARD", "WORK_ORDERS", "PROPERTIES", "REPORTS"],
  TECHNICIAN: ["DASHBOARD", "WORK_ORDERS", "SUPPORT", "REPORTS"],
  FINANCE: ["DASHBOARD", "FINANCE", "REPORTS"],
  FINANCE_MANAGER: ["DASHBOARD", "FINANCE", "REPORTS"],
  HR: ["DASHBOARD", "HR", "REPORTS"],
  PROCUREMENT: ["DASHBOARD", "MARKETPLACE", "SUPPORT", "REPORTS"],
  FINANCE_OFFICER: ["DASHBOARD", "FINANCE", "REPORTS"],
  HR_OFFICER: ["DASHBOARD", "HR", "REPORTS"],
  SUPPORT_AGENT: ["DASHBOARD", "SUPPORT", "CRM", "REPORTS"],
  OPERATIONS_MANAGER: [
    "DASHBOARD",
    "WORK_ORDERS",
    "PROPERTIES",
    "SUPPORT",
    "REPORTS",
  ],
  OWNER: ["DASHBOARD", "PROPERTIES", "FINANCE", "REPORTS"],
  TENANT: [
    "DASHBOARD",
    "WORK_ORDERS",
    "PROPERTIES",
    "MARKETPLACE",
    "SUPPORT",
    "REPORTS",
  ],
  VENDOR: ["DASHBOARD", "MARKETPLACE", "SUPPORT"],
  AUDITOR: ["DASHBOARD", "REPORTS"],
  CUSTOMER: ["DASHBOARD", "MARKETPLACE", "SUPPORT"],
  VIEWER: ["DASHBOARD", "REPORTS"],
  EMPLOYEE: ["DASHBOARD", "WORK_ORDERS", "SUPPORT"],
  SUPPORT: ["DASHBOARD", "SUPPORT", "CRM", "REPORTS"],
  DISPATCHER: ["DASHBOARD", "WORK_ORDERS", "SUPPORT"],
};

const aliasMap: Record<string, string> = {
  TENANT_ADMIN: "ADMIN",
  CLIENT_ADMIN: "ADMIN",
  MANAGEMENT: "MANAGER",
  FM_MANAGER: "FM_MANAGER",
  FINANCE: "FINANCE",
  HR: "HR",
  PROCUREMENT: "PROCUREMENT",
  EMPLOYEE: "EMPLOYEE",
  DISPATCHER: "DISPATCHER",
  SUPPORT: "SUPPORT",
  AUDITOR: "AUDITOR",
  VIEWER: "VIEWER",
  FIELD_ENGINEER: "TECHNICIAN",
  INTERNAL_TECHNICIAN: "TECHNICIAN",
  CONTRACTOR_TECHNICIAN: "TECHNICIAN",
  MARKETPLACE_PARTNER: "VENDOR",
  SERVICE_PROVIDER: "VENDOR",
  SUPPLIER: "VENDOR",
  PROPERTY_OWNER: "CORPORATE_OWNER",
  OWNER: "CORPORATE_OWNER",
};

const accessPrincipals = [...primaryRoles, ...subRoles];

const roleModuleLines = accessPrincipals
  .map((role) => {
    const keyExpr = subRoles.includes(role)
      ? `SubRole.${role}`
      : `Role.${role}`;
    const preset = roleModulePresets[role] ?? ["DASHBOARD"];
    const modules =
      preset.length === 1 && preset[0] === "*"
        ? "FULL_ACCESS"
        : `[${preset.map((m) => `ModuleKey.${m}`).join(", ")}]`;
    return `  [${keyExpr}]: ${modules},`;
  })
  .join("\n");

const aliasLines = Object.entries(aliasMap)
  .map(([alias, target]) => `  ${alias}: Role.${target},`)
  .concat("  GUEST: Role.GUEST,")
  .join("\n");

const content = `${header}${fmImports}
${enumFromArray("Role", primaryRoles)}
${enumFromArray("SubRole", subRoles)}

export enum ModuleKey {
${MODULE_KEYS.map((key) => `  ${key} = "${key}",`).join("\n")}
}

const FULL_ACCESS = Object.values(ModuleKey);

// Default module access per role and sub-role
const ROLE_MODULES: Record<Role | SubRole, ModuleKey[]> = {
${roleModuleLines}
} as const;

// Legacy/alias map (must stay in sync with server normalization rules)
const ALIAS_MAP: Record<string, Role> = {
${aliasLines}
};

export function normalizeRole(
  role?: string | null,
  expectedSubRole?: string | null,
  strict = false,
): Role | null {
  if (!role) return null;
  const key = role.toUpperCase();
  const normalized = ALIAS_MAP[key] ?? (Role as Record<string, Role>)[key] ?? null;
  if (strict && normalized === Role.TEAM_MEMBER && !expectedSubRole) {
    throw new Error(
      \`STRICT v4.1 violation: Role "\${role}" maps to TEAM_MEMBER but requires a subRole to be specified\`,
    );
  }
  return normalized as Role | null;
}

export function normalizeSubRole(subRole?: string | null): SubRole | null {
  if (!subRole) return null;
  const key = subRole.toUpperCase();
  return (SubRole as Record<string, SubRole>)[key] ?? null;
}

export function inferSubRoleFromRole(role?: string | Role | null): SubRole | undefined {
  if (!role) return undefined;
  const key = typeof role === "string" ? role.toUpperCase() : String(role);
  switch (key) {
    case "FINANCE":
    case "FINANCE_OFFICER":
    case "FINANCE_MANAGER":
      return SubRole.FINANCE_OFFICER;
    case "HR":
    case "HR_OFFICER":
    case "HR_MANAGER":
      return SubRole.HR_OFFICER;
    case "SUPPORT":
    case "SUPPORT_AGENT":
      return SubRole.SUPPORT_AGENT;
    case "OPERATIONS_MANAGER":
    case "DISPATCHER":
      return SubRole.OPERATIONS_MANAGER;
    default:
      return inferSubRoleFromRoleV4(role as string | null) ?? undefined;
  }
}

export function computeAllowedModules(
  role: Role | string,
  subRole?: SubRole | string | null,
): ModuleKey[] {
  const normalizedRole = normalizeRole(role) ?? Role.VIEWER;
  const normalizedSubRole = normalizeSubRole(subRole);

  const baseModules = ROLE_MODULES[normalizedRole] ?? [ModuleKey.DASHBOARD];
  if (normalizedSubRole && ROLE_MODULES[normalizedSubRole as SubRole]) {
    const subModules = ROLE_MODULES[normalizedSubRole as SubRole] ?? [];
    return [...new Set([...baseModules, ...subModules])];
  }

  return baseModules as ModuleKey[];
}

export { Plan, SubmoduleKey, PLAN_GATES };
`;

const formatted = content.replace(/\r\n/g, "\n");
const existing = fs.existsSync(targetPath)
  ? fs.readFileSync(targetPath, "utf8")
  : "";

if (process.argv.includes("--check")) {
  if (existing !== formatted) {
    console.error(
      "client-roles.ts is out of date. Run pnpm rbac:client:generate to update.",
    );
    process.exit(1);
  } else {
    console.log("client-roles.ts is up to date.");
    process.exit(0);
  }
}

fs.writeFileSync(targetPath, formatted, "utf8");
console.log(`Generated ${path.relative(process.cwd(), targetPath)}`);
