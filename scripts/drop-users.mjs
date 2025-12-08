#!/usr/bin/env tsx
import "dotenv/config";
import "tsx/esm";
import { getDatabase, disconnectFromDatabase } from "../lib/mongodb-unified";
import { COLLECTIONS } from "../lib/db/collections";

async function main() {
  try {
    const db = await getDatabase();
    const result = await db.collection(COLLECTIONS.USERS).deleteMany({});
    console.log(`Deleted ${result.deletedCount} users`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await disconnectFromDatabase();
    process.exit(0);
  }
}

main();
