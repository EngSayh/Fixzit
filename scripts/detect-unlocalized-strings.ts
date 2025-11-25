#!/usr/bin/env tsx
/**
 * Detect Unlocalized Strings - High-Fidelity Locale Coverage Analysis
 *
 * Compares each locale against EN dictionary to identify auto-filled/identical strings.
 * Generates detailed coverage reports and can fail CI if thresholds aren't met.
 *
 * Usage:
 *   # Audit default locales (EN + AR)
 *   npx tsx scripts/detect-unlocalized-strings.ts
 *   pnpm i18n:coverage
 *
 *   # Audit only EN/AR (same as default)
 *   npx tsx scripts/detect-unlocalized-strings.ts --locales=en,ar
 *
 *   # Allow AR fallback (treat identical-to-AR as valid translation)
 *   npx tsx scripts/detect-unlocalized-strings.ts --allow-ar-fallback
 *
 *   # CI integration (fail if >50% unlocalized)
 *   npx tsx scripts/detect-unlocalized-strings.ts --fail-threshold=0.5
 *   pnpm i18n:coverage:fail
 *
 *   # Strict CI mode (fail if >10% unlocalized)
 *   npx tsx scripts/detect-unlocalized-strings.ts --fail-threshold=0.1
 *   pnpm i18n:coverage:strict
 *
 *   # Show sample unlocalized keys
 *   npx tsx scripts/detect-unlocalized-strings.ts --show-samples=20
 *
 *   # Export JSON for tracking over time
 *   npx tsx scripts/detect-unlocalized-strings.ts --format=json > coverage-$(date +%Y%m%d).json
 *
 *   # Silent mode (for scripts)
 *   npx tsx scripts/detect-unlocalized-strings.ts --silent
 *
 * Flags:
 *   --locales=en,ar            Comma-separated list of locales to audit (default: both)
 *   --locale=en                Single locale to audit (deprecated, use --locales)
 *   --allow-ar-fallback        Treat identical-to-AR as valid translation
 *   --fail-threshold=0.9       Exit 1 if any locale >90% unlocalized (default: 0.9)
 *   --show-samples             Show sample unlocalized keys
 *   --show-samples=20          Show N sample keys per locale
 *   --format=json              Output JSON instead of human-readable report
 *   --silent                   Suppress console output (still writes artifacts)
 *
 * Exit Codes:
 *   0 - All locales meet threshold
 *   1 - One or more locales exceed threshold (too many EN matches)
 *   2 - Missing dictionary files or parsing errors
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const GENERATED_DIR = path.join(ROOT, "i18n", "generated");
const OUTPUT_DIR = path.join(ROOT, "_artifacts");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "i18n-locale-coverage.json");

const ALL_LOCALES = ["en", "ar"] as const;
type Locale = (typeof ALL_LOCALES)[number];

function resolveLocales(arg?: string): Locale[] {
  if (!arg) {
    return [...ALL_LOCALES];
  }

  const requested = arg
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean) as Locale[];

  const invalid = requested.filter((locale) => !ALL_LOCALES.includes(locale));
  if (invalid.length > 0) {
    console.warn(
      `⚠️  Ignoring unsupported locale(s): ${invalid.join(", ")}. ` +
        `Valid options: ${ALL_LOCALES.join(", ")}`,
    );
  }

  const filtered = requested.filter((locale) => ALL_LOCALES.includes(locale));
  return filtered.length > 0 ? filtered : [...ALL_LOCALES];
}

interface LocaleCoverage {
  locale: Locale;
  totalKeys: number;
  uniqueStrings: number;
  identicalToEN: number;
  identicalToAR: number;
  caseInsensitiveMatches: number;
  whitespaceOnlyDiff: number;
  actuallyLocalized: number;
  coveragePercent: number;
  unlocalizedPercent: number;
  topUnlocalizedKeys: Array<{ key: string; value: string }>;
}

interface CoverageReport {
  timestamp: string;
  generatedBy: string;
  summary: {
    totalLocales: number;
    sourceLocales: string[];
    targetLocales: string[];
    overallCoverage: number;
    unlocalizedSlots: number;
    totalSlots: number;
  };
  locales: LocaleCoverage[];
  recommendations: string[];
}

/**
 * Normalize string for comparison (lowercase, trim, collapse whitespace)
 */
