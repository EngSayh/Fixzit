// tests/i18n-scan.mjs
import { glob } from "glob";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import url from "url";

/**
 * Fixzit i18n Scanner (namespace + nested keys aware)
 * - Loads ALL locale JSON files: i18n/locales/LANG/STAR_STAR/STAR.json
 * - Flattens nested keys (dot notation) and also tracks ns:key variants
 * - Scans source for translation function calls and Trans components
 * - Reports missing per language, suspicious hardcoded text
 * - Emits artifacts/i18n-report.json
 * - Optional: fix mode writes skeletons for missing keys
 *
 * Environment variables and CLI options:
 *  - I18N_LANGS=en,ar
 *  - I18N_SRC=pattern for source files
 *  - I18N_STRICT=true or false (default true, exit 1 on missing)
 *  - I18N_OUTPUT=artifacts/i18n-report.json
 *  - I18N_IGNORE=comma-separated key patterns with wildcard support
 *  - --fix flag emits artifacts/i18n-missing.LANG.json with nested structure
 */

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = process.cwd();

const argv = new Set(process.argv.slice(2));
const FIX_MODE = argv.has("--fix");

const LANGS = (process.env.I18N_LANGS ?? "en,ar")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const SRC_GLOB = process.env.I18N_SRC ?? "**/*.{ts,tsx,js,jsx}";
const STRICT = (process.env.I18N_STRICT ?? "true").toLowerCase() !== "false";
const OUTPUT = process.env.I18N_OUTPUT ?? "_artifacts/i18n-report.json";
const IGNORE_PATTERNS = (process.env.I18N_IGNORE ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map(toGlobRegex); // precompiled

const LOCALE_DIRS = (process.env.I18N_DIRS ?? "i18n/locales,i18n/dictionaries")
  .split(",")
  .map((dir) => dir.trim())
  .filter(Boolean);
const ROOT_LOCALE_FALLBACK = "i18n";

// -------------------------------------------------------------------------------------------------
// Utils
// -------------------------------------------------------------------------------------------------
function log(...args) {
  console.log(...args);
}
function warn(...args) {
  console.warn(...args);
}
function err(...args) {
  console.error(...args);
}

function flattenObject(obj, prefix = "", out = new Set()) {
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object") {
        flattenObject(v, key, out);
      } else {
        out.add(key);
      }
    }
  }
  return out;
}

