#!/usr/bin/env npx tsx
/**
 * RBAC Parity Lint Script
 * 
 * Validates that RBAC matrices are aligned across:
 * - domain/fm/fm.behavior.ts (server)
 * - domain/fm/fm.types.ts (client/shared)
 * - domain/fm/fm-lite.ts (client-safe façade)
 * 
 * Run: pnpm lint:rbac or npx tsx scripts/lint-rbac-parity.ts
 * 
 * This prevents drift between server and client RBAC definitions.
 */

import {
  Role,
  SubRole,
  ModuleKey,
  ROLE_MODULE_ACCESS as SERVER_ROLE_MODULE_ACCESS,
  ROLE_ACTIONS as SERVER_ROLE_ACTIONS,
  SUB_ROLE_ACTIONS as SERVER_SUB_ROLE_ACTIONS,
  SUBMODULE_REQUIRED_SUBROLE as SERVER_SUBMODULE_REQUIRED_SUBROLE,
  PLAN_GATES as SERVER_PLAN_GATES,
  computeAllowedModules as serverComputeAllowedModules,
} from "../domain/fm/fm.behavior";

import {
  ROLE_MODULE_ACCESS as CLIENT_ROLE_MODULE_ACCESS,
  ROLE_ACTIONS as CLIENT_ROLE_ACTIONS,
  SUB_ROLE_ACTIONS as CLIENT_SUB_ROLE_ACTIONS,
  SUBMODULE_REQUIRED_SUBROLE as CLIENT_SUBMODULE_REQUIRED_SUBROLE,
  PLAN_GATES as CLIENT_PLAN_GATES,
  computeAllowedModules as clientComputeAllowedModules,
} from "../domain/fm/fm.types";

import {
  ROLE_MODULES as LITE_ROLE_MODULES,
  PLAN_GATES as LITE_PLAN_GATES,
  ROLE_ACTIONS as LITE_ROLE_ACTIONS,
  SUB_ROLE_ACTIONS as LITE_SUB_ROLE_ACTIONS,
  SUBMODULE_REQUIRED_SUBROLE as LITE_SUBMODULE_REQUIRED_SUBROLE,
  computeAllowedModules as liteComputeAllowedModules,
} from "../domain/fm/fm-lite";

interface ParityError {
  category: string;
  message: string;
  details?: string;
}

const errors: ParityError[] = [];

function logError(category: string, message: string, details?: string) {
  errors.push({ category, message, details });
  console.error(`❌ [${category}] ${message}${details ? `\n   Details: ${details}` : ""}`);
}

function logSuccess(message: string) {
  console.log(`✅ ${message}`);
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

function objectsEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  if (!arraysEqual(keysA, keysB)) return false;
  return keysA.every((key) => JSON.stringify(a[key]) === JSON.stringify(b[key]));
}

// ============================================
// 1. ROLE_MODULE_ACCESS Parity (Server vs Client)
// ============================================
function checkRoleModuleAccessParity() {
  console.log("\n📋 Checking ROLE_MODULE_ACCESS parity (server vs client)...");
  
  const serverRoles = Object.keys(SERVER_ROLE_MODULE_ACCESS).sort();
  const clientRoles = Object.keys(CLIENT_ROLE_MODULE_ACCESS).sort();
  
  if (!arraysEqual(serverRoles, clientRoles)) {
    logError("ROLE_MODULE_ACCESS", "Role keys mismatch", 
      `Server: ${serverRoles.join(", ")}\nClient: ${clientRoles.join(", ")}`);
  } else {
    logSuccess("ROLE_MODULE_ACCESS role keys match");
  }
  
  // Check each role's module access
  for (const role of Object.values(Role)) {
    const serverAccess = SERVER_ROLE_MODULE_ACCESS[role] || {};
    const clientAccess = CLIENT_ROLE_MODULE_ACCESS[role] || {};
    
    if (!objectsEqual(serverAccess as Record<string, unknown>, clientAccess as Record<string, unknown>)) {
      logError("ROLE_MODULE_ACCESS", `Role ${role} module access mismatch`,
        `Server: ${JSON.stringify(serverAccess)}\nClient: ${JSON.stringify(clientAccess)}`);
    }
  }
}

