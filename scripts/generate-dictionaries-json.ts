import {
  mkdirSync,
  writeFileSync,
  readdirSync,
  readFileSync,
  existsSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "i18n", "generated");
const SOURCES_DIR = path.join(ROOT, "i18n", "sources");
const FLAT_BUNDLE_PATH = path.join(ROOT, "i18n", "new-translations.ts");

// All supported locales (must match config/language-options.ts)
// Only EN/AR have real translations - FR/PT/RU/ES/UR/HI/ZH removed until translation budget approved
const ALL_LOCALES = ["en", "ar"] as const;
type Locale = (typeof ALL_LOCALES)[number];

/**
 * Write dictionary as FLAT JSON (no runtime flattening needed)
 */
function writeFlatDictionary(
  locale: string,
  flatTranslations: Record<string, string>,
) {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const filePath = path.join(OUTPUT_DIR, `${locale}.dictionary.json`);
  // Write flat structure directly (sortedentries for determinism)
  const sorted = Object.fromEntries(
    Object.entries(flatTranslations).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(filePath, JSON.stringify(sorted, null, 2) + "\n", "utf-8");
  console.log(
    `✓ Wrote ${filePath} (${Object.keys(flatTranslations).length} keys)`,
  );
}

function escapeValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function formatFlatEntries(flatTranslations: Record<string, string>): string {
  return Object.entries(flatTranslations)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `    '${key}': '${escapeValue(value)}',`)
    .join("\n");
}

function writeFlatBundle(
  enFlat: Record<string, string>,
  arFlat: Record<string, string>,
) {
  const fileContents = `/* Auto-generated via pnpm run i18n:build */\nimport type { TranslationBundle } from './dictionaries/types';\n\nexport const newTranslations: TranslationBundle = {\n  en: {\n${formatFlatEntries(enFlat)}\n  },\n  ar: {\n${formatFlatEntries(arFlat)}\n  }\n};\n`;

  writeFileSync(FLAT_BUNDLE_PATH, fileContents, "utf-8");
  console.log(`✓ Wrote ${FLAT_BUNDLE_PATH}`);
}

/**
 * Load all modular translation sources from i18n/sources/*.translations.json
 * @returns Combined flat translations for ALL locales
 */
function loadModularSources(): Record<Locale, Record<string, string>> {
  const result: Record<Locale, Record<string, string>> = {
    en: {},
    ar: {},
    fr: {},
    pt: {},
    ru: {},
    es: {},
    ur: {},
    hi: {},
    zh: {},
  };
  const parityWarnings: string[] = [];

  if (!existsSync(SOURCES_DIR)) {
    console.error(`❌ Sources directory not found: ${SOURCES_DIR}`);
    console.error(`   Run: npx tsx scripts/flatten-base-dictionaries.ts`);
    process.exit(1);
  }

  const files = readdirSync(SOURCES_DIR)
    .filter((f) => f.endsWith(".translations.json"))
    .sort(); // Deterministic order

  if (files.length === 0) {
    console.error(`❌ No modular source files found in ${SOURCES_DIR}`);
    console.error(`   Run: npx tsx scripts/flatten-base-dictionaries.ts`);
    process.exit(1);
  }

  console.log(
    `📦 Loading ${files.length} modular source files for ${ALL_LOCALES.length} locales...\n`,
  );

  for (const file of files) {
    const filePath = path.join(SOURCES_DIR, file);
    try {
      const content = readFileSync(filePath, "utf-8");
      const bundle = JSON.parse(content);

      // Extract per-locale data from this source file
      const localeData: Partial<Record<Locale, Record<string, string>>> = {};
      for (const locale of ALL_LOCALES) {
        localeData[locale] = { ...(bundle[locale] || {}) };
      }

      // Get union of all keys across all locales in this file
      const unionKeys = new Set<string>();
      for (const locale of ALL_LOCALES) {
        Object.keys(localeData[locale] || {}).forEach((k) => unionKeys.add(k));
      }

      // Normalize: fill missing keys from EN (or AR if EN missing)
      for (const key of unionKeys) {
        const enValue = localeData.en?.[key];
        const arValue = localeData.ar?.[key];
        const fallback = enValue || arValue || `[MISSING: ${key}]`;

        let missingLocales = 0;
        for (const locale of ALL_LOCALES) {
          if (!localeData[locale]?.[key]) {
            result[locale][key] = fallback;
            missingLocales++;
          } else {
            result[locale][key] = localeData[locale][key];
          }
        }

        if (missingLocales > 0) {
          parityWarnings.push(
            `${file}:${key} (missing in ${missingLocales} locales)`,
          );
        }
      }

      // Log progress
      const counts = ALL_LOCALES.map(
        (loc) => Object.keys(localeData[loc] || {}).length,
      );
      const countStr = counts
        .slice(0, 3)
        .map((c) => String(c).padStart(4))
        .join("/");
      console.log(`  ✓ ${file.padEnd(45)} (${countStr} keys...)`);
    } catch (err) {
      console.error(`  ✗ Failed to load ${file}:`, err);
      process.exit(1);
    }
  }

  if (parityWarnings.length > 0) {
    console.warn(
      `\n⚠️  ${parityWarnings.length} keys were missing in one or more locales (auto-filled). ` +
        "Run `pnpm run scan:i18n:audit` to identify the offending files.",
    );
    if (parityWarnings.length > 10) {
      console.warn(`   First 10 issues:`);
      parityWarnings.slice(0, 10).forEach((w) => console.warn(`     - ${w}`));
      console.warn(`   ... and ${parityWarnings.length - 10} more`);
    }
  }

  // Validate counts
  const counts = ALL_LOCALES.map((loc) => ({
    locale: loc,
    count: Object.keys(result[loc]).length,
  }));

  console.log("\n📊 Final locale key counts:");
  counts.forEach(({ locale, count }) => {
    console.log(`   ${locale}: ${count.toLocaleString()}`);
  });

  const maxCount = Math.max(...counts.map((c) => c.count));
  const minCount = Math.min(...counts.map((c) => c.count));
  const variance = maxCount - minCount;

  if (variance > 100) {
    console.error(
      `\n❌ Locale count variance too large: ${variance} keys (${minCount} to ${maxCount})`,
    );
    console.error(
      "   This indicates significant missing translations. Check source files.",
    );
    process.exit(1);
  } else if (variance > 0) {
    console.warn(
      `\n⚠️  Minor variance: ${variance} keys difference across locales`,
    );
  }

  return result;
}

// Step 1: Load all modular sources (this is now the ONLY source of truth)
const modularSources = loadModularSources();

// Step 2: Write flat dictionaries for ALL locales (no runtime flattening needed)
console.log("\n💾 Writing generated flat dictionaries for all locales...");
for (const locale of ALL_LOCALES) {
  writeFlatDictionary(locale, modularSources[locale]);
}

// Step 3: Write legacy flat bundle (for build scripts that still import it)
console.log("\n📦 Writing legacy flat bundle (new-translations.ts)...");
writeFlatBundle(modularSources.en, modularSources.ar);

console.log("\n✅ Dictionary generation complete!");
console.log(`📊 Generated ${ALL_LOCALES.length} locale files:`);
ALL_LOCALES.forEach((loc) => {
  const count = Object.keys(modularSources[loc]).length;
  console.log(`   ${loc}: ${count.toLocaleString()} keys`);
});
console.log(
  `\n💡 All translations now come from i18n/sources/*.translations.json`,
);
console.log(
  `   Runtime loads flat JSON directly (no nested structure flattening)`,
);