function normalizeString(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Check if two strings are semantically identical
 */
function areStringsIdentical(
  str1: string,
  str2: string,
): {
  exact: boolean;
  caseInsensitive: boolean;
  whitespaceOnly: boolean;
} {
  const exact = str1 === str2;
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);
  const caseInsensitive = !exact && normalized1 === normalized2;
  const whitespaceOnly =
    !exact &&
    !caseInsensitive &&
    str1.replace(/\s+/g, "") === str2.replace(/\s+/g, "");

  return { exact, caseInsensitive, whitespaceOnly };
}

/**
 * Load all locale dictionaries
 */
function loadDictionaries(
  locales: Locale[],
): Record<Locale, Record<string, string>> {
  const result: Partial<Record<Locale, Record<string, string>>> = {};
  const missing: string[] = [];

  for (const locale of locales) {
    const filePath = path.join(GENERATED_DIR, `${locale}.dictionary.json`);

    if (!existsSync(filePath)) {
      missing.push(locale);
      continue;
    }

    try {
      const content = readFileSync(filePath, "utf-8");
      result[locale] = JSON.parse(content);
    } catch (err) {
      console.error(`❌ Failed to parse ${locale} dictionary:`, err);
      process.exit(2);
    }
  }

  if (missing.length > 0) {
    console.error(`❌ Missing dictionary files: ${missing.join(", ")}`);
    console.error(`   Run: pnpm i18n:build`);
    process.exit(2);
  }

  return result as Record<Locale, Record<string, string>>;
}

/**
 * Analyze a single locale against EN reference
 */
function analyzeLocale(
  locale: Locale,
  localeDict: Record<string, string>,
  enDict: Record<string, string>,
  arDict: Record<string, string>,
  showSamplesCount = 10,
  allowArFallback = false,
): LocaleCoverage {
  // EN and AR are source locales - they're 100% "localized" by definition
  if (locale === "en" || locale === "ar") {
    return {
      locale,
      totalKeys: Object.keys(localeDict).length,
      uniqueStrings: Object.keys(localeDict).length,
      identicalToEN: 0,
      identicalToAR: 0,
      caseInsensitiveMatches: 0,
      whitespaceOnlyDiff: 0,
      actuallyLocalized: Object.keys(localeDict).length,
      coveragePercent: 100,
      unlocalizedPercent: 0,
      topUnlocalizedKeys: [],
    };
  }

  let identicalToEN = 0;
  let identicalToAR = 0;
  let caseInsensitiveMatches = 0;
  let whitespaceOnlyDiff = 0;
  const unlocalizedKeys: Array<{ key: string; value: string }> = [];

  for (const [key, value] of Object.entries(localeDict)) {
    const enValue = enDict[key];
    const arValue = arDict[key];

    if (!enValue) continue; // Skip keys that don't exist in EN

    // Check exact match with EN
    if (value === enValue) {
      identicalToEN++;
      if (unlocalizedKeys.length < showSamplesCount) {
        unlocalizedKeys.push({ key, value });
      }
      continue;
    }

    // Check exact match with AR
    if (value === arValue) {
      identicalToAR++;
      if (!allowArFallback && unlocalizedKeys.length < showSamplesCount) {
        unlocalizedKeys.push({ key, value });
      }
      continue;
    }

    // Check case-insensitive match
    const comparison = areStringsIdentical(value, enValue);
    if (comparison.caseInsensitive) {
      caseInsensitiveMatches++;
      if (unlocalizedKeys.length < showSamplesCount) {
        unlocalizedKeys.push({ key, value });
      }
      continue;
    }

    // Check whitespace-only difference
    if (comparison.whitespaceOnly) {
      whitespaceOnlyDiff++;
      if (unlocalizedKeys.length < showSamplesCount) {
        unlocalizedKeys.push({ key, value });
      }
    }
  }

  const totalKeys = Object.keys(localeDict).length;
  const arFallbackCount = allowArFallback ? 0 : identicalToAR;
  const unlocalizedCount =
    identicalToEN +
    caseInsensitiveMatches +
    whitespaceOnlyDiff +
    arFallbackCount;
  const actuallyLocalized = totalKeys - unlocalizedCount;
  const coveragePercent = (actuallyLocalized / totalKeys) * 100;
  const unlocalizedPercent = (unlocalizedCount / totalKeys) * 100;

  return {
    locale,
    totalKeys,
    uniqueStrings: actuallyLocalized,
    identicalToEN,
    identicalToAR,
    caseInsensitiveMatches,
    whitespaceOnlyDiff,
    actuallyLocalized,
    coveragePercent,
    unlocalizedPercent,
    topUnlocalizedKeys: unlocalizedKeys,
  };
}

/**
 * Generate recommendations based on coverage analysis
 */
