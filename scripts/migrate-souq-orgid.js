#!/usr/bin/env node
/**
 * Migration: Normalize Souq orgId fields to ObjectId
 * - Converts string orgId values to ObjectId for souq_listings and souq_inventory
 * - Skips documents where orgId is already ObjectId
 * - Trims whitespace before conversion
 *
 * Usage: MONGODB_URI="mongodb+srv://..." node scripts/migrate-souq-orgid.js
 */

require("dotenv/config");
const mongoose = require("mongoose");

const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;

if (!uri) {
  console.error("❌ MONGODB_URI (or DATABASE_URL) is required");
  process.exit(1);
}

async function convertCollection(collectionName) {
  const collection = mongoose.connection.collection(collectionName);
  const stringDocs = collection.find({
    $expr: { $eq: [{ $type: "$orgId" }, "string"] },
  });

  const bulk = [];
  let processed = 0;
  let converted = 0;
  let skipped = 0;

  while (await stringDocs.hasNext()) {
    const doc = await stringDocs.next();
    processed += 1;
    const rawOrgId = (doc.orgId || "").trim();

    if (!mongoose.Types.ObjectId.isValid(rawOrgId)) {
      skipped += 1;
      console.warn(
        `[WARN] Skipping ${collectionName} _id=${doc._id} invalid orgId=${rawOrgId}`,
      );
      continue;
    }

    const newOrgId = new mongoose.Types.ObjectId(rawOrgId);
    bulk.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { orgId: newOrgId } },
      },
    });
    converted += 1;

    if (bulk.length >= 500) {
      await collection.bulkWrite(bulk);
      bulk.length = 0;
    }
  }

  if (bulk.length) {
    await collection.bulkWrite(bulk);
  }

  console.log(
    `✅ ${collectionName}: processed=${processed}, converted=${converted}, skipped=${skipped}`,
  );
}

async function main() {
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  await convertCollection("souq_listings");
  await convertCollection("souq_inventory");

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Migration failed", err);
  process.exit(1);
});
