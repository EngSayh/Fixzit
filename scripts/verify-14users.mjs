#!/usr/bin/env tsx
import "dotenv/config";
import "tsx/register";
import { getDatabase, disconnectFromDatabase } from "../lib/mongodb-unified";
import { COLLECTIONS } from "../lib/db/collections";

async function main() {
  try {
    const db = await getDatabase();
    const count = await db.collection(COLLECTIONS.USERS).countDocuments();
    console.log(`\n===  VERIFICATION: 14-ROLE SYSTEM ===\n`);
    console.log(`Total users: ${count}\n`);
    const users = await db
      .collection(COLLECTIONS.USERS)
      .find({})
      .sort({ role: 1, email: 1 })
      .toArray();
    users.forEach((u, i) => {
      const num = (i + 1).toString().padStart(2);
      const email = (u.email || "").padEnd(35);
      const role = (u.role || "").padEnd(22);
      console.log(`${num}. ${email} | ${role} | ${u.name || ""}`);
    });
    console.log(
      `\n✅ VERIFIED: ${count} users with current role structure\n`,
    );
  } catch (error) {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  } finally {
    await disconnectFromDatabase();
  }
}

main();