// ============================================
// 2. ROLE_ACTIONS Parity (Server vs Client)
// ============================================
function checkRoleActionsParity() {
  console.log("\n📋 Checking ROLE_ACTIONS parity (server vs client)...");
  
  for (const role of Object.values(Role)) {
    const serverActions = SERVER_ROLE_ACTIONS[role] || {};
    const clientActions = CLIENT_ROLE_ACTIONS[role] || {};
    
    const serverKeys = Object.keys(serverActions).sort();
    const clientKeys = Object.keys(clientActions).sort();
    
    if (!arraysEqual(serverKeys, clientKeys)) {
      logError("ROLE_ACTIONS", `Role ${role} submodule keys mismatch`,
        `Server: ${serverKeys.join(", ")}\nClient: ${clientKeys.join(", ")}`);
    } else {
      // Check action arrays for each submodule
      for (const submodule of serverKeys) {
        const serverActionList = (serverActions as Record<string, string[]>)[submodule] || [];
        const clientActionList = (clientActions as Record<string, string[]>)[submodule] || [];
        
        if (!arraysEqual(serverActionList, clientActionList)) {
          logError("ROLE_ACTIONS", `Role ${role} actions for ${submodule} mismatch`,
            `Server: ${serverActionList.join(", ")}\nClient: ${clientActionList.join(", ")}`);
        }
      }
    }
  }
  
  if (!errors.some(e => e.category === "ROLE_ACTIONS")) {
    logSuccess("ROLE_ACTIONS fully aligned");
  }
}

// ============================================
// 3. SUB_ROLE_ACTIONS Parity
// ============================================
function checkSubRoleActionsParity() {
  console.log("\n📋 Checking SUB_ROLE_ACTIONS parity (server vs client)...");
  
  for (const subRole of Object.values(SubRole)) {
    const serverActions = SERVER_SUB_ROLE_ACTIONS[subRole] || {};
    const clientActions = CLIENT_SUB_ROLE_ACTIONS[subRole] || {};
    
    if (!objectsEqual(serverActions as Record<string, unknown>, clientActions as Record<string, unknown>)) {
      logError("SUB_ROLE_ACTIONS", `SubRole ${subRole} mismatch`,
        `Server: ${JSON.stringify(serverActions)}\nClient: ${JSON.stringify(clientActions)}`);
    }
  }
  
  if (!errors.some(e => e.category === "SUB_ROLE_ACTIONS")) {
    logSuccess("SUB_ROLE_ACTIONS fully aligned");
  }
}

// ============================================
// 4. SUBMODULE_REQUIRED_SUBROLE Parity
// ============================================
function checkSubmoduleRequiredSubroleParity() {
  console.log("\n📋 Checking SUBMODULE_REQUIRED_SUBROLE parity (server vs client)...");
  
  if (!objectsEqual(
    SERVER_SUBMODULE_REQUIRED_SUBROLE as unknown as Record<string, unknown>,
    CLIENT_SUBMODULE_REQUIRED_SUBROLE as unknown as Record<string, unknown>
  )) {
    logError("SUBMODULE_REQUIRED_SUBROLE", "Mismatch between server and client");
  } else {
    logSuccess("SUBMODULE_REQUIRED_SUBROLE fully aligned");
  }
}

// ============================================
// 5. PLAN_GATES Parity
// ============================================
function checkPlanGatesParity() {
  console.log("\n📋 Checking PLAN_GATES parity (server vs client)...");
  
  if (!objectsEqual(
    SERVER_PLAN_GATES as unknown as Record<string, unknown>,
    CLIENT_PLAN_GATES as unknown as Record<string, unknown>
  )) {
    logError("PLAN_GATES", "Mismatch between server and client");
  } else {
    logSuccess("PLAN_GATES fully aligned");
  }
}

// ============================================
// 5b. PLAN_GATES Parity (Server vs Lite)
// ============================================
function checkLitePlanGatesParity() {
  console.log("\n📋 Checking PLAN_GATES parity (server vs lite)...");

  if (!objectsEqual(
    SERVER_PLAN_GATES as unknown as Record<string, unknown>,
    LITE_PLAN_GATES as unknown as Record<string, unknown>
  )) {
    logError("PLAN_GATES_LITE", "Mismatch between server and lite");
  } else {
    logSuccess("PLAN_GATES_LITE fully aligned");
  }
}