function generateRecommendations(
  locales: LocaleCoverage[],
  sourceLocales: Locale[],
): string[] {
  const recommendations: string[] = [];
  const targetLocales = locales.filter(
    (l) => !sourceLocales.includes(l.locale),
  );

  // Check for completely unlocalized locales
  const completelyUnlocalized = targetLocales.filter(
    (l) => l.coveragePercent === 0,
  );
  if (completelyUnlocalized.length > 0) {
    recommendations.push(
      `CRITICAL: ${completelyUnlocalized.length} locale(s) are 100% auto-filled: ` +
        completelyUnlocalized.map((l) => l.locale.toUpperCase()).join(", ") +
        `. These should either be removed from ALL_LOCALES or professionally translated.`,
    );
  }

  // Check for partially localized locales
  const partiallyLocalized = targetLocales.filter(
    (l) => l.coveragePercent > 0 && l.coveragePercent < 50,
  );
  if (partiallyLocalized.length > 0) {
    recommendations.push(
      `WARNING: ${partiallyLocalized.length} locale(s) are partially localized (<50%): ` +
        partiallyLocalized
          .map(
            (l) =>
              `${l.locale.toUpperCase()} (${l.coveragePercent.toFixed(1)}%)`,
          )
          .join(", ") +
        `. Complete translation work or remove these locales.`,
    );
  }

  // Calculate cost estimate
  const totalUnlocalized = targetLocales.reduce(
    (sum, l) => sum + l.identicalToEN,
    0,
  );
  if (totalUnlocalized > 100000) {
    const estimatedWords = Math.round(totalUnlocalized * 2.5); // ~2.5 words per key average
    const lowCost = Math.round(estimatedWords * 0.1);
    const highCost = Math.round(estimatedWords * 0.2);
    recommendations.push(
      `BUDGET: Professional translation required for ~${estimatedWords.toLocaleString()} words. ` +
        `Estimated cost: $${lowCost.toLocaleString()}-${highCost.toLocaleString()} USD.`,
    );
  }

  // Infrastructure optimization
  if (completelyUnlocalized.length >= 5) {
    recommendations.push(
      `OPTIMIZATION: Consider removing unused locales from ALL_LOCALES in scripts/generate-dictionaries-json.ts ` +
        `to reduce build time and artifact size. Keep only EN/AR until translation budget is approved.`,
    );
  }

  return recommendations;
}

/**
 * Print human-readable report to console
 */
