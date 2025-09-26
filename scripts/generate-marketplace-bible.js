const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(process.cwd(), '_artifacts');
const OUT_FILE = path.join(OUT_DIR, 'Fixzit_Marketplace_Bible_v1.txt');

function ensureArtifactsDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function buildDocumentContent() {
  return [
    'Fixzit Marketplace Bible (v1)',
    '',
    `Output Artifact: ${path.basename(OUT_FILE)}`,
    '',
    'Scope: Amazon-style marketplace for materials; governance-aligned (single header/sidebar, RTL/LTR, RBAC).',
    '',
    'IA: /marketplace, /marketplace/product/[slug], search, cart, orders, RFQ, knowledge.',
    '',
    'Data Model: org-scoped categories, products, offers, carts, orders; unique indexes; idempotent seeding.',
    '',
    'APIs: /api/marketplace/search, /api/marketplace/products/[slug]; approvals & PO coupling (future endpoints).',
    '',
    'UX: Top Bar (language/currency), Sidebar baseline, Amazon-like header for Souq, PDP buy box, filters.',
    '',
    'QA: STRICT v4 Halt–Fix–Verify; single header; zero console/network/build errors; RTL acceptance.',
    ''
  ].join('\n');
}

function main() {
  ensureArtifactsDir(OUT_DIR);
  const content = buildDocumentContent();
  fs.writeFileSync(OUT_FILE, content, 'utf8');
  // eslint-disable-next-line no-console
  console.log('✔ Marketplace Bible generated at', OUT_FILE);
  return OUT_FILE;
}

if (require.main === module) {
  try {
    main();
    process.exit(0);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to generate marketplace bible', error);
    process.exit(1);
  }
}

module.exports = {
  main,
};
