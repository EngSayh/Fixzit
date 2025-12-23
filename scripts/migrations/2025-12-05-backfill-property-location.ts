#!/usr/bin/env npx tsx
/**
 * Migration: Backfill address.location GeoJSON points from legacy lat/lng
 *
 * Context:
 * - Property schema now exposes address.location (GeoJSON Point) and a 2dsphere index.
 * - Legacy documents only have address.coordinates.lat/lng.
 *
 * Behavior:
 * - For each property with numeric lat/lng and missing/invalid address.location,
 *   set address.location = { type: "Point", coordinates: [lng, lat] }.
 * - Leaves legacy lat/lng in place for backward compatibility.
 *
 * Run:
 *   DRY_RUN=true  npx tsx scripts/migrations/2025-12-05-backfill-property-location.ts
 *   DRY_RUN=false npx tsx scripts/migrations/2025-12-05-backfill-property-location.ts
 */

import { MongoClient } from "mongodb";
import { config } from "dotenv";
import { COLLECTIONS } from "../utils/collections";

config({ path: ".env.local" });
config({ path: ".env" });

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ MONGODB_URI or MONGO_URI environment variable is required");
  process.exit(1);
}

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidLocation(loc: unknown): boolean {
  const location = loc as { type?: string; coordinates?: unknown[] };
  return (
    location &&
    location.type === "Point" &&
    Array.isArray(location.coordinates) &&
    location.coordinates.length === 2 &&
    isValidNumber(location.coordinates[0]) &&
    isValidNumber(location.coordinates[1])
  );
}

async function runMigration(dryRun: boolean) {
  const client = new MongoClient(MONGO_URI!);
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection(COLLECTIONS.PROPERTIES);

    console.log(`\n🔄 Migration: Backfill address.location on properties`);
    console.log(`📋 Mode: ${dryRun ? "DRY RUN (no writes)" : "LIVE"}\n`);

    const cursor = collection.find(
      {
        "address.coordinates.lat": { $type: "number" },
        "address.coordinates.lng": { $type: "number" },
      },
      { projection: { _id: 1, address: 1 } },
    );

    let total = 0;
    let updated = 0;
    let skippedValid = 0;
    let skippedInvalid = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      if (!doc) break;
      total += 1;

      const lat = doc.address?.coordinates?.lat;
      const lng = doc.address?.coordinates?.lng;
      const currentLoc = doc.address?.location;

      if (!isValidNumber(lat) || !isValidNumber(lng)) {
        skippedInvalid += 1;
        continue;
      }

      if (isValidLocation(currentLoc)) {
        skippedValid += 1;
        continue;
      }

      const location = { type: "Point", coordinates: [lng, lat] as [number, number] };

      if (!dryRun) {
        await collection.updateOne(
          { _id: doc._id },
          {
            $set: {
              "address.location": location,
            },
          },
        );
      }
      updated += 1;
    }

    console.log(`\n✅ Migration complete`);
    console.log(`   Scanned:  ${total}`);
    console.log(`   Updated:  ${updated}`);
    console.log(`   Skipped (valid location): ${skippedValid}`);
    console.log(`   Skipped (invalid lat/lng): ${skippedInvalid}`);

    if (dryRun) {
      console.log("\n⚠️  Dry run only. Re-run with DRY_RUN=false to apply changes.");
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

const dryRun = process.env.DRY_RUN !== "false";
runMigration(dryRun);
