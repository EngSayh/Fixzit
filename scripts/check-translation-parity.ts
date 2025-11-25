/**
 * Check translation parity across locales and report detailed diagnostics
 * Usage: npx tsx scripts/check-translation-parity.ts [--format=json|text] [--domain=<name>]
 *
 * This script analyzes all modular translation sources and reports:
 * - Per-domain key count mismatches
 * - Missing keys in each locale
 * - Total coverage statistics
 * - Baseline comparisons for CI
 */

import * as fs from "fs";
import * as path from "path";
import type {
  TranslationBundle,
  FlatTranslationMap,
} from "../i18n/dictionaries/types";
import { newTranslations } from "../i18n/new-translations";

const SOURCES_DIR = path.join(__dirname, "../i18n/sources");

interface DomainParity {
  domain: string;
  enCount: number;
  arCount: number;
  diff: number;
  missingInEn: string[];
  missingInAr: string[];
  duplicates: string[];
  enKeys: string[];
  arKeys: string[];
}

interface ParityReport {
  timestamp: string;
  totalDomains: number;
  totalEnKeys: number;
  totalArKeys: number;
  domainsWithIssues: number;
  catalogIssues: number;
  domainDetails: DomainParity[];
  catalogParity: CatalogParity[];
  summary: {
    perfectParity: number;
    minorDrift: number; // < 5 keys diff
    majorDrift: number; // >= 5 keys diff
    totalMissingEn: number;
    totalMissingAr: number;
  };
}

interface CatalogParity {
  locale: "en" | "ar";
  expectedCount: number;
  actualCount: number;
  missingKeys: string[];
  extraKeys: string[];
}

/**
 * Parse command-line arguments
 */
function parseArgs(): { format: "json" | "text"; domain?: string } {
  const args = process.argv.slice(2);
  let format: "json" | "text" = "text";
  let domain: string | undefined;

  for (const arg of args) {
    if (arg.startsWith("--format=")) {
      const value = arg.split("=")[1];
      if (value === "json" || value === "text") {
        format = value;
      }
    } else if (arg.startsWith("--domain=")) {
      domain = arg.split("=")[1];
    }
  }

  return { format, domain };
}

/**
 * Load and analyze a single domain file
 */
function analyzeDomain(domain: string, filePath: string): DomainParity | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const bundle: TranslationBundle = JSON.parse(content);

    const enKeys = new Set(Object.keys(bundle.en || {}));
    const arKeys = new Set(Object.keys(bundle.ar || {}));

    const missingInAr = [...enKeys].filter((k) => !arKeys.has(k));
    const missingInEn = [...arKeys].filter((k) => !enKeys.has(k));

    // Check for duplicate keys (case-insensitive)
    const enLowerMap = new Map<string, string[]>();
    for (const key of enKeys) {
      const lower = key.toLowerCase();
      if (!enLowerMap.has(lower)) {
        enLowerMap.set(lower, []);
      }
      enLowerMap.get(lower)!.push(key);
    }

    const duplicates: string[] = [];
    for (const [, keys] of enLowerMap) {
      if (keys.length > 1) {
        duplicates.push(...keys);
      }
    }

    return {
      domain,
      enCount: enKeys.size,
      arCount: arKeys.size,
      diff: enKeys.size - arKeys.size,
      missingInEn,
      missingInAr,
      duplicates,
      enKeys: [...enKeys],
      arKeys: [...arKeys],
    };
  } catch (err) {
    console.error(`❌ Failed to analyze ${domain}:`, err);
    return null;
  }
}

/**
 * Generate comprehensive parity report
 */
