#!/usr/bin/env tsx
/**
 * Script to check MongoDB connection and list users using unified connector + COLLECTIONS.
 */

import { config } from "dotenv";
import { resolve } from "path";
import { getDatabase, disconnectFromDatabase } from "../lib/mongodb-unified";
import { COLLECTIONS } from "../lib/db/collections";

// Load env (prefer .env.local)
config({ path: resolve(process.cwd(), ".env.local") });
config();

async function checkDatabase() {
  try {
    console.log("🔍 Checking MongoDB connection...\n");

    const db = await getDatabase();
    const mongoUri = process.env.MONGODB_URI;
    console.log("📡 Connected to MongoDB");
    if (mongoUri) {
      console.log("URI:", mongoUri.replace(/:[^:@]+@/, ":****@"));
    }
    console.log("Database:", db.databaseName);

    // List a sample of users
    console.log("\n👥 Fetching users from database...\n");
    const users = await db
      .collection(COLLECTIONS.USERS)
      .find({})
      .project({ email: 1, name: 1, phone: 1, role: 1, orgId: 1, createdAt: 1 })
      .limit(20)
      .toArray();

    if (!users.length) {
      console.log("⚠️  No users found in database");
    } else {
      console.log(`Found ${users.length} user(s):\n`);
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || "Unnamed User"}`);
        console.log(`   Email: ${user.email || "N/A"}`);
        console.log(`   Phone: ${user.phone || "N/A"}`);
        console.log(`   Role: ${user.role || "N/A"}`);
        console.log(`   Org: ${user.orgId || user.organizationId || "N/A"}`);
        console.log(
          `   Created: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}`,
        );
        console.log("");
      });
    }

    // Check credentials collection presence/count
    console.log("\n🔐 Checking credentials collection...\n");
    const collections = await db.listCollections().toArray();
    const hasCredentials = collections.some((c) => c.name === "credentials");
    if (hasCredentials) {
      const credentialsCount = await db.collection("credentials").countDocuments();
      console.log(`✅ Found ${credentialsCount} credential(s) in database`);
    } else {
      console.log("⚠️  No credentials collection found");
    }

    // List all collections
    console.log("\n📚 Available collections:");
    collections.forEach((col) => console.log(`   - ${col.name}`));

    console.log("\n✅ Completed DB check.");
  } catch (error: unknown) {
    const err = error as Error & { code?: string | number };
    console.error("\n❌ Error:", err.message);
    process.exit(1);
  } finally {
    await disconnectFromDatabase();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

checkDatabase();