// ============================================
// 6. computeAllowedModules Parity (Server vs Client vs Lite)
// ============================================
function checkComputeAllowedModulesParity() {
  console.log("\n📋 Checking computeAllowedModules parity (server vs client vs lite)...");
  
  // Test all roles without sub-roles
  for (const role of Object.values(Role)) {
    const serverModules = serverComputeAllowedModules(role).sort();
    const clientModules = clientComputeAllowedModules(role).sort();
    const liteModules = liteComputeAllowedModules(role).sort();
    
    if (!arraysEqual(serverModules, clientModules)) {
      logError("computeAllowedModules", `Role ${role} server/client mismatch`,
        `Server: ${serverModules.join(", ")}\nClient: ${clientModules.join(", ")}`);
    }
    
    if (!arraysEqual(serverModules, liteModules)) {
      logError("computeAllowedModules", `Role ${role} server/lite mismatch`,
        `Server: ${serverModules.join(", ")}\nLite: ${liteModules.join(", ")}`);
    }
  }
  
  // Test TEAM_MEMBER with all sub-roles (union behavior)
  for (const subRole of Object.values(SubRole)) {
    const serverModules = serverComputeAllowedModules(Role.TEAM_MEMBER, subRole).sort();
    const clientModules = clientComputeAllowedModules(Role.TEAM_MEMBER, subRole).sort();
    const liteModules = liteComputeAllowedModules(Role.TEAM_MEMBER, subRole).sort();
    
    if (!arraysEqual(serverModules, clientModules)) {
      logError("computeAllowedModules", `TEAM_MEMBER + ${subRole} server/client mismatch`,
        `Server: ${serverModules.join(", ")}\nClient: ${clientModules.join(", ")}`);
    }
    
    if (!arraysEqual(serverModules, liteModules)) {
      logError("computeAllowedModules", `TEAM_MEMBER + ${subRole} server/lite mismatch`,
        `Server: ${serverModules.join(", ")}\nLite: ${liteModules.join(", ")}`);
    }
    
    // Verify union behavior: sub-role should NOT lose base modules
    const baseModules = serverComputeAllowedModules(Role.TEAM_MEMBER).sort();
    for (const baseModule of baseModules) {
      if (!serverModules.includes(baseModule)) {
        logError("computeAllowedModules", `SubRole ${subRole} lost base module ${baseModule}`,
          "Sub-roles should union with base modules, not replace them");
      }
    }
  }
  
  if (!errors.some(e => e.category === "computeAllowedModules")) {
    logSuccess("computeAllowedModules fully aligned across server/client/lite");
  }
}

// ============================================
// 7. fm-lite ROLE_MODULES vs Server ROLE_MODULE_ACCESS
// ============================================
function checkLiteRoleModulesParity() {
  console.log("\n📋 Checking fm-lite ROLE_MODULES vs server ROLE_MODULE_ACCESS...");
  
  for (const role of Object.values(Role)) {
    const serverModuleAccess = SERVER_ROLE_MODULE_ACCESS[role] || {};
    const liteModules = LITE_ROLE_MODULES[role] || [];
    
    // Convert server boolean map to module array
    const serverModules = Object.entries(serverModuleAccess)
      .filter(([, allowed]) => allowed === true)
      .map(([module]) => module as ModuleKey)
      .sort();
    
    const sortedLiteModules = [...liteModules].sort();
    
    if (!arraysEqual(serverModules, sortedLiteModules)) {
      logError("LITE_ROLE_MODULES", `Role ${role} mismatch with server ROLE_MODULE_ACCESS`,
        `Server: ${serverModules.join(", ")}\nLite: ${sortedLiteModules.join(", ")}`);
    }
  }
  
  if (!errors.some(e => e.category === "LITE_ROLE_MODULES")) {
    logSuccess("fm-lite ROLE_MODULES aligned with server ROLE_MODULE_ACCESS");
  }
}