function toGlobRegex(pat) {
  if (!pat) return /^$/;
  // foo:*  -> ^foo:.*$
  // foo.*  -> ^foo\..*$
  // plain  -> ^plain$
  const esc = pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${esc}$`, "i");
}

function keyVariants(key) {
  // Normalize a used key into variants we will check against:
  //  - original
  //  - colon->dot
  //  - if it has ns:key, also 'key' bare (for default ns)
  const variants = new Set([key]);
  if (key.includes(":")) {
    const [ns, rest] = key.split(":", 2);
    variants.add(`${ns}.${rest}`);
    variants.add(rest);
  } else if (key.includes(".")) {
    // also provide a colon version using a simple heuristic: first segment as ns
    const [first, ...rest] = key.split(".");
    if (first && rest.length) variants.add(`${first}:${rest.join(".")}`);
  }
  return [...variants];
}

function fromDotToNested(keys) {
  // Convert dot keys into nested object for --fix skeletons
  const out = {};
  for (const k of keys) {
    const pathParts = k
      .replace(/^[^:]+:/, "") // drop possible "ns:"
      .split(".");
    let cursor = out;
    while (pathParts.length) {
      const seg = pathParts.shift();
      if (!seg) break;
      if (!cursor[seg]) cursor[seg] = pathParts.length ? {} : "";
      cursor = cursor[seg];
    }
  }
  return out;
}

function matchIgnored(key) {
  return IGNORE_PATTERNS.some((re) => re.test(key));
}

// -------------------------------------------------------------------------------------------------
// 1) Load translation dictionaries (all namespaces)
// -------------------------------------------------------------------------------------------------
log("🔍 Scanning i18n dictionaries...\n");

const dictionaries = {}; // { en: Set(keys), ar: Set(keys) }
const byLangNs = {}; // { en: { nsName: Set(keys) }, ... }

for (const lang of LANGS) {
  dictionaries[lang] = new Set();
  byLangNs[lang] = {};

  const fileSet = new Set();
  for (const dir of LOCALE_DIRS) {
    const pattern = path.join(dir, lang, "**/*.json");
    for (const match of glob.sync(pattern, { dot: false, nodir: true })) {
      fileSet.add(match);
    }
  }
  const rootJson = path.join(ROOT_LOCALE_FALLBACK, `${lang}.json`);
  if (existsSync(rootJson)) {
    fileSet.add(rootJson);
  }

  const files = [...fileSet];

  if (!files.length) {
    warn(
      `⚠️  No locale files found for "${lang}" in ${[...LOCALE_DIRS, ROOT_LOCALE_FALLBACK].join(", ")}`,
    );
  }

  for (const f of files) {
    try {
      const json = JSON.parse(readFileSync(f, "utf8"));
      // flatten
      const flat = flattenObject(json);
      const nsName = path.basename(f, ".json"); // common.json -> 'common'
      if (!byLangNs[lang][nsName]) byLangNs[lang][nsName] = new Set();

      for (const k of flat) {
        // record both "k" and "ns:k" variants for robust lookup
        dictionaries[lang].add(k);
        dictionaries[lang].add(`${nsName}:${k}`);
        byLangNs[lang][nsName].add(k);
      }
    } catch (e) {
      warn(`⚠️  Failed to parse ${f}: ${e.message}`);
    }
  }
  log(
    `✅ ${lang}: loaded ${dictionaries[lang].size} keys from ${files.length} file(s)`,
  );
}

// 1b) (Optional) Extract keys from TranslationContext.tsx as fallback
const translationCtxPath = "contexts/TranslationContext.tsx";
const extractLocaleBlock = (source, localeKey) => {
  const baseIndex = source.indexOf("const baseTranslations");
  const searchSpace = baseIndex >= 0 ? source.slice(baseIndex) : source;
  const keyIndex = searchSpace.indexOf(`${localeKey}:`);
  if (keyIndex === -1) return "";
  const braceStart = searchSpace.indexOf("{", keyIndex);
  if (braceStart === -1) return "";
  let depth = 0;
  for (let i = braceStart; i < searchSpace.length; i++) {
    const ch = searchSpace[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return searchSpace.slice(braceStart, i + 1);
      }
    }
  }
  return "";
};

if (existsSync(translationCtxPath)) {
  try {
    const content = readFileSync(translationCtxPath, "utf8");
    const arBlock = extractLocaleBlock(content, "ar");
    const enBlock = extractLocaleBlock(content, "en");
    const keyRegex = /['"]([^'"]+)['"]\s*:/g;
    const arKeys = arBlock
      ? [...arBlock.matchAll(keyRegex)].map((m) => m[1])
      : [];
    const enKeys = enBlock
      ? [...enBlock.matchAll(keyRegex)].map((m) => m[1])
      : [];

    for (const k of enKeys) {
      dictionaries.en?.add(k);
      dictionaries.en?.add(`common:${k}`);
    }
    for (const k of arKeys) {
      dictionaries.ar?.add(k);
      dictionaries.ar?.add(`common:${k}`);
    }
    if (enKeys.length || arKeys.length) {
      log(
        `✅ TranslationContext fallback: EN +${enKeys.length}, AR +${arKeys.length}`,
      );
    }
  } catch (e) {
    warn(`⚠️  Failed to parse ${translationCtxPath}: ${e.message}`);
  }
}

const generatedTranslationsPath = "i18n/new-translations.ts";
if (existsSync(generatedTranslationsPath)) {
  try {
    const generated = readFileSync(generatedTranslationsPath, "utf8");
    const keyRegex = /'([^']+)'\s*:\s*'[^']*'/g;
    for (const match of generated.matchAll(keyRegex)) {
      const key = match[1];
      dictionaries.en?.add(key);
      dictionaries.ar?.add(key);
    }
    log("✅ Loaded keys from i18n/new-translations.ts");
  } catch (e) {
    warn(`⚠️  Failed to parse ${generatedTranslationsPath}: ${e.message}`);
  }
}

log("");

// -------------------------------------------------------------------------------------------------
// 2) Scan source for used keys
// -------------------------------------------------------------------------------------------------
const sourceFiles = glob.sync(SRC_GLOB, {
  ignore: [
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "tests/**",
    "e2e-test-results/**",
    "playwright-report/**",
    "**/*.test.*",
    "**/*.spec.*",
  ],
});

log(`📂 Scanning ${sourceFiles.length} source files...\n`);

const usedKeys = new Map(); // key -> Set(files)
const fileIssues = []; // suspicious hardcoded text

// Patterns to catch
const RE_T_CALL = /\b(?:i18n\.)?t\s*\(\s*(['"`])([^'"`]+)\1/g; // t('key') / i18n.t('key')
const RE_TRANS_TAG = /<Trans[^>]*\bi18nKey\s*=\s*(['"`])([^'"`]+)\1/gi; // <Trans i18nKey="key" />
// Heuristic for suspicious hardcoded text in JSX
const suspicious = [
  /<h[1-6][^>]*>\s*[A-Z][A-Za-z][^<]+<\/h[1-6]>/g,
  /<button[^>]*>\s*[A-Z][A-Za-z][^<]+<\/button>/g,
  /<label[^>]*>\s*[A-Z][A-Za-z][^<]+<\/label>/g,
];

for (const file of sourceFiles) {
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch (e) {
    warn(`⚠️  Failed to read ${file}: ${e.message}`);
    continue;
  }

  const fileUsed = new Set();

  // t('key') / i18n.t('key')
  for (const m of content.matchAll(RE_T_CALL)) {
    const key = m[2];
    // Skip dynamic keys
    if (/\$\{|\{/.test(key) || !key.trim()) continue;
    fileUsed.add(key);
  }

  // <Trans i18nKey="key">
  for (const m of content.matchAll(RE_TRANS_TAG)) {
    const key = m[2];
    if (key.trim()) fileUsed.add(key);
  }

  if (fileUsed.size) {
    for (const k of fileUsed) {
      if (!usedKeys.has(k)) usedKeys.set(k, new Set());
      usedKeys.get(k).add(file);
    }
  }

  // suspicious hardcoded text if no translation calls in file
  if (fileUsed.size === 0) {
    if (suspicious.some((re) => re.test(content))) {
      fileIssues.push(`⚠️  ${file}: Contains UI text but no translation calls`);
    }
  }
}

log(`✅ Total unique translation keys used: ${usedKeys.size}\n`);

// -------------------------------------------------------------------------------------------------
// 3) Compare used keys vs dictionaries
// -------------------------------------------------------------------------------------------------
const missing = {};
for (const lang of LANGS) {
  missing[lang] = new Set();
}

for (const k of usedKeys.keys()) {
  if (matchIgnored(k)) continue;

  const variants = keyVariants(k);
  const enHas = LANGS.includes("en")
    ? variants.some((v) => dictionaries.en?.has(v))
    : true;

  for (const lang of LANGS) {
    const has = variants.some((v) => dictionaries[lang]?.has(v));
    if (!has) {
      // If English is missing AND lang is not en, we can choose whether to report.
      // Default: report both (they're missing anyway).
      missing[lang].add(k);
    }
  }

  // Optional: if EN missing, you might want to suppress AR missing to avoid double noise.
  // Keep current behavior (report both) to force dictionaries to be aligned.
}

// -------------------------------------------------------------------------------------------------
// 4) Report
// -------------------------------------------------------------------------------------------------
const divider = (c = "=") => c.repeat(80);
log(`\n${divider()}`);
log("📊 SCAN RESULTS");
log(divider());

for (const lang of LANGS) {
  log(`❌ Missing ${lang.toUpperCase()} translations: ${missing[lang].size}`);
}

if (LANGS.includes("en") && missing.en.size) {
  log(`\n${divider("─")}\n❌ MISSING ENGLISH KEYS:\n${divider("─")}`);
  [...missing.en].sort().forEach((k) => log(`  - ${k}`));
}
for (const lang of LANGS) {
  if (lang === "en") continue;
  if (missing[lang].size) {
    log(
      `\n${divider("─")}\n❌ MISSING ${lang.toUpperCase()} KEYS:\n${divider("─")}`,
    );
    [...missing[lang]].sort().forEach((k) => log(`  - ${k}`));
  }
}

if (fileIssues.length) {
  log(`\n${divider("─")}\n⚠️  POTENTIAL HARDCODED TEXT:\n${divider("─")}`);
  fileIssues.slice(0, 30).forEach((i) => log(i));
  if (fileIssues.length > 30)
    log(`  ... and ${fileIssues.length - 30} more files`);
}

log(`\n${divider()}\n`);

// 4b) JSON artifact
try {
  mkdirSync(path.dirname(OUTPUT), { recursive: true });
  const artifact = {
    langs: LANGS,
    usedKeys: [...usedKeys.keys()],
    missing: Object.fromEntries(
      Object.entries(missing).map(([l, s]) => [l, [...s].sort()]),
    ),
    fileIssues,
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(OUTPUT, JSON.stringify(artifact, null, 2), "utf8");
  log(`📝 Wrote report → ${OUTPUT}`);
} catch (e) {
  warn(`⚠️  Could not write report ${OUTPUT}: ${e.message}`);
}

// 4c) --fix: generate skeletons for missing keys (nested JSON)
if (FIX_MODE) {
  for (const lang of LANGS) {
    if (!missing[lang].size) continue;
    const outPath = `_artifacts/i18n-missing.${lang}.json`;
    mkdirSync(path.dirname(outPath), { recursive: true });
    const nested = fromDotToNested(missing[lang]);
    writeFileSync(outPath, JSON.stringify(nested, null, 2), "utf8");
    log(`🧩 Wrote missing skeleton → ${outPath}`);
  }
}

// -------------------------------------------------------------------------------------------------
// 5) Exit
// -------------------------------------------------------------------------------------------------
const anyMissing = LANGS.some((l) => missing[l].size > 0);
if (anyMissing && STRICT) {
  err(
    "❌ FAILED: Missing translation keys detected.\n   Add these keys to your translation dictionaries or run with --fix to generate skeletons.\n",
  );
  process.exit(1);
}

log("✅ PASSED: All translation keys are defined (or STRICT mode disabled)\n");
process.exit(0);
