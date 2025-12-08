/**
 * Canonical index creation script for Fixizit.
 * Delegates to the TypeScript `createIndexes` implementation to avoid drift.
 *
 * Usage:
 *   MONGODB_URI="mongodb+srv://..." pnpm tsx scripts/add-database-indexes.js
 */

require("dotenv/config");
require("tsx/cjs");

const { createIndexes } = require("../lib/db/collections.ts");
const { disconnectFromDatabase } = require("../lib/mongodb-unified");

async function main() {
  console.log("🔗 Ensuring MongoDB indexes via canonical createIndexes()");
  await createIndexes();
  console.log("✅ Index creation completed");
}

main()
  .catch((error) => {
    console.error("❌ Index creation failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await disconnectFromDatabase();
    } catch (err) {
      console.warn("⚠️ Failed to disconnect cleanly", err);
    }
  });
