/**
 * Split monolithic translation file into modular sources by domain
 * Usage: npx tsx scripts/split-translations.ts [--check]
 *
 * Flags:
 *   --check  Validate without writing files (CI mode)
 */

import * as fs from "fs";
import * as path from "path";
import { newTranslations } from "../i18n/new-translations";
import type { TranslationBundle } from "../i18n/dictionaries/types";

const SOURCES_DIR = path.join(__dirname, "../i18n/sources");
const BACKUP_SUFFIX = ".bak";
const CHECK_MODE = process.argv.includes("--check");

// Ensure sources directory exists
if (!fs.existsSync(SOURCES_DIR)) {
  fs.mkdirSync(SOURCES_DIR, { recursive: true });
}

interface ParityIssue {
  domain: string;
  enCount: number;
  arCount: number;
  missingInEn: string[];
  missingInAr: string[];
}

interface ValidationError {
  domain: string;
  key: string;
  issue: string;
}

/**
 * Sanitize domain name to ensure filesystem safety
 */
function sanitizeDomain(domain: string): string {
  const DEFAULT_DOMAIN = "common";

  // Handle empty, whitespace-only, or dot-only segments
  if (!domain || domain.trim() === "" || domain === ".") {
    console.warn(
      `⚠️  Empty domain segment detected, using "${DEFAULT_DOMAIN}"`,
    );
    return DEFAULT_DOMAIN;
  }

  // Check for illegal characters (allow only alphanumeric, hyphen, underscore)
  const SAFE_DOMAIN_PATTERN = /^[a-z0-9_-]+$/i;
  if (!SAFE_DOMAIN_PATTERN.test(domain)) {
    console.warn(
      `⚠️  Unsafe domain name: "${domain}" (contains illegal chars), using "${DEFAULT_DOMAIN}"`,
    );
    return DEFAULT_DOMAIN;
  }

  // Check for path traversal attempts
  if (domain.includes("..") || domain.includes("/") || domain.includes("\\")) {
    console.warn(
      `⚠️  Path traversal attempt: "${domain}", using "${DEFAULT_DOMAIN}"`,
    );
    return DEFAULT_DOMAIN;
  }

  // Check for Windows-reserved names
  const WINDOWS_RESERVED = [
    "CON",
    "PRN",
    "AUX",
    "NUL",
    "COM1",
    "COM2",
    "COM3",
    "COM4",
    "COM5",
    "COM6",
    "COM7",
    "COM8",
    "COM9",
    "LPT1",
    "LPT2",
    "LPT3",
    "LPT4",
    "LPT5",
    "LPT6",
    "LPT7",
    "LPT8",
    "LPT9",
  ];
  if (WINDOWS_RESERVED.includes(domain.toUpperCase())) {
    console.warn(
      `⚠️  Windows-reserved name: "${domain}", using "${DEFAULT_DOMAIN}"`,
    );
    return DEFAULT_DOMAIN;
  }

  return domain;
}

/**
 * Group translation keys by their top-level domain with validation
 */
function groupByDomain(
  translations: Record<string, string>,
): Map<string, Record<string, string>> {
  const domainMap = new Map<string, Record<string, string>>();
  const DEFAULT_DOMAIN = "common";

  for (const [key, value] of Object.entries(translations)) {
    // Extract domain (first segment before dot)
    const firstDot = key.indexOf(".");
    let rawDomain: string;

    if (firstDot <= 0) {
      // No dot or starts with dot
      console.warn(
        `⚠️  Malformed key: "${key}" (no domain prefix), using "${DEFAULT_DOMAIN}"`,
      );
      rawDomain = DEFAULT_DOMAIN;
    } else {
      rawDomain = key.substring(0, firstDot);
    }

    const domain = sanitizeDomain(rawDomain);

    if (!domainMap.has(domain)) {
      domainMap.set(domain, {});
    }

    domainMap.get(domain)![key] = value;
  }

  return domainMap;
}

/**
 * Validate all values are strings (recursively check for nested objects)
 */
