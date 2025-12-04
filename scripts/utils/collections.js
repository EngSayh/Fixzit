// Shared COLLECTIONS loader for Node scripts (non-prod utilities/migrations)
// Uses tsx/register to allow requiring the TypeScript source of lib/db/collections.ts
require("tsx/register");
const path = require("path");

function loadCollections() {
  // Resolve to the TypeScript source to keep a single source of truth
  const mod = require(path.resolve(__dirname, "../../lib/db/collections.ts"));
  return mod.COLLECTIONS || mod.default?.COLLECTIONS || mod;
}

const base = loadCollections();

// Provide a few script-only fallbacks for collections not yet defined in COLLECTIONS
const COLLECTIONS = {
  ...base,
  PAYMENTS: base.PAYMENTS || "payments",
  ORGANIZATIONS: base.ORGANIZATIONS || "organizations",
  ADMIN_NOTIFICATIONS: base.ADMIN_NOTIFICATIONS || "admin_notifications",
  ATS_JOBS: base.ATS_JOBS || base.JOBS || "jobs",
  ATS_APPLICATIONS: base.ATS_APPLICATIONS || "applications",
  ATS_INTERVIEWS: base.ATS_INTERVIEWS || "interviews",
  ATS_CANDIDATES: base.ATS_CANDIDATES || "candidates",
  ATS_SETTINGS: base.ATS_SETTINGS || "ats_settings",
};

module.exports = { COLLECTIONS };