// ============================================
// 8. fm-lite ROLE_ACTIONS / SUB_ROLE_ACTIONS / SUBMODULE_REQUIRED_SUBROLE parity
// ============================================
function checkLiteRoleActionsParity() {
  console.log("\n📋 Checking fm-lite ROLE_ACTIONS parity (server vs lite)...");

  for (const role of Object.values(Role)) {
    const serverActions = SERVER_ROLE_ACTIONS[role] || {};
    const liteActions = LITE_ROLE_ACTIONS[role] || {};

    const serverKeys = Object.keys(serverActions).sort();
    const liteKeys = Object.keys(liteActions).sort();

    if (!arraysEqual(serverKeys, liteKeys)) {
      logError("ROLE_ACTIONS_LITE", `Role ${role} submodule keys mismatch`,
        `Server: ${serverKeys.join(", ")}\nLite: ${liteKeys.join(", ")}`);
      continue;
    }

    for (const submodule of serverKeys) {
      const serverActionList = (serverActions as Record<string, string[]>)[submodule] || [];
      const liteActionList = (liteActions as Record<string, string[]>)[submodule] || [];

      if (!arraysEqual(serverActionList, liteActionList)) {
        logError("ROLE_ACTIONS_LITE", `Role ${role} actions for ${submodule} mismatch`,
          `Server: ${serverActionList.join(", ")}\nLite: ${liteActionList.join(", ")}`);
      }
    }
  }

  if (!errors.some(e => e.category === "ROLE_ACTIONS_LITE")) {
    logSuccess("fm-lite ROLE_ACTIONS aligned with server");
  }
}

function checkLiteSubRoleActionsParity() {
  console.log("\n📋 Checking fm-lite SUB_ROLE_ACTIONS parity (server vs lite)...");

  for (const subRole of Object.values(SubRole)) {
    const serverActions = SERVER_SUB_ROLE_ACTIONS[subRole] || {};
    const liteActions = LITE_SUB_ROLE_ACTIONS[subRole] || {};

    if (!objectsEqual(serverActions as Record<string, unknown>, liteActions as Record<string, unknown>)) {
      logError("SUB_ROLE_ACTIONS_LITE", `SubRole ${subRole} mismatch`,
        `Server: ${JSON.stringify(serverActions)}\nLite: ${JSON.stringify(liteActions)}`);
    }
  }

  if (!errors.some(e => e.category === "SUB_ROLE_ACTIONS_LITE")) {
    logSuccess("fm-lite SUB_ROLE_ACTIONS aligned with server");
  }
}

function checkLiteSubmoduleRequiredSubroleParity() {
  console.log("\n📋 Checking fm-lite SUBMODULE_REQUIRED_SUBROLE parity (server vs lite)...");

  if (!objectsEqual(
    SERVER_SUBMODULE_REQUIRED_SUBROLE as unknown as Record<string, unknown>,
    LITE_SUBMODULE_REQUIRED_SUBROLE as unknown as Record<string, unknown>
  )) {
    logError("SUBMODULE_REQUIRED_SUBROLE_LITE", "Mismatch between server and lite");
  } else {
    logSuccess("fm-lite SUBMODULE_REQUIRED_SUBROLE fully aligned with server");
  }
}

// ============================================
// Main
// ============================================
async function main() {
  console.log("🔍 RBAC Parity Lint Check");
  console.log("=".repeat(50));
  
  checkRoleModuleAccessParity();
  checkRoleActionsParity();
  checkSubRoleActionsParity();
  checkSubmoduleRequiredSubroleParity();
  checkPlanGatesParity();
  checkLitePlanGatesParity();
  checkComputeAllowedModulesParity();
  checkLiteRoleModulesParity();
  checkLiteRoleActionsParity();
  checkLiteSubRoleActionsParity();
  checkLiteSubmoduleRequiredSubroleParity();
  
  console.log("\n" + "=".repeat(50));
  
  if (errors.length === 0) {
    console.log("✅ All RBAC parity checks passed!");
    process.exit(0);
  } else {
    console.error(`\n❌ ${errors.length} parity error(s) found. Fix before committing.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
