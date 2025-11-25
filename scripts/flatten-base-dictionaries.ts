/**
 * Flatten monolithic TypeScript base dictionaries into modular JSON sources
 * This eliminates the 28k-line TS files that cause VS Code memory issues
 *
 * Usage: npx tsx scripts/flatten-base-dictionaries.ts
 */

import * as fs from "fs";
import * as path from "path";
import en from "../i18n/dictionaries/en";
import ar from "../i18n/dictionaries/ar";
import type {
  TranslationDictionary,
  TranslationBundle,
} from "../i18n/dictionaries/types";

const SOURCES_DIR = path.join(__dirname, "../i18n/sources");
const BACKUP_DIR = path.join(__dirname, "../i18n/dictionaries/backup");

// Ensure directories exist
if (!fs.existsSync(SOURCES_DIR)) {
  fs.mkdirSync(SOURCES_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

interface FlattenStats {
  coercedNumbers: number;
  coercedBooleans: number;
  droppedKeys: string[];
}

/**
 * Flatten nested dictionary into dot-notation keys with schema validation
 */
function flattenDictionary(
  obj: TranslationDictionary,
  prefix = "",
  stats: FlattenStats = {
    coercedNumbers: 0,
    coercedBooleans: 0,
    droppedKeys: [],
  },
): { flattened: Record<string, string>; stats: FlattenStats } {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      result[newKey] = value;
    } else if (typeof value === "number") {
      console.warn(`⚠️  Coercing number to string: "${newKey}" = ${value}`);
      result[newKey] = String(value);
      stats.coercedNumbers++;
    } else if (typeof value === "boolean") {
      console.warn(`⚠️  Coercing boolean to string: "${newKey}" = ${value}`);
      result[newKey] = String(value);
      stats.coercedBooleans++;
    } else if (typeof value === "object" && value !== null) {
      const nested = flattenDictionary(
        value as TranslationDictionary,
        newKey,
        stats,
      );
      Object.assign(result, nested.flattened);
    } else {
      console.warn(
        `⚠️  Dropping non-string leaf: "${newKey}" (type: ${typeof value})`,
      );
      stats.droppedKeys.push(newKey);
    }
  }

  return { flattened: result, stats };
}

/**
 * Sanitize domain name to ensure filesystem safety
 */
function sanitizeDomain(domain: string): string {
  const DEFAULT_DOMAIN = "common";

  // Handle empty, whitespace-only, or dot-only segments
  if (!domain || domain.trim() === "" || domain === ".") {
    return DEFAULT_DOMAIN;
  }

  // Check for illegal characters (allow only alphanumeric, hyphen, underscore)
  const SAFE_DOMAIN_PATTERN = /^[a-z0-9_-]+$/i;
  if (!SAFE_DOMAIN_PATTERN.test(domain)) {
    console.warn(
      `⚠️  Unsafe domain name: "${domain}" - contains illegal characters, using "${DEFAULT_DOMAIN}"`,
    );
    return DEFAULT_DOMAIN;
  }

  // Check for path traversal attempts
  if (domain.includes("..") || domain.includes("/") || domain.includes("\\")) {
    console.warn(
      `⚠️  Path traversal attempt: "${domain}" - using "${DEFAULT_DOMAIN}"`,
    );
    return DEFAULT_DOMAIN;
  }

  return domain;
}

/**
 * Group flattened keys by top-level domain with validation
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
      // No dot or starts with dot - use default
      console.warn(`⚠️  Malformed key: "${key}" - using default domain`);
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

interface MergeStats {
  overriddenEnKeys: number;
  overriddenArKeys: number;
  preservedEnKeys: number;
  preservedArKeys: number;
}

/**
 * Merge with existing modular sources - fresh keys override stale entries
 */
function mergeWithExisting(
  domain: string,
  newEn: Record<string, string>,
  newAr: Record<string, string>,
): { bundle: TranslationBundle; stats: MergeStats } {
  const filePath = path.join(SOURCES_DIR, `${domain}.translations.json`);
  const stats: MergeStats = {
    overriddenEnKeys: 0,
    overriddenArKeys: 0,
    preservedEnKeys: 0,
    preservedArKeys: 0,
  };

  if (fs.existsSync(filePath)) {
    try {
      const existing: TranslationBundle = JSON.parse(
        fs.readFileSync(filePath, "utf-8"),
      );

      // Count keys that will be overridden
      for (const key of Object.keys(existing.en)) {
        if (key in newEn) {
          stats.overriddenEnKeys++;
        } else {
          stats.preservedEnKeys++;
        }
      }
      for (const key of Object.keys(existing.ar)) {
        if (key in newAr) {
          stats.overriddenArKeys++;
        } else {
          stats.preservedArKeys++;
        }
      }

      if (stats.overriddenEnKeys > 0 || stats.overriddenArKeys > 0) {
        console.warn(
          `  ⚠️  ${domain}: Overriding ${stats.overriddenEnKeys} en, ${stats.overriddenArKeys} ar keys with fresh values`,
        );
      }

      return {
        bundle: {
          en: { ...existing.en, ...newEn }, // Fresh keys override
          ar: { ...existing.ar, ...newAr },
        },
        stats,
      };
    } catch (err) {
      console.warn(
        `⚠️  Could not merge existing ${domain}.translations.json:`,
        err,
      );
    }
  }

  return { bundle: { en: newEn, ar: newAr }, stats };
}

