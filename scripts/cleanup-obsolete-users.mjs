/**
 * Cleanup Obsolete User Roles - Removes users with deprecated role values
 * Usage: node scripts/cleanup-obsolete-users.mjs
 * Requires: MONGODB_URI environment variable
 */
import { MongoClient } from "mongodb";
import * as readline from "readline";
import "dotenv/config";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable not set");
  process.exit(1);
}

const obsoleteRoles = ["employee", "guest", "management", "vendor", "reports"];

function askConfirmation(question) {
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

  let client;
  const failures = [];
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db();
    console.log("✅ Connected\n");

    for (const role of obsoleteRoles) {
      try {
        const result = await db.collection("users").deleteMany({ role });
        console.log(
          `✅ Deleted ${result.deletedCount} user(s) with role: ${role}`,
        );
      } catch (error) {
        const msg = `Failed role "${role}": ${error.message}`;
        console.error(`❌ ${msg}`);
        failures.push(msg);
      }
    }

    const finalCount = await db.collection("users").countDocuments();
    console.log(`\n📊 Final count: ${finalCount}`);
    if (failures.length > 0) {
      console.error("\n❌ ERRORS:", failures.join("\n"));
      process.exit(1);
    }
    console.log("\n✅ Complete!\n");
  } catch (error) {
    console.error(`\n❌ FATAL: ${error.message}`);
    process.exit(1);
  } finally {
    if (client) await client.close();
  }
}

main();