function validateValues(
  translations: Record<string, string>,
  locale: string,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [key, value] of Object.entries(translations)) {
    if (typeof value !== "string") {
      errors.push({
        domain: key.split(".")[0] || "unknown",
        key,
        issue: `Non-string value in ${locale} (type: ${typeof value})`,
      });
    } else if (value.trim() === "") {
      errors.push({
        domain: key.split(".")[0] || "unknown",
        key,
        issue: `Empty string in ${locale}`,
      });
    }
  }

  return errors;
}

/**
 * Check parity between locales for a domain
 */
function checkDomainParity(
  domain: string,
  enTranslations: Record<string, string>,
  arTranslations: Record<string, string>,
): ParityIssue | null {
  const enKeys = new Set(Object.keys(enTranslations));
  const arKeys = new Set(Object.keys(arTranslations));

  const missingInAr = [...enKeys].filter((k) => !arKeys.has(k));
  const missingInEn = [...arKeys].filter((k) => !enKeys.has(k));

  if (missingInAr.length > 0 || missingInEn.length > 0) {
    return {
      domain,
      enCount: enKeys.size,
      arCount: arKeys.size,
      missingInEn,
      missingInAr,
    };
  }

  return null;
}

/**
 * Merge with existing file if it exists, preserving manual edits
 */
function mergeWithExisting(
  domain: string,
  newEn: Record<string, string>,
  newAr: Record<string, string>,
): { bundle: TranslationBundle; hasExisting: boolean; mergedKeys: number } {
  const filePath = path.join(SOURCES_DIR, `${domain}.translations.json`);
  let hasExisting = false;
  let mergedKeys = 0;

  if (fs.existsSync(filePath)) {
    try {
      const existing: TranslationBundle = JSON.parse(
        fs.readFileSync(filePath, "utf-8"),
      );
      hasExisting = true;

      // Count preserved keys (keys in existing but not in new)
      for (const key of Object.keys(existing.en)) {
        if (!(key in newEn)) mergedKeys++;
      }
      for (const key of Object.keys(existing.ar)) {
        if (!(key in newAr)) mergedKeys++;
      }

      // Fresh data wins, but preserve keys that aren't in new data
      return {
        bundle: {
          en: { ...existing.en, ...newEn },
          ar: { ...existing.ar, ...newAr },
        },
        hasExisting,
        mergedKeys,
      };
    } catch (err) {
      console.warn(
        `⚠️  Could not parse existing ${domain}.translations.json:`,
        err,
      );
    }
  }

  return { bundle: { en: newEn, ar: newAr }, hasExisting, mergedKeys };
}

/**
 * Write domain file atomically (temp file + rename)
 */
function writeFileSafe(filePath: string, content: string): void {
  const tempPath = `${filePath}.tmp`;

  try {
    fs.writeFileSync(tempPath, content, "utf-8");
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    // Clean up temp file if it exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw err;
  }
}

/**
 * Write domain translations to modular source files
 */
