/**
 * Canonical Projects text index creation.
 * Delegates to shared createIndexes() to avoid drift.
 *
 * Run: pnpm tsx scripts/create-project-text-index.js
 */

require("dotenv/config");
require("tsx/register");

const { createIndexes } = require("../lib/db/collections.ts");
const { disconnectFromDatabase } = require("../lib/mongodb-unified");

async function main() {
  console.log("🔍 Ensuring Projects text index via canonical createIndexes()");
  await createIndexes();
  console.log("✅ Index creation completed");
}

main()
  .catch((error) => {
    console.error("✗ Error:", error);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await disconnectFromDatabase();
    } catch (err) {
      console.warn("⚠️ Failed to disconnect cleanly", err);
    }
    console.log("✓ Connection closed");
  });