function printReport(report: CoverageReport, showSamples = false) {
  console.log("🔍 High-Fidelity Locale Coverage Analysis\n");
  console.log(`Generated: ${report.timestamp}`);
  console.log(`Source Locales: ${report.summary.sourceLocales.join(", ")}`);
  console.log(`Target Locales: ${report.summary.targetLocales.join(", ")}\n`);

  // Summary table
  console.log("📊 Coverage Summary:\n");
  console.log(
    "Locale | Total Keys | Localized | Identical to EN | Coverage | Unlocalized %",
  );
  console.log(
    "-------|------------|-----------|-----------------|----------|---------------",
  );

  for (const locale of report.locales) {
    const loc = locale.locale.padEnd(6);
    const total = String(locale.totalKeys).padStart(10);
    const localized = String(locale.actuallyLocalized).padStart(9);
    const identical = String(locale.identicalToEN).padStart(15);
    const coverage = `${locale.coveragePercent.toFixed(1)}%`.padStart(8);
    const unlocalized = `${locale.unlocalizedPercent.toFixed(1)}%`.padStart(14);

    const emoji =
      locale.coveragePercent === 100
        ? "✅"
        : locale.coveragePercent === 0
          ? "❌"
          : locale.coveragePercent >= 50
            ? "⚠️"
            : "🚨";

    console.log(
      `${emoji} ${loc} | ${total} | ${localized} | ${identical} | ${coverage} | ${unlocalized}`,
    );
  }

  // Aggregate stats
  console.log("\n📈 Aggregate Statistics:");
  console.log(
    `   Total translation slots: ${report.summary.totalSlots.toLocaleString()}`,
  );
  console.log(
    `   Localized slots: ${(report.summary.totalSlots - report.summary.unlocalizedSlots).toLocaleString()}`,
  );
  console.log(
    `   Unlocalized slots: ${report.summary.unlocalizedSlots.toLocaleString()}`,
  );
  console.log(
    `   Overall coverage: ${report.summary.overallCoverage.toFixed(1)}%`,
  );

  // Recommendations
  if (report.recommendations.length > 0) {
    console.log("\n💡 Recommendations:\n");
    report.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}\n`);
    });
  }

  // Show samples if requested
  if (showSamples) {
    const targetLocales = report.locales.filter(
      (l) => l.locale !== "en" && l.locale !== "ar",
    );
    for (const locale of targetLocales) {
      if (locale.topUnlocalizedKeys.length > 0) {
        console.log(
          `\n🔍 Sample unlocalized keys for ${locale.locale.toUpperCase()}:\n`,
        );
        locale.topUnlocalizedKeys.forEach(({ key, value }) => {
          console.log(`   ${key.padEnd(50)} | "${value}"`);
        });
      }
    }
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const failThreshold = parseFloat(
    args.find((arg) => arg.startsWith("--fail-threshold="))?.split("=")[1] ||
      "0.9",
  );
  const targetLocale = args
    .find((arg) => arg.startsWith("--locale="))
    ?.split("=")[1] as Locale | undefined;
  const showSamplesCount = parseInt(
    args.find((arg) => arg.startsWith("--show-samples="))?.split("=")[1] ||
      "10",
  );
  const showSamples =
    args.includes("--show-samples") ||
    args.some((arg) => arg.startsWith("--show-samples="));
  const formatJson = args.includes("--format=json");
  const silent = args.includes("--silent");
  const localesArg = args
    .find((arg) => arg.startsWith("--locales="))
    ?.split("=")[1];
  const allowArFallback = args.includes("--allow-ar-fallback");
  const activeLocales = resolveLocales(localesArg);
  const defaultSources: Locale[] = ["en", "ar"];
  const effectiveSources = defaultSources.filter((loc) =>
    activeLocales.includes(loc),
  );

  // Load dictionaries
  if (!silent) console.log("📦 Loading dictionaries...\n");
  const dicts = loadDictionaries(activeLocales);

  // Analyze all locales
  const locales: LocaleCoverage[] = [];
  for (const locale of activeLocales) {
    if (targetLocale && locale !== targetLocale) continue;

    const coverage = analyzeLocale(
      locale,
      dicts[locale],
      dicts.en,
      dicts.ar,
      showSamplesCount,
      allowArFallback,
    );
    locales.push(coverage);
  }

  // Calculate aggregate stats
  const targetLocales = locales.filter(
    (l) => !effectiveSources.includes(l.locale),
  );
  const totalSlots = targetLocales.reduce((sum, l) => sum + l.totalKeys, 0);
  const unlocalizedSlots = targetLocales.reduce(
    (sum, l) => sum + (l.totalKeys - l.actuallyLocalized),
    0,
  );
  const overallCoverage =
    totalSlots > 0 ? ((totalSlots - unlocalizedSlots) / totalSlots) * 100 : 100;

  // Generate recommendations
  const recommendations = generateRecommendations(locales, effectiveSources);

  // Build report
  const report: CoverageReport = {
    timestamp: new Date().toISOString(),
    generatedBy: "scripts/detect-unlocalized-strings.ts",
    summary: {
      totalLocales: locales.length,
      sourceLocales: effectiveSources,
      targetLocales: targetLocales.map((l) => l.locale),
      overallCoverage,
      unlocalizedSlots,
      totalSlots,
    },
    locales,
    recommendations,
  };

  // Save to artifacts
  if (!formatJson) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
    writeFileSync(OUTPUT_FILE, JSON.stringify(report, null, 2), "utf-8");
    if (!silent) console.log(`\n💾 Report saved to: ${OUTPUT_FILE}\n`);
  }

  // Output report
  if (formatJson) {
    console.log(JSON.stringify(report, null, 2));
  } else if (!silent) {
    printReport(report, showSamples);
  }

  // Check thresholds and exit
  const failingLocales = targetLocales.filter(
    (l) => l.unlocalizedPercent > failThreshold * 100,
  );

  if (failingLocales.length > 0) {
    if (!silent) {
      console.log(
        `\n❌ THRESHOLD EXCEEDED: ${failingLocales.length} locale(s) have >${(failThreshold * 100).toFixed(0)}% unlocalized strings:\n`,
      );
      failingLocales.forEach((l) => {
        console.log(
          `   ${l.locale.toUpperCase()}: ${l.unlocalizedPercent.toFixed(1)}% unlocalized (${l.identicalToEN}/${l.totalKeys} keys)`,
        );
      });
      console.log(
        `\n💡 To pass: Reduce --fail-threshold or complete translation work for these locales.`,
      );
    }
    process.exit(1);
  }

  if (!silent) {
    console.log(
      `\n✅ All locales meet threshold (<${(failThreshold * 100).toFixed(0)}% unlocalized)`,
    );
  }

  process.exit(0);
}

main();
