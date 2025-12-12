#!/usr/bin/env ts-node

/**
 * Organization context verification script
 * ----------------------------------------
 * This script validates three things before deployment:
 * 1. FM routes that are supposed to be org-guarded keep importing/useSupportOrg().
 * 2. Translation dictionaries contain the org prompt keys for EN/AR.
 * 3. SupportOrgSwitcher API route files expose the required HTTP handlers.
 *
 * The script compares the current guard coverage with config/org-guard-baseline.json
 * so we can fail builds only when NEW pages regress, while still reporting when
 * existing pages get upgraded (so the baseline can be trimmed).
 */

import fs from "fs";
import path from "path";
import fg from "fast-glob";

type BaselineFile = {
  generatedAt?: string;
  missing: string[];
};

type CheckResult = {
  ok: boolean;
  warnings: string[];
};

type GuardScopeConfig = {
  id: string;
  description: string;
  match: RegExp;
  guardType: "template";
  templatePath: string;
  mustContain?: string;
};

type GuardScopeState = GuardScopeConfig & {
  satisfied: boolean;
  error?: string;
};

const PROJECT_ROOT = path.resolve(__dirname, "..");

function fail(message: string): never {
  console.error(`\n❌ ${message}`);
  process.exit(1);
}

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as T;
}

const GUARD_SCOPES: GuardScopeConfig[] = [
  {
    id: "fm-template",
    description: "FM routes use app/fm/template.tsx to enforce OrgContextGate",
    match: /^app\/fm\//,
    guardType: "template",
    templatePath: "app/fm/template.tsx",
    mustContain: "OrgContextGate",
  },
];

function evaluateGuardScopes(): GuardScopeState[] {
  return GUARD_SCOPES.map((scope) => {
    const abs = path.join(PROJECT_ROOT, scope.templatePath);
    if (!fs.existsSync(abs)) {
      return {
        ...scope,
        satisfied: false,
        error: `Missing ${scope.templatePath}`,
      };
    }
    const source = fs.readFileSync(abs, "utf8");
    if (scope.mustContain && !source.includes(scope.mustContain)) {
      return {
        ...scope,
        satisfied: false,
        error: `${scope.templatePath} does not reference ${scope.mustContain}`,
      };
    }
    return { ...scope, satisfied: true };
  });
}

function checkOrgGuards(): CheckResult {
  const baselinePath = path.join(
    PROJECT_ROOT,
    "config",
    "org-guard-baseline.json",
  );
  if (!fs.existsSync(baselinePath)) {
    fail(
      "Missing config/org-guard-baseline.json. Run the baseline generator script.",
    );
  }

  const baseline = readJson<BaselineFile>(baselinePath);
  const baselineSet = new Set(baseline.missing);
  const scopeStates = evaluateGuardScopes();
  const scopeErrors = scopeStates.filter((scope) => !scope.satisfied);

  const fmPages = fg
    .sync(["app/fm/**/page.{ts,tsx,js,jsx}"], {
      cwd: PROJECT_ROOT,
      dot: false,
    })
    .sort();

  const guardTokens = ["useSupportOrg", "useOrgGuard", "useFmOrgGuard"];
  const missingNow = fmPages.filter((file) => {
    const scoped = scopeStates.find((scope) => scope.match.test(file));
    if (scoped && scoped.satisfied) {
      return false;
    }
    const abs = path.join(PROJECT_ROOT, file);
    const source = fs.readFileSync(abs, "utf8");
    const hasGuard = guardTokens.some((token) => source.includes(token));
    return !hasGuard;
  });

  const missingSet = new Set(missingNow);
  const newMissing = missingNow.filter((file) => !baselineSet.has(file));
  const upgraded = baseline.missing.filter((file) => !missingSet.has(file));

  if (scopeErrors.length > 0) {
    console.error("⚠️  Guard scope validation failed:");
    scopeErrors.forEach((scope) => {
      console.error(`   - ${scope.description}: ${scope.error}`);
    });
    return { ok: false, warnings: [] };
  }

  if (newMissing.length > 0) {
    console.error(
      "⚠️  The following FM routes are missing useSupportOrg() / useOrgGuard():",
    );
    newMissing.forEach((file) => console.error(`   - ${file}`));
    console.error(
      "\nUpdate the page(s) to include the org guard or extend config/org-guard-baseline.json.",
    );
    return { ok: false, warnings: [] };
  }

  const warnings: string[] = [];
  if (upgraded.length > 0) {
    warnings.push(
      `Org guard baseline is stale. Remove the following entries once you confirm the guards are intentional:\n${upgraded
        .map((file) => `   - ${file}`)
        .join("\n")}`,
    );
  }

  return { ok: true, warnings };
}

