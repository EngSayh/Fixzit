#!/usr/bin/env node
/**
 * Minimal schema validator for .fixzit-waivers.json
 * No external deps; fails fast with clear messages.
 */
import fs from "fs";
import path from "path";

const file = path.join(process.cwd(), ".fixzit-waivers.json");
if (!fs.existsSync(file)) {
  console.log("[waivers] No .fixzit-waivers.json present — skipping.");
  process.exit(0);
}

let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (e) {
  console.error("[waivers] Invalid JSON:", e.message);
  process.exit(1);
}

function assertBool(obj, keyPath) {
  const val = keyPath.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
  if (typeof val !== "boolean") throw new Error(`${keyPath} must be boolean`);
}

function assertArray(obj, keyPath) {
  const val = keyPath.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
  if (!Array.isArray(val)) throw new Error(`${keyPath} must be an array`);
}

function assertString(obj, keyPath) {
  const val = keyPath.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
  if (typeof val !== "string") throw new Error(`${keyPath} must be a string`);
}

try {
  if (cfg.routes) {
    assertBool(cfg, "routes.treat_factory_destructures_as_valid");
    assertBool(cfg, "routes.treat_named_reexports_as_valid");
    assertBool(cfg, "routes.treat_nextauth_v5_handlers_as_valid");
  }
  if (cfg.console) {
    assertBool(cfg, "console.allow_error_and_warn_in_runtime");
    assertBool(cfg, "console.flag_log_and_dir_only");
  }
  if (cfg.duplicates) {
    assertArray(cfg, "duplicates.ignore_dirs");
  }
  if (cfg.imports) {
    assertBool(cfg, "imports.treat_atslash_src_as_alias_to_root");
    assertBool(cfg, "imports.forbid_deep_relatives");
  }
  if (cfg.i18n) {
    assertString(cfg, "i18n.merge_translation_context");
  }
  console.log("[waivers] ✅ OK");
} catch (e) {
  console.error("[waivers] Schema error:", e.message);
  process.exit(1);
}
