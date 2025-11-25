const fs = require("fs");
const path = require("path");
const { randomUUID } = require("node:crypto");

const OUT_DIR = path.join(process.cwd(), "_artifacts");
const OUT_FILE = path.join(OUT_DIR, "Fixzit_Marketplace_Bible_v1.md");

const logInfo = (message) => process.stdout.write(`${message}\n`);
const logWarn = (message) => process.stderr.write(`${message}\n`);
const logError = (message) => process.stderr.write(`${message}\n`);

function ensureArtifactsDir(dirPath, fsModule) {
  if (!fsModule.existsSync(dirPath)) {
    fsModule.mkdirSync(dirPath, { recursive: true });
  }
}

function buildDocumentContent() {
  return [
    "Fixzit Marketplace Bible (v1)",
    "",
    `Output Artifact: ${path.basename(OUT_FILE)}`,
    "",
    "Scope: Amazon-style marketplace for materials; governance-aligned (single header/sidebar, RTL/LTR, RBAC).",
    "",
    "IA: /marketplace, /marketplace/product/[slug], search, cart, orders, RFQ, knowledge.",
    "",
    "Data Model: org-scoped categories, products, offers, carts, orders; unique indexes; idempotent seeding.",
    "",
    "APIs: /api/marketplace/search, /api/marketplace/products/[slug]; approvals & PO coupling (future endpoints).",
    "",
    "UX: Top Bar (language/currency), Sidebar baseline, Amazon-like header for Souq, PDP buy box, filters.",
    "",
    "QA: STRICT v4 Halt–Fix–Verify; single header; zero console/network/build errors; RTL acceptance.",
    "",
  ].join("\n");
}

function main(options = {}) {
  const {
    fsModule = fs,
    forceFailure = false,
    correlationId = randomUUID(),
  } = options;

  const envWantsFailure = process.env.FIXZIT_BIBLE_FORCE_WRITE_ERROR === "1";
  const isTestEnv = (process.env.NODE_ENV ?? "").toLowerCase() === "test";
  let shouldForceFailure = forceFailure;

  if (!shouldForceFailure && envWantsFailure) {
    if (isTestEnv) {
      shouldForceFailure = true;
    } else {
      logWarn(
        `[${correlationId}] Ignoring FIXZIT_BIBLE_FORCE_WRITE_ERROR because NODE_ENV is '${process.env.NODE_ENV ?? ""}'`,
      );
    }
  }

  ensureArtifactsDir(OUT_DIR, fsModule);
  const content = buildDocumentContent();

  if (shouldForceFailure) {
    const error = new Error("Forced write failure for tests");
    logError(`[${correlationId}] Forced write failure: ${error.message}`);
    throw error;
  }

  fsModule.writeFileSync(OUT_FILE, content, "utf8");
  logInfo(`[${correlationId}] ✔ Marketplace Bible generated at ${OUT_FILE}`);
  return OUT_FILE;
}

if (require.main === module) {
  const correlationId = randomUUID();
  try {
    main({ correlationId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError(
      `[${correlationId}] Failed to generate marketplace bible: ${message}`,
    );
    process.exitCode = 1;
  }
}

module.exports = {
  main,
  OUT_DIR,
  OUT_FILE,
  buildDocumentContent,
};
