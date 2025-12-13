#!/usr/bin/env tsx
/**
 * MongoDB Index Sync Script
 * Syncs Mongoose schema indexes to MongoDB Atlas
 * 
 * Usage:
 *   pnpm tsx scripts/sync-indexes.ts
 *   MONGODB_URI="mongodb+srv://..." pnpm tsx scripts/sync-indexes.ts
 * 
 * @module scripts/sync-indexes
 */

import mongoose from "mongoose";
import { logger } from "@/lib/logger";

// Import all models that need index sync
import { Issue } from "@/server/models/Issue";
import IssueEvent from "@/server/models/IssueEvent";

const MODELS_TO_SYNC = [
  { name: "Issue", model: Issue },
  { name: "IssueEvent", model: IssueEvent },
];

async function syncIndexes() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error("❌ MONGODB_URI environment variable is required");
    console.error("   Usage: MONGODB_URI=\"mongodb+srv://...\" pnpm tsx scripts/sync-indexes.ts");
    process.exit(1);
  }

  console.log("🔗 Connecting to MongoDB...");
  
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    console.log("✅ Connected to MongoDB");

    for (const { name, model } of MODELS_TO_SYNC) {
      console.log(`📋 Syncing indexes for ${name}...`);
      try {
        await model.syncIndexes();
        
        // List created indexes
        const indexes = await model.collection.indexes();
        console.log(`   ✅ ${name}: ${indexes.length} indexes`);
        indexes.forEach((idx) => {
          const keys = Object.keys(idx.key).join(", ");
          const unique = idx.unique ? " (unique)" : "";
          console.log(`      - ${idx.name}: [${keys}]${unique}`);
        });
      } catch (err) {
        console.error(`   ❌ Failed to sync ${name}:`, err instanceof Error ? err.message : err);
      }
    }

    console.log("\n✅ Index sync complete");
  } catch (error) {
    console.error("❌ Connection failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

syncIndexes().catch((err) => {
  logger.error("[sync-indexes] Unhandled error", err);
  process.exit(1);
});