function checkTranslationKeys(): CheckResult {
  const translationsPath = path.join(
    PROJECT_ROOT,
    "i18n",
    "sources",
    "fm.translations.json",
  );
  if (!fs.existsSync(translationsPath)) {
    fail("Missing i18n/sources/fm.translations.json.");
  }

  type Dictionary = Record<string, string>;
  const dictionary = readJson<{ en: Dictionary; ar: Dictionary }>(
    translationsPath,
  );
  const requiredKeys = [
    "fm.org.required",
    "fm.org.selectPrompt",
    "fm.org.contactAdmin",
    "fm.org.supportContext",
  ];

  const languages: Array<[string, Dictionary]> = [
    ["en", dictionary.en],
    ["ar", dictionary.ar],
  ];

  const missing: string[] = [];
  for (const [lang, values] of languages) {
    for (const key of requiredKeys) {
      if (
        !values ||
        typeof values[key] !== "string" ||
        values[key].trim() === ""
      ) {
        missing.push(`${lang}:${key}`);
      }
    }
  }

  if (missing.length > 0) {
    console.error("⚠️  Missing org prompt translation keys:");
    missing.forEach((entry) => console.error(`   - ${entry}`));
    return { ok: false, warnings: [] };
  }

  return { ok: true, warnings: [] };
}

type ApiExpectation = {
  file: string;
  requiredHandlers: string[];
};

function checkSupportOrgApis(): CheckResult {
  const expectations: ApiExpectation[] = [
    {
      file: "app/api/support/impersonation/route.ts",
      requiredHandlers: ["GET", "POST", "DELETE"],
    },
    {
      file: "app/api/support/organizations/search/route.ts",
      requiredHandlers: ["GET"],
    },
  ];

  const warnings: string[] = [];
  const missingHandlers: string[] = [];

  for (const { file, requiredHandlers } of expectations) {
    const abs = path.join(PROJECT_ROOT, file);
    if (!fs.existsSync(abs)) {
      missingHandlers.push(`${file}: file does not exist`);
      continue;
    }
    const source = fs.readFileSync(abs, "utf8");
    for (const handler of requiredHandlers) {
      const token = `export async function ${handler}`;
      if (!source.includes(token)) {
        missingHandlers.push(`${file}: missing ${handler} handler`);
      }
    }
    if (!source.includes("auth(")) {
      warnings.push(
        `${file}: handler does not reference auth() - double check access control.`,
      );
    }
  }

  if (missingHandlers.length > 0) {
    console.error("⚠️  SupportOrgSwitcher API validation failed:");
    missingHandlers.forEach((entry) => console.error(`   - ${entry}`));
    return { ok: false, warnings };
  }

  return { ok: true, warnings };
}

function checkOrgContextGate(): CheckResult {
  const gatePath = path.join(
    PROJECT_ROOT,
    "components",
    "fm",
    "OrgContextGate.tsx",
  );
  if (!fs.existsSync(gatePath)) {
    console.error("⚠️  Missing components/fm/OrgContextGate.tsx");
    return { ok: false, warnings: [] };
  }

  const source = fs.readFileSync(gatePath, "utf8");
  const issues: string[] = [];
  if (!source.includes("useSupportOrg")) {
    issues.push("OrgContextGate does not reference useSupportOrg().");
  }
  if (!source.includes("OrgContextPrompt")) {
    issues.push("OrgContextGate does not render OrgContextPrompt fallback.");
  }

  if (issues.length > 0) {
    issues.forEach((issue) => console.error(`⚠️  ${issue}`));
    return { ok: false, warnings: [] };
  }

  return { ok: true, warnings: [] };
}

async function main() {
  console.log("🔍 Verifying organization context coverage...");

  const guardResult = checkOrgGuards();
  const translationsResult = checkTranslationKeys();
  const apiResult = checkSupportOrgApis();
  const gateResult = checkOrgContextGate();

  const hasFailure = [
    guardResult,
    translationsResult,
    apiResult,
    gateResult,
  ].some((res) => !res.ok);

  const aggregatedWarnings = [
    ...guardResult.warnings,
    ...apiResult.warnings,
    ...gateResult.warnings,
  ];
  if (aggregatedWarnings.length > 0) {
    console.warn("\n⚠️  Warnings:");
    aggregatedWarnings.forEach((warning) => console.warn(warning));
  }

  if (hasFailure) {
    fail("Organization context verification failed.");
  }

  console.log("✅ Organization context checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
