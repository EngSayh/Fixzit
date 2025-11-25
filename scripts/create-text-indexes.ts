#!/usr/bin/env tsx
/**
 * MongoDB Text Indexes Setup Script
 *
 * Creates text indexes for search functionality across all collections
 * Run this script after deployment or when database schema changes
 *
 * Usage: tsx scripts/create-text-indexes.ts
 */

import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "fixzit";

interface TextIndexDefinition {
  collection: string;
  fields: Record<string, "text">;
  weights?: Record<string, number>;
  name: string;
  description: string;
}

// Define all text indexes needed for search functionality
const TEXT_INDEXES: TextIndexDefinition[] = [
  {
    collection: "workorders",
    fields: { title: "text", description: "text", code: "text" },
    weights: { title: 10, code: 8, description: 5 },
    name: "workorders_search_text",
    description: "Work Orders search (title, description, code)",
  },
  {
    collection: "properties",
    fields: {
      name: "text",
      "address.street": "text",
      "address.city": "text",
      description: "text",
    },
    weights: {
      name: 10,
      "address.city": 8,
      "address.street": 6,
      description: 5,
    },
    name: "properties_search_text",
    description: "Properties search (name, address, description)",
  },
  {
    collection: "projects",
    fields: { name: "text", description: "text" },
    weights: { name: 10, description: 5 },
    name: "projects_search_text",
    description: "Projects search (name, description)",
  },
  {
    collection: "products",
    fields: { name: "text", description: "text", category: "text" },
    weights: { name: 10, category: 7, description: 5 },
    name: "marketplace_products_search_text",
    description: "Marketplace products search (name, category, description)",
  },
  {
    collection: "listings",
    fields: { title: "text", description: "text", tags: "text" },
    weights: { title: 10, tags: 7, description: 5 },
    name: "marketplace_listings_search_text",
    description: "Marketplace listings search (title, tags, description)",
  },
  {
    collection: "knowledge_base",
    fields: { question: "text", answer: "text", keywords: "text" },
    weights: { question: 10, keywords: 8, answer: 5 },
    name: "help_kb_search_text",
    description: "Help/Knowledge Base search (question, answer, keywords)",
  },
  {
    collection: "vendors",
    fields: { name: "text", description: "text", services: "text" },
    weights: { name: 10, services: 7, description: 5 },
    name: "vendors_search_text",
    description: "Vendors search (name, services, description)",
  },
  {
    collection: "invoices",
    fields: {
      invoiceNumber: "text",
      description: "text",
      "items.description": "text",
    },
    weights: { invoiceNumber: 10, description: 5, "items.description": 3 },
    name: "invoices_search_text",
    description: "Invoices search (number, description, items)",
  },
  {
    collection: "assets",
    fields: {
      name: "text",
      description: "text",
      serialNumber: "text",
      model: "text",
    },
    weights: { name: 10, serialNumber: 8, model: 7, description: 5 },
    name: "assets_search_text",
    description: "Assets search (name, serial number, model, description)",
  },
  {
    collection: "rfqs",
    fields: { title: "text", description: "text", requirements: "text" },
    weights: { title: 10, requirements: 7, description: 5 },
    name: "rfqs_search_text",
    description: "RFQs search (title, requirements, description)",
  },
];

async function createTextIndexes() {
  console.log("🚀 MongoDB Text Indexes Setup");
  console.log("=".repeat(50));
  console.log();

  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI environment variable is not set");
    console.error("   Please configure it in .env.local file");
    process.exit(1);
  }

  const client = new MongoClient(MONGODB_URI);

  try {
    console.log("🔗 Connecting to MongoDB...");
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas");
    console.log(`📊 Database: ${MONGODB_DB}`);
    console.log();

    const db = client.db(MONGODB_DB);

    // Get list of existing collections
    const existingCollections = await db.listCollections().toArray();
    const collectionNames = existingCollections.map((c) => c.name);

    console.log(`📁 Found ${collectionNames.length} existing collections`);
    console.log();

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const indexDef of TEXT_INDEXES) {
      console.log(`📝 Processing: ${indexDef.collection}`);
      console.log(`   ${indexDef.description}`);

      try {
        // Check if collection exists
        if (!collectionNames.includes(indexDef.collection)) {
          console.log(
            `   ⚠️  Collection doesn't exist yet - will be created on first insert`,
          );
          console.log(
            `   ✅ Index will be created automatically when collection is populated`,
          );
          skippedCount++;
          console.log();
          continue;
        }

        const collection = db.collection(indexDef.collection);

        // Check if text index already exists
        const indexes = await collection.indexes();
        const hasTextIndex = indexes.some(
          (idx) =>
            idx.name === indexDef.name ||
            Object.values(idx.key || {}).includes("text"),
        );

        if (hasTextIndex) {
          console.log(`   ✅ Text index already exists`);
          skippedCount++;
        } else {
          // Create text index
          await collection.createIndex(indexDef.fields, {
            name: indexDef.name,
            weights: indexDef.weights || {},
            default_language: "english",
            background: true,
          });
          console.log(`   ✅ Created text index: ${indexDef.name}`);
          createdCount++;
        }

        // List all indexes for verification
        const allIndexes = await collection.indexes();
        console.log(`   📋 Total indexes: ${allIndexes.length}`);
        allIndexes.forEach((idx) => {
          const keyStr = JSON.stringify(idx.key);
          console.log(`      - ${idx.name}: ${keyStr}`);
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`   ❌ Error: ${message}`);
        errorCount++;
      }

      console.log();
    }

    console.log("=".repeat(50));
    console.log("📊 Summary:");
    console.log(`   ✅ Created: ${createdCount} indexes`);
    console.log(
      `   ⏭️  Skipped: ${skippedCount} (already exist or collection not created)`,
    );
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log();

    if (errorCount > 0) {
      console.log("⚠️  Some indexes failed to create. Check errors above.");
      process.exit(1);
    } else {
      console.log("✅ Text indexes setup complete!");
      console.log();
      console.log("📝 Next steps:");
      console.log("   1. Test search functionality in each module");
      console.log("   2. Run E2E tests: npm run test:e2e");
      console.log("   3. Monitor search performance in production");
      console.log("   4. Consider adding more indexes based on query patterns");
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("💥 Fatal error:", message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.close();
    console.log();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run if called directly
if (require.main === module) {
  createTextIndexes().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}

export { createTextIndexes, TEXT_INDEXES };
