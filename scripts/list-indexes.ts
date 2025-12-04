#!/usr/bin/env tsx
/**
 * Lists indexes for a target collection using the unified Mongo connector and COLLECTIONS constants.
 * Usage: pnpm tsx scripts/list-indexes.ts [collectionKey]
 * Example: pnpm tsx scripts/list-indexes.ts USERS
 */

import { getDatabase, disconnectFromDatabase } from "../lib/mongodb-unified";
import { COLLECTIONS } from "../lib/db/collections";

type IndexInfo = {
  name?: string;
  key?: Record<string, unknown>;
  unique?: boolean;
  sparse?: boolean;
  partialFilterExpression?: Record<string, unknown>;
};

async function listIndexes() {
  const targetKey = (process.argv[2] || "USERS").toUpperCase();
  const collectionName = COLLECTIONS[targetKey as keyof typeof COLLECTIONS];

  if (!collectionName) {
    console.error(
      `❌ Unknown collection key "${targetKey}". Provide a key from COLLECTIONS (e.g., USERS, WORK_ORDERS, PROPERTIES).`,
    );
    process.exit(1);
  }

  try {
    const db = await getDatabase();
    const coll = db.collection(collectionName);
    const indexes = (await coll.listIndexes().toArray()) as IndexInfo[];

    console.log(`Indexes for ${collectionName} (${targetKey}):`);
    indexes.forEach((idx) => {
      console.log(`\n  Name: ${idx.name}`);
      console.log(`  Keys: ${JSON.stringify(idx.key)}`);
      if (idx.unique) console.log(`  Unique: YES`);
      if (idx.sparse) console.log(`  Sparse: YES`);
      if (idx.partialFilterExpression) {
        console.log(`  Partial: ${JSON.stringify(idx.partialFilterExpression)}`);
      }
    });
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    await disconnectFromDatabase();
  }
}

listIndexes();