function writeDomainFiles() {
  const { en, ar } = newTranslations;

  // Validate all values are strings
  console.log("🔍 Validating translation values...\n");
  const enErrors = validateValues(en, "en");
  const arErrors = validateValues(ar, "ar");
  const allErrors = [...enErrors, ...arErrors];

  if (allErrors.length > 0) {
    console.error(`❌ VALIDATION ERRORS (${allErrors.length} total):\n`);
    for (const error of allErrors.slice(0, 10)) {
      console.error(`  ${error.domain}/${error.key}: ${error.issue}`);
    }
    if (allErrors.length > 10) {
      console.error(`  ... and ${allErrors.length - 10} more errors`);
    }
    console.error("\n💡 Fix upstream dictionary issues before splitting\n");
    process.exit(1);
  }

  console.log(
    `✅ All values validated (${Object.keys(en).length} en, ${Object.keys(ar).length} ar)\n`,
  );

  const enDomains = groupByDomain(en);
  const arDomains = groupByDomain(ar);

  // Get all unique domain names and sort alphabetically for deterministic output
  const allDomains = Array.from(
    new Set([...enDomains.keys(), ...arDomains.keys()]),
  ).sort();

  console.log(`📦 Processing ${allDomains.length} domains...\n`);

  if (CHECK_MODE) {
    console.log("🔎 CHECK MODE: Validating without writing files\n");
  }

  const parityIssues: ParityIssue[] = [];
  let totalEnKeys = 0;
  let totalArKeys = 0;
  let filesCreated = 0;
  let filesUpdated = 0;
  let totalMergedKeys = 0;

  for (const domain of allDomains) {
    const enTranslations = enDomains.get(domain) || {};
    const arTranslations = arDomains.get(domain) || {};

    // Check parity
    const parityIssue = checkDomainParity(
      domain,
      enTranslations,
      arTranslations,
    );
    if (parityIssue) {
      parityIssues.push(parityIssue);
    }

    // Merge with existing
    const { bundle, hasExisting, mergedKeys } = mergeWithExisting(
      domain,
      enTranslations,
      arTranslations,
    );
    totalMergedKeys += mergedKeys;

    // Sort keys for deterministic output
    const sortedBundle: TranslationBundle = {
      en: Object.fromEntries(
        Object.entries(bundle.en).sort(([a], [b]) => a.localeCompare(b)),
      ),
      ar: Object.fromEntries(
        Object.entries(bundle.ar).sort(([a], [b]) => a.localeCompare(b)),
      ),
    };

    const fileName = `${domain}.translations.json`;
    const filePath = path.join(SOURCES_DIR, fileName);

    if (!CHECK_MODE) {
      // Backup existing file before overwriting
      if (hasExisting && mergedKeys > 0) {
        const backupPath = filePath + BACKUP_SUFFIX;
        fs.copyFileSync(filePath, backupPath);
      }

      // Write atomically
      try {
        writeFileSafe(filePath, JSON.stringify(sortedBundle, null, 2));
        if (hasExisting) {
          filesUpdated++;
        } else {
          filesCreated++;
        }
      } catch (err) {
        console.error(`❌ Failed to write ${fileName}:`, err);
        process.exit(1);
      }
    }

    const enCount = Object.keys(sortedBundle.en).length;
    const arCount = Object.keys(sortedBundle.ar).length;
    totalEnKeys += enCount;
    totalArKeys += arCount;

    const statusIcon = parityIssue ? "⚠️ " : "✓ ";
    const mergeInfo = mergedKeys > 0 ? ` (merged ${mergedKeys} keys)` : "";
    console.log(
      `  ${statusIcon}${fileName.padEnd(45)} (${String(enCount).padStart(5)} en, ${String(arCount).padStart(5)} ar)${mergeInfo}`,
    );
  }

  console.log(
    `\n✅ Successfully ${CHECK_MODE ? "validated" : "split"} translations into modular sources!`,
  );
  console.log(`📂 Location: ${SOURCES_DIR}`);
  console.log(`📊 Total: ${totalEnKeys} en keys, ${totalArKeys} ar keys`);

  if (!CHECK_MODE) {
    console.log(`📝 Files: ${filesCreated} created, ${filesUpdated} updated`);
    if (totalMergedKeys > 0) {
      console.log(
        `🔀 Merged: ${totalMergedKeys} preserved keys from existing files`,
      );
    }
  }

  // Report parity issues
  if (parityIssues.length > 0) {
    console.log(
      `\n⚠️  TRANSLATION PARITY ISSUES (${parityIssues.length} domains):\n`,
    );
    console.log(
      `    Domain                                    EN      AR      Missing`,
    );
    console.log(`    ${"=".repeat(70)}`);

    for (const issue of parityIssues.slice(0, 15)) {
      const missing =
        issue.missingInEn.length > 0
          ? `${issue.missingInEn.length} in EN`
          : `${issue.missingInAr.length} in AR`;
      console.log(
        `    ${issue.domain.padEnd(40)} ${String(issue.enCount).padStart(6)} ${String(issue.arCount).padStart(6)}  ${missing}`,
      );
    }

    if (parityIssues.length > 15) {
      console.log(
        `    ... and ${parityIssues.length - 15} more domains with mismatches`,
      );
    }

    console.log(
      `\n    💡 Run: npx tsx scripts/check-translation-parity.ts for detailed key-level report\n`,
    );

    if (!CHECK_MODE) {
      console.log(
        "⚠️  WARNING: Parity issues detected. Review before deploying.\n",
      );
      process.exit(1);
    }
  } else {
    console.log(`\n✅ All domains have matching key counts across locales\n`);
  }
}

// Run the split
writeDomainFiles();