function generateReport(domainFilter?: string): ParityReport {
  if (!fs.existsSync(SOURCES_DIR)) {
    console.error(`❌ Sources directory not found: ${SOURCES_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(SOURCES_DIR)
    .filter((f) => f.endsWith(".translations.json"))
    .filter((f) => !domainFilter || f.startsWith(domainFilter))
    .sort();

  if (files.length === 0) {
    console.error(`❌ No translation files found in ${SOURCES_DIR}`);
    process.exit(1);
  }

  const domainDetails: DomainParity[] = [];
  let totalEnKeys = 0;
  let totalArKeys = 0;
  let totalMissingEn = 0;
  let totalMissingAr = 0;
  let perfectParity = 0;
  let minorDrift = 0;
  let majorDrift = 0;
  const allEnKeys = new Set<string>();
  const allArKeys = new Set<string>();

  for (const file of files) {
    const domain = file.replace(".translations.json", "");
    const filePath = path.join(SOURCES_DIR, file);
    const analysis = analyzeDomain(domain, filePath);

    if (!analysis) continue;

    domainDetails.push(analysis);
    totalEnKeys += analysis.enCount;
    totalArKeys += analysis.arCount;
    totalMissingEn += analysis.missingInEn.length;
    totalMissingAr += analysis.missingInAr.length;
    analysis.enKeys.forEach((key) => allEnKeys.add(key));
    analysis.arKeys.forEach((key) => allArKeys.add(key));

    const absDiff = Math.abs(analysis.diff);
    if (absDiff === 0) {
      perfectParity++;
    } else if (absDiff < 5) {
      minorDrift++;
    } else {
      majorDrift++;
    }
  }

  const catalogParity = computeCatalogParity(allEnKeys, allArKeys);
  const catalogIssues = catalogParity.filter(
    (c) =>
      c.missingKeys.length > 0 ||
      c.extraKeys.length > 0 ||
      c.expectedCount !== c.actualCount,
  ).length;

  return {
    timestamp: new Date().toISOString(),
    totalDomains: domainDetails.length,
    totalEnKeys,
    totalArKeys,
    domainsWithIssues: minorDrift + majorDrift,
    catalogIssues,
    domainDetails,
    catalogParity,
    summary: {
      perfectParity,
      minorDrift,
      majorDrift,
      totalMissingEn,
      totalMissingAr,
    },
  };
}

function computeCatalogParity(
  allEnKeys: Set<string>,
  allArKeys: Set<string>,
): CatalogParity[] {
  const locales: Array<{
    keySet: Set<string>;
    locale: "en" | "ar";
    catalog: FlatTranslationMap;
  }> = [
    { keySet: allEnKeys, locale: "en", catalog: newTranslations.en },
    { keySet: allArKeys, locale: "ar", catalog: newTranslations.ar },
  ];

  return locales.map(({ keySet, locale, catalog }) => {
    const catalogKeys = new Set(Object.keys(catalog ?? {}));
    const missingKeys = [...keySet].filter((key) => !catalogKeys.has(key));
    const extraKeys = [...catalogKeys].filter((key) => !keySet.has(key));
    return {
      locale,
      expectedCount: keySet.size,
      actualCount: catalogKeys.size,
      missingKeys,
      extraKeys,
    };
  });
}

/**
 * Print report in human-readable text format
 */
function printTextReport(
  report: ParityReport,
  showDetails: boolean = true,
): void {
  console.log(
    "\n═══════════════════════════════════════════════════════════════════════",
  );
  console.log("                    TRANSLATION PARITY REPORT");
  console.log(
    "═══════════════════════════════════════════════════════════════════════\n",
  );

  console.log(`📅 Generated: ${new Date(report.timestamp).toLocaleString()}`);
  console.log(`📂 Analyzed: ${report.totalDomains} domain files\n`);

  console.log("📊 OVERALL STATISTICS\n");
  console.log(
    `   Total English keys:     ${report.totalEnKeys.toLocaleString()}`,
  );
  console.log(
    `   Total Arabic keys:      ${report.totalArKeys.toLocaleString()}`,
  );
  console.log(
    `   Overall difference:     ${(report.totalEnKeys - report.totalArKeys).toLocaleString()} keys`,
  );
  console.log(
    `   Coverage:               ${((Math.min(report.totalEnKeys, report.totalArKeys) / Math.max(report.totalEnKeys, report.totalArKeys)) * 100).toFixed(2)}%\n`,
  );

  console.log("🎯 DOMAIN PARITY BREAKDOWN\n");
  console.log(
    `   ✅ Perfect parity:      ${report.summary.perfectParity} domains (${((report.summary.perfectParity / report.totalDomains) * 100).toFixed(1)}%)`,
  );
  console.log(
    `   ⚠️  Minor drift (<5):   ${report.summary.minorDrift} domains (${((report.summary.minorDrift / report.totalDomains) * 100).toFixed(1)}%)`,
  );
  console.log(
    `   ❌ Major drift (≥5):    ${report.summary.majorDrift} domains (${((report.summary.majorDrift / report.totalDomains) * 100).toFixed(1)}%)\n`,
  );

  console.log("📁 CATALOG SYNC STATUS\n");
  for (const locale of report.catalogParity) {
    const icon =
      locale.missingKeys.length === 0 &&
      locale.extraKeys.length === 0 &&
      locale.expectedCount === locale.actualCount
        ? "✅"
        : "⚠️";
    const diff = locale.actualCount - locale.expectedCount;
    console.log(
      `   ${icon} ${locale.locale.toUpperCase()} catalog: expected ${locale.expectedCount.toLocaleString()} keys, found ${locale.actualCount.toLocaleString()} (${diff >= 0 ? "+" : ""}${diff})`,
    );
    if (locale.missingKeys.length > 0) {
      console.log(
        `      Missing keys (${locale.missingKeys.length}): ${locale.missingKeys.slice(0, 3).join(", ")}${locale.missingKeys.length > 3 ? ` (+${locale.missingKeys.length - 3} more)` : ""}`,
      );
    }
    if (locale.extraKeys.length > 0) {
      console.log(
        `      Extra keys (${locale.extraKeys.length}): ${locale.extraKeys.slice(0, 3).join(", ")}${locale.extraKeys.length > 3 ? ` (+${locale.extraKeys.length - 3} more)` : ""}`,
      );
    }
  }
  console.log("");

  if (report.domainsWithIssues > 0 && showDetails) {
    console.log("⚠️  DOMAINS WITH PARITY ISSUES\n");
    console.log(
      "   Domain                                      EN      AR      Diff    Missing",
    );
    console.log("   ─".repeat(85));

    // Sort by absolute difference (largest first)
    const issuesOnly = report.domainDetails
      .filter((d) => d.diff !== 0)
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    for (const domain of issuesOnly.slice(0, 25)) {
      const icon = Math.abs(domain.diff) >= 5 ? "❌" : "⚠️ ";
      const diffStr = domain.diff > 0 ? `+${domain.diff}` : String(domain.diff);
      const missingInfo =
        domain.missingInEn.length > 0
          ? `${domain.missingInEn.length} in EN`
          : `${domain.missingInAr.length} in AR`;

      console.log(
        `   ${icon} ${domain.domain.padEnd(40)} ${String(domain.enCount).padStart(6)} ${String(domain.arCount).padStart(6)} ${diffStr.padStart(8)}  ${missingInfo}`,
      );

      // Show sample missing keys for major drift
      if (
        Math.abs(domain.diff) >= 5 &&
        (domain.missingInEn.length > 0 || domain.missingInAr.length > 0)
      ) {
        if (domain.missingInEn.length > 0) {
          console.log(
            `      Missing in EN: ${domain.missingInEn.slice(0, 3).join(", ")}${domain.missingInEn.length > 3 ? ` (+${domain.missingInEn.length - 3} more)` : ""}`,
          );
        }
        if (domain.missingInAr.length > 0) {
          console.log(
            `      Missing in AR: ${domain.missingInAr.slice(0, 3).join(", ")}${domain.missingInAr.length > 3 ? ` (+${domain.missingInAr.length - 3} more)` : ""}`,
          );
        }
      }
    }

    if (issuesOnly.length > 25) {
      console.log(
        `\n   ... and ${issuesOnly.length - 25} more domains with parity issues`,
      );
    }

    console.log(
      "\n   💡 Use --domain=<name> to see detailed key-level analysis for a specific domain",
    );
  }

  // Check for duplicates
  const domainsWithDuplicates = report.domainDetails.filter(
    (d) => d.duplicates.length > 0,
  );
  if (domainsWithDuplicates.length > 0) {
    console.log("\n\n⚠️  CASE-INSENSITIVE DUPLICATE KEYS DETECTED\n");
    for (const domain of domainsWithDuplicates) {
      console.log(`   ${domain.domain}: ${domain.duplicates.join(", ")}`);
    }
  }

  console.log(
    "\n═══════════════════════════════════════════════════════════════════════\n",
  );

  // Exit with error code if issues found
  if (report.domainsWithIssues > 0 || report.catalogIssues > 0) {
    console.log(
      "⚠️  Parity issues detected. These should be reviewed before deployment.\n",
    );

    // Provide actionable next steps
    console.log("📋 RECOMMENDED ACTIONS:\n");
    console.log("   1. Review missing keys in major drift domains");
    console.log("   2. Add missing translations to appropriate locale");
    console.log(
      "   3. Run: pnpm i18n:build (regenerates dictionaries + new-translations.ts)",
    );
    console.log(
      "   4. Re-run this check to verify sources and catalog stay in sync\n",
    );

    process.exit(1);
  } else {
    console.log(
      "✅ All domains have perfect parity, and catalog files match the modular sources!\n",
    );
  }
}

/**
 * Print detailed analysis for a specific domain
 */
function printDomainDetail(report: ParityReport, domainName: string): void {
  const domain = report.domainDetails.find((d) => d.domain === domainName);

  if (!domain) {
    console.error(`❌ Domain not found: ${domainName}`);
    process.exit(1);
  }

  console.log(
    `\n═══════════════════════════════════════════════════════════════════════`,
  );
  console.log(`                    DOMAIN: ${domainName}`);
  console.log(
    `═══════════════════════════════════════════════════════════════════════\n`,
  );

  console.log(`📊 Statistics:`);
  console.log(`   English keys:  ${domain.enCount}`);
  console.log(`   Arabic keys:   ${domain.arCount}`);
  console.log(
    `   Difference:    ${domain.diff > 0 ? "+" : ""}${domain.diff}\n`,
  );

  if (domain.missingInAr.length > 0) {
    console.log(`❌ Missing in Arabic (${domain.missingInAr.length} keys):\n`);
    for (const key of domain.missingInAr) {
      console.log(`   - ${key}`);
    }
    console.log("");
  }

  if (domain.missingInEn.length > 0) {
    console.log(`❌ Missing in English (${domain.missingInEn.length} keys):\n`);
    for (const key of domain.missingInEn) {
      console.log(`   - ${key}`);
    }
    console.log("");
  }

  if (domain.duplicates.length > 0) {
    console.log(
      `⚠️  Case-insensitive duplicates (${domain.duplicates.length} keys):\n`,
    );
    for (const key of domain.duplicates) {
      console.log(`   - ${key}`);
    }
    console.log("");
  }

  if (domain.diff === 0 && domain.duplicates.length === 0) {
    console.log(`✅ Perfect parity - no issues detected!\n`);
  }

  console.log(
    `═══════════════════════════════════════════════════════════════════════\n`,
  );
}

/**
 * Print report in JSON format (for CI consumption)
 */
function printJsonReport(report: ParityReport): void {
  console.log(JSON.stringify(report, null, 2));
}

// Main execution
const { format, domain } = parseArgs();
const report = generateReport(domain);

if (format === "json") {
  printJsonReport(report);
} else if (domain) {
  printDomainDetail(report, domain);
} else {
  printTextReport(report);
}
