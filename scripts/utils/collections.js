// Shared COLLECTIONS loader for Node scripts (non-prod utilities/migrations)
// Use tsx/cjs so we can require the TypeScript source of lib/db/collections.ts
require("tsx/cjs");
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
  COMMUNICATION_LOGS: base.COMMUNICATION_LOGS || "communication_logs",
  EMAIL_LOGS: base.EMAIL_LOGS || "email_logs",
  ATS_JOBS: base.ATS_JOBS || base.JOBS || "jobs",
  ATS_APPLICATIONS: base.ATS_APPLICATIONS || "applications",
  ATS_INTERVIEWS: base.ATS_INTERVIEWS || "interviews",
  ATS_CANDIDATES: base.ATS_CANDIDATES || "candidates",
  ATS_SETTINGS: base.ATS_SETTINGS || "ats_settings",
  HELP_ARTICLES: base.HELP_ARTICLES || "helparticles",
  HELP_COMMENTS: base.HELP_COMMENTS || "helpcomments",
  KB_EMBEDDINGS: base.KB_EMBEDDINGS || "kb_embeddings",
  CMS_PAGES: base.CMS_PAGES || "cmspages",
  INVOICE_COUNTERS: base.INVOICE_COUNTERS || "invoice_counters",
  SOUQ_SETTLEMENTS: base.SOUQ_SETTLEMENTS || "souq_settlements",
  CLAIMS: base.CLAIMS || "claims",
  ERROR_EVENTS: base.ERROR_EVENTS || "error_events",
  WORKORDER_TIMELINE: base.WORKORDER_TIMELINE || "workorder_timeline",
  WORKORDER_ATTACHMENTS: base.WORKORDER_ATTACHMENTS || "workorder_attachments",
  UTILITY_BILLS: base.UTILITY_BILLS || "utilitybills",
  OWNERS: base.OWNERS || "owners",
  CREDENTIALS: base.CREDENTIALS || "credentials",
  ACCOUNTS: base.ACCOUNTS || "accounts",
};

module.exports = { COLLECTIONS };
