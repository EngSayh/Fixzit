#!/usr/bin/env node
/**
 * SMS Provider Migration Script
 *
 * Migrates existing database documents from legacy SMS providers (TWILIO, UNIFONIC, etc.)
 * to TAQNYAT, the only supported SMS provider (CITC-compliant for Saudi Arabia).
 *
 * Usage:
 *   DRY_RUN=true node scripts/migrate-sms-providers.ts   # Preview changes
 *   node scripts/migrate-sms-providers.ts                # Execute migration
 *
 * Environment:
 *   MONGODB_URI - MongoDB connection string
 *   DRY_RUN     - If 'true', only log what would be changed (default: false)
 */

import { MongoClient, Db } from "mongodb";

// Configuration
const DRY_RUN = process.env.DRY_RUN === "true";
const MONGODB_URI = process.env.MONGODB_URI || process.env.DATABASE_URL || "";

// Legacy providers to migrate
const LEGACY_PROVIDERS = ["TWILIO", "UNIFONIC", "AWS_SNS", "NEXMO"];
const TARGET_PROVIDER = "TAQNYAT";

interface MigrationResult {
  collection: string;
  field: string;
  documentsFound: number;
  documentsUpdated: number;
  dryRun: boolean;
}

async function migrateCollection(
  db: Db,
  collectionName: string,
  field: string,
  query: Record<string, unknown>,
  update: Record<string, unknown>
): Promise<MigrationResult> {
  const collection = db.collection(collectionName);
  
  // Find affected documents
  const affectedCount = await collection.countDocuments(query);
  
  console.log(`\n📦 ${collectionName}.${field}`);
  console.log(`   Found ${affectedCount} documents with legacy providers`);
  
  if (affectedCount === 0) {
    return {
      collection: collectionName,
      field,
      documentsFound: 0,
      documentsUpdated: 0,
      dryRun: DRY_RUN,
    };
  }
  
  if (DRY_RUN) {
    // Show sample documents
    const samples = await collection.find(query).limit(3).toArray();
    console.log(`   Sample documents:`);
    samples.forEach((doc, i) => {
      const value = field.split(".").reduce((obj, key) => obj?.[key], doc as Record<string, unknown>);
      console.log(`     ${i + 1}. _id: ${doc._id}, ${field}: ${value}`);
    });
    console.log(`   ⏸️  DRY RUN - No changes made`);
    
    return {
      collection: collectionName,
      field,
      documentsFound: affectedCount,
      documentsUpdated: 0,
      dryRun: true,
    };
  }
  
  // Execute migration
  const result = await collection.updateMany(query, update);
  console.log(`   ✅ Updated ${result.modifiedCount} documents`);
  
  return {
    collection: collectionName,
    field,
    documentsFound: affectedCount,
    documentsUpdated: result.modifiedCount,
    dryRun: false,
  };
}

async function main() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║     SMS PROVIDER MIGRATION: Legacy → TAQNYAT                   ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log(`\nMode: ${DRY_RUN ? "🔍 DRY RUN (preview only)" : "🚀 LIVE MIGRATION"}`);
  console.log(`Target Provider: ${TARGET_PROVIDER}`);
  console.log(`Legacy Providers: ${LEGACY_PROVIDERS.join(", ")}`);
  
  if (!MONGODB_URI) {
    console.error("\n❌ Error: MONGODB_URI environment variable not set");
    process.exit(1);
  }
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log("\n✅ Connected to MongoDB");
    
    const db = client.db();
    const results: MigrationResult[] = [];
    
    // 1. Migrate SMSSettings.defaultProvider
    results.push(await migrateCollection(
      db,
      "smssettings",
      "defaultProvider",
      { defaultProvider: { $in: LEGACY_PROVIDERS } },
      { $set: { defaultProvider: TARGET_PROVIDER } }
    ));
    
    // 2. Migrate SMSSettings.providers[].provider
    results.push(await migrateCollection(
      db,
      "smssettings",
      "providers.provider",
      { "providers.provider": { $in: LEGACY_PROVIDERS } },
      { $set: { "providers.$[elem].provider": TARGET_PROVIDER } }
      // Note: This uses positional $ which updates first match only
      // For complete migration, iterate and update each element
    ));
    
    // 3. Migrate Organization.smsProvider
    results.push(await migrateCollection(
      db,
      "organizations",
      "smsProvider",
      { smsProvider: { $in: LEGACY_PROVIDERS } },
      { $set: { smsProvider: TARGET_PROVIDER } }
    ));
    
    // 4. Migrate SMSMessage.provider (historical records)
    results.push(await migrateCollection(
      db,
      "smsmessages",
      "provider",
      { provider: { $in: LEGACY_PROVIDERS } },
      { $set: { provider: TARGET_PROVIDER, migratedAt: new Date() } }
    ));
    
    // Summary
    console.log("\n╔════════════════════════════════════════════════════════════════╗");
    console.log("║                      MIGRATION SUMMARY                          ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    
    const totalFound = results.reduce((sum, r) => sum + r.documentsFound, 0);
    const totalUpdated = results.reduce((sum, r) => sum + r.documentsUpdated, 0);
    
    results.forEach((r) => {
      const status = r.dryRun ? "📋" : r.documentsUpdated > 0 ? "✅" : "➖";
      console.log(`${status} ${r.collection}.${r.field}: ${r.documentsFound} found, ${r.documentsUpdated} updated`);
    });
    
    console.log(`\nTotal: ${totalFound} documents found, ${totalUpdated} updated`);
    
    if (DRY_RUN && totalFound > 0) {
      console.log("\n💡 To execute migration, run without DRY_RUN:");
      console.log("   node scripts/migrate-sms-providers.ts");
    }
    
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

main();
