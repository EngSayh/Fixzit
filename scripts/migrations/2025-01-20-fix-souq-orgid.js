/**
 * Fix souq_* orgId inconsistencies and report legacy ad campaigns collection.
 *
 * - Converts string orgId -> ObjectId in:
 *   - souq_payouts (schema expects ObjectId)
 *   - souq_withdrawal_requests (downstream expects ObjectId)
 * - Reports any documents in legacy souq_ad_campaigns.
 *
 * Defaults to dry-run. Set DRY_RUN=false to apply changes.
 * Optional flags:
 *   - MIGRATE_ADS=true to copy docs from souq_ad_campaigns -> souq_campaigns (upsert by campaignId)
 *   - DROP_AD_CAMPAIGNS=true to drop legacy collection after migration
 *
 * Usage:
 *   DRY_RUN=true MONGODB_URI="mongodb+srv://..." node scripts/migrations/2025-01-20-fix-souq-orgid.js
 *   DRY_RUN=false MONGODB_URI="..." node scripts/migrations/2025-01-20-fix-souq-orgid.js
 *
 * Safety:
 * - Dry-run prints counts and sample ids.
 * - ObjectId conversion only runs on records where orgId is a string.
 */

const { MongoClient, ObjectId } = require("mongodb");

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required");
  }
  const dryRun = process.env.DRY_RUN !== "false";
  const migrateAds = process.env.MIGRATE_ADS === "true";
  const dropLegacyAds = process.env.DROP_AD_CAMPAIGNS === "true";

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();

  const collections = [
    { name: "souq_payouts", targetType: "ObjectId" },
    { name: "souq_withdrawal_requests", targetType: "ObjectId" },
  ];

  for (const { name } of collections) {
    const coll = db.collection(name);
    const stringCount = await coll.countDocuments({ orgId: { $type: "string" } });
    console.log(`[${name}] string orgId count:`, stringCount);
    if (stringCount === 0) continue;

    const sample = await coll
      .find({ orgId: { $type: "string" } }, { projection: { _id: 1, orgId: 1 } })
      .limit(5)
      .toArray();
    console.log(`[${name}] sample string orgIds:`, sample);

    if (dryRun) {
      console.log(`[${name}] dry-run enabled; no writes performed.`);
      continue;
    }

    const cursor = coll.find({ orgId: { $type: "string" } }, { projection: { orgId: 1 } });
    let converted = 0;
    const bulk = [];
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (!doc?.orgId || typeof doc.orgId !== "string" || !ObjectId.isValid(doc.orgId)) continue;
      bulk.push({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { orgId: new ObjectId(doc.orgId) } },
        },
      });
      if (bulk.length >= 500) {
        const res = await coll.bulkWrite(bulk, { ordered: false });
        converted += res.modifiedCount;
        bulk.length = 0;
      }
    }
    if (bulk.length) {
      const res = await coll.bulkWrite(bulk, { ordered: false });
      converted += res.modifiedCount;
    }
    console.log(`[${name}] converted string orgIds -> ObjectId: ${converted}`);
  }

  // Legacy ad campaigns collection check/migrate
  const legacyName = "souq_ad_campaigns";
  const modernName = "souq_campaigns";
  const collectionsList = await db.listCollections({ name: legacyName }).toArray();
  if (collectionsList.length > 0) {
    const legacyColl = db.collection(legacyName);
    const legacyCount = await legacyColl.countDocuments();
    console.log(`[${legacyName}] documents found: ${legacyCount}`);

    if (legacyCount > 0 && migrateAds) {
      const modernColl = db.collection(modernName);
      const cursor = legacyColl.find({}, { projection: { _id: 0 } });
      let upserts = 0;
      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        if (!doc?.campaignId) continue;
        const orgId = doc.orgId;
        const updateDoc = { ...doc };
        // Ensure orgId stays string for campaigns schema
        if (orgId && typeof orgId !== "string") {
          updateDoc.orgId = String(orgId);
        }
        await modernColl.updateOne(
          { campaignId: doc.campaignId },
          { $set: updateDoc, $setOnInsert: { migratedFrom: legacyName } },
          { upsert: true },
        );
        upserts += 1;
      }
      console.log(`[${legacyName}] migrated/upserted into ${modernName}: ${upserts}`);
      if (dropLegacyAds) {
        await legacyColl.drop();
        console.log(`[${legacyName}] dropped after migration.`);
      }
    } else {
      console.log(`[${legacyName}] migration not requested (set MIGRATE_ADS=true to migrate).`);
    }
  } else {
    console.log(`[${legacyName}] collection not present.`);
  }

  await client.close();
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