interface ParityIssue {
  domain: string;
  enCount: number;
  arCount: number;
  diff: number;
}

/**
 * Validate TranslationBundle integrity
 */
function validateBundle(domain: string, bundle: TranslationBundle): boolean {
  if (!bundle.en || typeof bundle.en !== "object") {
    console.error(`❌ ${domain}: Missing or invalid 'en' object`);
    return false;
  }
  if (!bundle.ar || typeof bundle.ar !== "object") {
    console.error(`❌ ${domain}: Missing or invalid 'ar' object`);
    return false;
  }

  // Check all values are strings
  for (const [key, value] of Object.entries(bundle.en)) {
    if (typeof value !== "string") {
      console.error(
        `❌ ${domain}: Non-string value in en.${key} (type: ${typeof value})`,
      );
      return false;
    }
  }
  for (const [key, value] of Object.entries(bundle.ar)) {
    if (typeof value !== "string") {
      console.error(
        `❌ ${domain}: Non-string value in ar.${key} (type: ${typeof value})`,
      );
      return false;
    }
  }

  return true;
}

/**
 * Write modular domain files with sorted keys for deterministic output
 */
function writeDomainFiles() {
  console.log("📦 Flattening base dictionaries...\n");

  const enResult = flattenDictionary(en);
  const arResult = flattenDictionary(ar);

  const enFlat = enResult.flattened;
  const arFlat = arResult.flattened;

  console.log(`  English: ${Object.keys(enFlat).length} keys`);
  console.log(`  Arabic:  ${Object.keys(arFlat).length} keys`);

  // Report schema issues
  if (
    enResult.stats.coercedNumbers > 0 ||
    enResult.stats.coercedBooleans > 0 ||
    enResult.stats.droppedKeys.length > 0
  ) {
    console.log(`\n⚠️  Schema Issues:`);
    if (enResult.stats.coercedNumbers > 0)
      console.log(
        `    - Coerced ${enResult.stats.coercedNumbers} numbers to strings`,
      );
    if (enResult.stats.coercedBooleans > 0)
      console.log(
        `    - Coerced ${enResult.stats.coercedBooleans} booleans to strings`,
      );
    if (enResult.stats.droppedKeys.length > 0)
      console.log(
        `    - Dropped ${enResult.stats.droppedKeys.length} non-string values`,
      );
  }
  console.log("");

  const enDomains = groupByDomain(enFlat);
  const arDomains = groupByDomain(arFlat);

  // Get all unique domains and sort for deterministic output
  const allDomains = Array.from(
    new Set([...enDomains.keys(), ...arDomains.keys()]),
  ).sort();

  console.log(`📝 Writing ${allDomains.length} domain files...\n`);

  let totalEnKeys = 0;
  let totalArKeys = 0;
  let totalOverriddenKeys = 0;
  const parityIssues: ParityIssue[] = [];

  // Backup existing files BEFORE writing (move backups before flatten run)
  console.log("💾 Creating backups of existing translation files...\n");
  const timestamp = Date.now();
  const enSource = path.join(__dirname, "../i18n/dictionaries/en.ts");
  const arSource = path.join(__dirname, "../i18n/dictionaries/ar.ts");

  if (fs.existsSync(enSource)) {
    const enStats = fs.statSync(enSource);
    if (enStats.size > 1000000) {
      // Only backup if > 1MB (huge file)
      const enBackup = path.join(BACKUP_DIR, `en.ts.backup.${timestamp}`);
      fs.copyFileSync(enSource, enBackup);
      console.log(
        `  ✓ Backed up en.ts (${(enStats.size / 1024 / 1024).toFixed(1)} MB)`,
      );
    }
  }

  if (fs.existsSync(arSource)) {
    const arStats = fs.statSync(arSource);
    if (arStats.size > 1000000) {
      const arBackup = path.join(BACKUP_DIR, `ar.ts.backup.${timestamp}`);
      fs.copyFileSync(arSource, arBackup);
      console.log(
        `  ✓ Backed up ar.ts (${(arStats.size / 1024 / 1024).toFixed(1)} MB)`,
      );
    }
  }

  // Prune old backups (keep last 5)
  const backupFiles = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".backup." + timestamp) === false)
    .sort()
    .reverse();

  if (backupFiles.length > 10) {
    console.log(`\n🗑️  Pruning old backups (keeping last 10)...`);
    for (const file of backupFiles.slice(10)) {
      fs.unlinkSync(path.join(BACKUP_DIR, file));
      console.log(`  ✓ Removed ${file}`);
    }
  }
  console.log("");

  for (const domain of allDomains) {
    const enTranslations = enDomains.get(domain) || {};
    const arTranslations = arDomains.get(domain) || {};

    // Merge with existing modular sources
    const { bundle, stats } = mergeWithExisting(
      domain,
      enTranslations,
      arTranslations,
    );

    totalOverriddenKeys += stats.overriddenEnKeys + stats.overriddenArKeys;

    const fileName = `${domain}.translations.json`;
    const filePath = path.join(SOURCES_DIR, fileName);

    try {
      // Sort keys for deterministic output
      const sortedBundle: TranslationBundle = {
        en: Object.fromEntries(
          Object.entries(bundle.en).sort(([a], [b]) => a.localeCompare(b)),
        ),
        ar: Object.fromEntries(
          Object.entries(bundle.ar).sort(([a], [b]) => a.localeCompare(b)),
        ),
      };

      // Validate before writing
      if (!validateBundle(domain, sortedBundle)) {
        console.error(`❌ Validation failed for ${domain}`);
        process.exit(1);
      }

      fs.writeFileSync(
        filePath,
        JSON.stringify(sortedBundle, null, 2),
        "utf-8",
      );

      const enCount = Object.keys(sortedBundle.en).length;
      const arCount = Object.keys(sortedBundle.ar).length;

      totalEnKeys += enCount;
      totalArKeys += arCount;

      // Track parity issues
      if (enCount !== arCount) {
        parityIssues.push({
          domain,
          enCount,
          arCount,
          diff: enCount - arCount,
        });
      }

      const parityMarker = enCount === arCount ? "✓" : "⚠️";
      console.log(
        `  ${parityMarker} ${fileName.padEnd(40)} (${String(enCount).padStart(5)} en, ${String(arCount).padStart(5)} ar)`,
      );
    } catch (err) {
      console.error(`  ✗ Failed to write ${fileName}:`, err);
      process.exit(1);
    }
  }

  console.log(`\n✅ Successfully flattened base dictionaries!`);
  console.log(`📂 Location: ${SOURCES_DIR}`);
  console.log(`📊 Total: ${totalEnKeys} en keys, ${totalArKeys} ar keys`);

  // Data loss detection
  const originalEnCount = Object.keys(enFlat).length;
  const originalArCount = Object.keys(arFlat).length;
  const enLoss = originalEnCount - totalEnKeys;
  const arLoss = originalArCount - totalArKeys;

  if (enLoss !== 0 || arLoss !== 0) {
    console.log(`\n⚠️  DATA LOSS DETECTED:`);
    if (enLoss > 0)
      console.log(`    - Lost ${enLoss} English keys during grouping/merge`);
    if (enLoss < 0)
      console.log(
        `    - Gained ${-enLoss} English keys (duplicates or merge artifacts)`,
      );
    if (arLoss > 0)
      console.log(`    - Lost ${arLoss} Arabic keys during grouping/merge`);
    if (arLoss < 0)
      console.log(
        `    - Gained ${-arLoss} Arabic keys (duplicates or merge artifacts)`,
      );
  }

  // Report parity issues
  if (parityIssues.length > 0) {
    console.log(
      `\n⚠️  TRANSLATION PARITY ISSUES (${parityIssues.length} domains):`,
    );
    console.log(
      `\n    Domain                                    EN      AR      Diff`,
    );
    console.log(`    ${"=".repeat(70)}`);

    // Sort by absolute diff (largest first)
    parityIssues.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    for (const issue of parityIssues.slice(0, 20)) {
      // Show top 20
      const diffStr = issue.diff > 0 ? `+${issue.diff}` : String(issue.diff);
      console.log(
        `    ${issue.domain.padEnd(40)} ${String(issue.enCount).padStart(6)} ${String(issue.arCount).padStart(6)} ${diffStr.padStart(8)}`,
      );
    }

    if (parityIssues.length > 20) {
      console.log(
        `    ... and ${parityIssues.length - 20} more domains with mismatches`,
      );
    }

    console.log(
      `\n    💡 Run: npx tsx scripts/check-translation-parity.ts for detailed report`,
    );
  } else {
    console.log(`\n✅ All domains have matching key counts across locales`);
  }

  if (totalOverriddenKeys > 0) {
    console.log(
      `\n📝 Merge Summary: ${totalOverriddenKeys} keys overridden with fresh values`,
    );
  }

  console.log(`\n📋 Next steps:`);
  console.log(`  1. Run: pnpm i18n:build`);
  console.log(`  2. Test: pnpm tsc --noEmit`);
  console.log(`  3. Verify: npx tsx scripts/check-translation-parity.ts`);
  console.log(`  4. Commit modular sources and generated artifacts`);

  if (parityIssues.length > 0) {
    console.log(
      `\n⚠️  WARNING: Parity issues detected. Review before deploying.\n`,
    );
    process.exit(1);
  }

  console.log("");
}

// Run the flattening
writeDomainFiles();
