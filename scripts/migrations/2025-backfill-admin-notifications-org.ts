#!/usr/bin/env npx tsx
/**
 * Backfill orgId on legacy admin_notifications documents.
 *
 * Strategy:
 * - Attempt to infer orgId from senderId (users collection) if missing.
 * - Skip documents that already have orgId.
 * - Provide --dry-run to preview counts only.
 *
 * Run: npx tsx scripts/migrations/2025-backfill-admin-notifications-org.ts [--dry-run]
 */

import { MongoClient, ObjectId } from "mongodb";
import { config } from "dotenv";
import { COLLECTIONS } from "../utils/collections";

config({ path: ".env.local" });
config({ path: ".env" });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGODB_URI or MONGO_URI environment variable is required");
  process.exit(1);
}

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log("🔄 Backfill orgId on admin_notifications");
  console.log(DRY_RUN ? "📝 DRY RUN MODE" : "✏️  WRITE MODE");

  const client = new MongoClient(MONGO_URI!);
  await client.connect();
  const db = client.db();

  const notifications = db.collection(COLLECTIONS.ADMIN_NOTIFICATIONS);
  const users = db.collection(COLLECTIONS.USERS);

  const missingCount = await notifications.countDocuments({ orgId: { $exists: false } });
  console.log(`Found ${missingCount} notifications without orgId`);

  if (missingCount === 0) {
    await client.close();
    return;
  }

  const cursor = notifications.find({ orgId: { $exists: false } }, { projection: { senderId: 1 } });
  let updated = 0;
  let skipped = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    if (!doc) continue;
    const senderId = doc.senderId;
    if (!senderId || !ObjectId.isValid(senderId)) {
      skipped++;
      continue;
    }

    const sender = await users.findOne(
      { _id: new ObjectId(senderId) },
      { projection: { orgId: 1 } },
    );
    if (!sender?.orgId) {
      skipped++;
      continue;
    }

    if (!DRY_RUN) {
      await notifications.updateOne(
        { _id: doc._id },
        { $set: { orgId: sender.orgId } },
      );
    }
    updated++;
  }

  console.log(`Updated: ${updated}, Skipped: ${skipped}`);
  if (DRY_RUN) {
    console.log("No writes performed (dry run).");
  }

  await client.close();
}

main().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
