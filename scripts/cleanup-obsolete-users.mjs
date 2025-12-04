#!/usr/bin/env tsx
/**
 * Cleanup Obsolete User Roles - Removes users with deprecated role values
 * Usage: ALLOW_PROD_DB=1 MONGODB_URI=... pnpm tsx scripts/cleanup-obsolete-users.mjs
 */
import "dotenv/config";
import "tsx/register";
import * as readline from "readline";
import { getDatabase, disconnectFromDatabase } from "../lib/mongodb-unified";
import { COLLECTIONS } from "../lib/db/collections";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable not set");
  process.exit(1);
}

const obsoleteRoles = ["employee", "guest", "management", "vendor", "reports"];

function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "yes");
    });
  });
}

async function main() {
  console.log("\n🗑️  OBSOLETE USER ROLE CLEANUP\n");
  console.log("Roles to delete:", obsoleteRoles.join(", "));
  console.log("\n⚠️  WARNING: This cannot be undone!\n");

  const confirmed = await askConfirmation('Type "yes" to proceed: ');
  if (!confirmed) {
    console.log("\n❌ Cancelled");
    process.exit(0);
  }

  const failures: string[] = [];
  try {
    const db = await getDatabase();
    console.log("✅ Connected\n");

    for (const role of obsoleteRoles) {
      try {
        const result = await db.collection(COLLECTIONS.USERS).deleteMany({ role });
        console.log(
          `✅ Deleted ${result.deletedCount} user(s) with role: ${role}`,
        );
      } catch (error) {
        const msg = `Failed role "${role}": ${(error as Error).message}`;
        console.error(`❌ ${msg}`);
        failures.push(msg);
      }
    }

    const finalCount = await db.collection(COLLECTIONS.USERS).countDocuments();
    console.log(`\n📊 Final count: ${finalCount}`);
    if (failures.length > 0) {
      console.error("\n❌ ERRORS:", failures.join("\n"));
      process.exit(1);
    }
    console.log("\n✅ Complete!\n");
  } catch (error) {
    console.error(`\n❌ FATAL: ${(error as Error).message}`);
    process.exit(1);
  } finally {
    await disconnectFromDatabase();
  }
}

main();
