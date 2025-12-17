#!/usr/bin/env node
/**
 * Post-deploy smoke checks for Fixzit production/preview.
 *
 * - Pings health endpoint and validates database connectivity.
 * - Optionally exercises /api/issues with provided session/bearer auth.
 *
 * Usage:
 *   HEALTH_URL=https://fixzit.co/api/health \
 *   ISSUES_URL=https://fixzit.co/api/issues \
 *   ISSUES_COOKIE="next-auth.session-token=..." \
 *   node scripts/smoke/post-deploy-smoke.mjs
 *
 *   # Bearer alternative:
 *   ISSUES_BEARER="eyJhbGciOi..." node scripts/smoke/post-deploy-smoke.mjs
 *
 * Set SKIP_ISSUES=1 to skip the issues fetch (health-only).
 */

const HEALTH_URL =
  process.env.HEALTH_URL || "https://fixzit.co/api/health";
const ISSUES_URL =
  process.env.ISSUES_URL || "https://fixzit.co/api/issues";

async function fetchJson(url, init = {}) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch (_err) {
    body = text;
  }
  return { status: res.status, ok: res.ok, body, headers: res.headers };
}

function buildAuthHeaders() {
  const headers = {};
  if (process.env.ISSUES_COOKIE) {
    headers.cookie = process.env.ISSUES_COOKIE;
  }
  if (process.env.ISSUES_BEARER) {
    headers.authorization = `Bearer ${process.env.ISSUES_BEARER}`;
  }
  return headers;
}

function logCorrelation(body) {
  const cid =
    body && typeof body === "object" && "correlationId" in body
      ? body.correlationId
      : undefined;
  if (cid) {
    console.log(`   correlationId: ${cid}`);
  }
}

async function runHealth() {
  console.log(`🔍 Health: ${HEALTH_URL}`);
  const result = await fetchJson(HEALTH_URL);
  console.log(`   status: ${result.status}`);
  console.log(`   body:`, result.body);
  logCorrelation(result.body);

  if (!result.ok) {
    throw new Error("Health endpoint returned non-200 status");
  }

  const dbStatus =
    result.body && typeof result.body === "object"
      ? result.body.database
      : undefined;
  if (dbStatus && dbStatus !== "connected") {
    throw new Error(`Health check reports database=${dbStatus}`);
  }
}

async function runIssues() {
  if (process.env.SKIP_ISSUES === "1") {
    console.log("⏭️  Skipping issues fetch (SKIP_ISSUES=1).");
    return;
  }

  const headers = buildAuthHeaders();
  if (!headers.cookie && !headers.authorization) {
    console.log(
      "⚠️  No ISSUES_COOKIE or ISSUES_BEARER provided; skipping issues fetch.",
    );
    return;
  }

  console.log(`🔍 Issues: ${ISSUES_URL}`);
  const result = await fetchJson(ISSUES_URL, { headers });
  console.log(`   status: ${result.status}`);
  console.log(`   body:`, result.body);
  logCorrelation(result.body);

  if (!result.ok) {
    throw new Error("Issues endpoint returned non-200 status");
  }
}

async function main() {
  await runHealth();
  await runIssues();
  console.log("✅ Smoke checks passed");
}

main().catch((err) => {
  console.error("❌ Smoke checks failed:", err.message || err);
  process.exit(1);
});
