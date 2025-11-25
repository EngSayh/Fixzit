#!/usr/bin/env tsx
/**
 * Database Deployment Configuration Script
 *
 * Validates and applies MongoDB production configuration
 */

import {
  connectToDatabase,
  disconnectFromDatabase,
} from "@/lib/mongodb-unified";
import { ObjectId } from "mongodb";

const loadMongoose = async () => {
  const { default: mongoose } = await import("mongoose");
  return mongoose;
};

async function validateProductionConfig() {
  console.log("🔧 Validating Production MongoDB Configuration...\n");

  // Check required environment variables
  const requiredEnvs = [
    "MONGODB_URI",
    "MONGODB_DB",
    "JWT_SECRET",
    "NEXTAUTH_SECRET",
  ];

  const missing = requiredEnvs.filter((env) => !process.env[env]);
  if (missing.length > 0) {
    console.error("❌ Missing required environment variables:");
    missing.forEach((env) => console.error(`   - ${env}`));
    process.exit(1);
  }

  // Validate MongoDB URI format
  const mongoUri = process.env.MONGODB_URI!;
  if (
    !mongoUri.startsWith("mongodb://") &&
    !mongoUri.startsWith("mongodb+srv://")
  ) {
    console.error(
      "❌ Invalid MONGODB_URI format. Must start with mongodb:// or mongodb+srv://",
    );
    process.exit(1);
  }

  // Test connection
  try {
    console.log("🔌 Testing MongoDB connection...");
    await connectToDatabase();
    console.log("✅ MongoDB connection successful");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  } finally {
    await disconnectFromDatabase();
  }

  console.log("✅ Production configuration validated successfully\n");
}

async function setupProductionIndexes() {
  console.log("🗂️  Setting up production indexes...\n");

  try {
    await connectToDatabase();
    const mongoose = await loadMongoose();
    const db = mongoose.connection.db;

    // Create essential indexes for production performance
    const indexes = [
      // Users collection
      { collection: "users", index: { email: 1 }, options: { unique: true } },
      { collection: "users", index: { orgId: 1, role: 1 } },

      // Properties collection
      { collection: "properties", index: { tenantId: 1, "address.city": 1 } },
      { collection: "properties", index: { tenantId: 1, type: 1 } },
      { collection: "properties", index: { tenantId: 1, createdAt: -1 } },

      // Work orders collection
      { collection: "work_orders", index: { tenantId: 1, status: 1 } },
      { collection: "work_orders", index: { tenantId: 1, priority: 1 } },
      { collection: "work_orders", index: { tenantId: 1, createdAt: -1 } },

      // Multi-tenant indexes
      { collection: "tenancies", index: { tenantId: 1, unitId: 1 } },
      {
        collection: "financial_transactions",
        index: { tenantId: 1, date: -1 },
      },
    ];

    for (const { collection, index, options = {} } of indexes) {
      try {
        await db.collection(collection).createIndex(index, options);
        console.log(`✅ Index created on ${collection}:`, Object.keys(index));
      } catch (error: unknown) {
        const err = error as { code?: number; message?: string };
        if (err.code === 85) {
          console.log(
            `⚠️  Index already exists on ${collection}:`,
            Object.keys(index),
          );
        } else {
          console.error(
            `❌ Failed to create index on ${collection}:`,
            err.message || String(error),
          );
        }
      }
    }

    console.log("✅ Production indexes setup complete\n");
  } finally {
    await disconnectFromDatabase();
  }
}

async function createDefaultTenant() {
  console.log("👥 Setting up default tenant...\n");

  try {
    await connectToDatabase();
    const mongoose = await loadMongoose();
    const db = mongoose.connection.db;

    const orgId = new ObjectId();
    const defaultOrg = {
      _id: orgId,
      name: "Default Organization",
      subscriptionPlan: "Enterprise",
      createdAt: new Date(),
      isDefault: true,
    };

    // Check if default org already exists
    const existing = await db
      .collection("organizations")
      .findOne({ isDefault: true });
    if (existing) {
      console.log("⚠️  Default organization already exists:", existing.name);
      return;
    }

    await db.collection("organizations").insertOne(defaultOrg);
    console.log("✅ Default organization created:", orgId.toString());

    // Update environment with default tenant ID
    console.log(
      `📝 Add this to your .env.local: DEFAULT_TENANT_ID=${orgId.toString()}`,
    );
  } finally {
    await disconnectFromDatabase();
  }
}

async function main() {
  console.log("🚀 MongoDB Production Deployment Setup\n");
  console.log("=".repeat(50));

  try {
    await validateProductionConfig();
    await setupProductionIndexes();
    await createDefaultTenant();

    console.log("=".repeat(50));
    console.log("✅ Production deployment setup complete!");
    console.log("\nNext steps:");
    console.log("1. Run: npm run verify:db:deploy");
    console.log("2. Run: npm run test:e2e:db");
    console.log("3. Deploy to production");
    console.log("4. Verify: GET /api/health/database");
  } catch (error) {
    console.error("💥 Production setup failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
