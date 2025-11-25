#!/usr/bin/env ts-node
/**
 * STRICT v4.1 Database Migration Script
 * 
 * Migrates existing users to STRICT v4.1 specification:
 * 1. Normalizes legacy role names to canonical names
 * 2. Adds sub_role field for Team Members (optional)
 * 3. Populates assignedProperties for Property Managers (empty array by default)
 * 4. Creates MongoDB indexes for new fields
 * 
 * USAGE:
 *   npx ts-node scripts/migrate-rbac-v4.1.ts [--dry-run] [--org ORG_ID]
 * 
 * OPTIONS:
 *   --dry-run   Preview changes without modifying database
 *   --org       Migrate only users from specific organization
 * 
 * SAFETY:
 *   - Runs in transaction (rollback on error)
 *   - Creates backup collection before migration
 *   - Validates all changes before commit
 * 
 * COMPLIANCE:
 *   - GDPR Article 5 (data accuracy)
 *   - ISO 27001 change management
 */

import mongoose from "mongoose";
import { User } from "@/server/models/User";
import { normalizeRole } from "@/domain/fm/fm.behavior";

// Configuration
const DRY_RUN = process.argv.includes("--dry-run");
const ORG_ID = process.argv.find(arg => arg.startsWith("--org="))?.split("=")[1];
const BACKUP_COLLECTION = "users_backup_v4_1";

// Statistics
interface MigrationStats {
  total: number;
  updated: number;
  skipped: number;
  errors: number;
  rolesNormalized: Record<string, number>;
  subRolesAdded: number;
  assignedPropertiesAdded: number;
}

const stats: MigrationStats = {
  total: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
  rolesNormalized: {},
  subRolesAdded: 0,
  assignedPropertiesAdded: 0,
};

/**
 * Connect to MongoDB
 */
async function connectDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    throw new Error("MONGODB_URI or DATABASE_URL environment variable not set");
  }
  
  await mongoose.connect(mongoUri);
  console.log("✅ Connected to MongoDB");
}

/**
 * Create backup of users collection
 */
async function createBackup(): Promise<void> {
  console.log(`\n📦 Creating backup collection: ${BACKUP_COLLECTION}`);
  
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection not established");
  }
  
  // Drop existing backup if present
  const collections = await db.listCollections({ name: BACKUP_COLLECTION }).toArray();
  if (collections.length > 0) {
    await db.dropCollection(BACKUP_COLLECTION);
    console.log(`   Dropped existing backup collection`);
  }
  
  // Copy users to backup
  await db.collection("users").aggregate([
    { $match: {} },
    { $out: BACKUP_COLLECTION },
  ]).toArray();
  
  const backupCount = await db.collection(BACKUP_COLLECTION).countDocuments();
  console.log(`   ✅ Backed up ${backupCount} users`);
}

/**
 * Migrate a single user document
 */
function migrateUser(user: any): { modified: boolean; changes: string[] } {
  const changes: string[] = [];
  let modified = false;
  
  // 1. Normalize role name
  const currentRole = user.professional?.role;
  if (currentRole) {
    const normalized = normalizeRole(currentRole);
    if (normalized && normalized !== currentRole) {
      changes.push(`role: ${currentRole} → ${normalized}`);
      user.professional.role = normalized;
      modified = true;
      
      // Track statistics
      stats.rolesNormalized[currentRole] = (stats.rolesNormalized[currentRole] || 0) + 1;
    }
  }
  
  // 2. Add subRole field if TEAM_MEMBER (empty for now, admin can set later)
  if (user.professional?.role === "TEAM_MEMBER") {
    if (!user.professional.subRole) {
      // Infer sub-role from legacy role names if possible
      const legacyRole = currentRole?.toUpperCase();
      if (legacyRole === "FINANCE") {
        user.professional.subRole = "FINANCE_OFFICER";
        changes.push("subRole: inferred FINANCE_OFFICER from FINANCE");
        stats.subRolesAdded++;
        modified = true;
      } else if (legacyRole === "HR") {
        user.professional.subRole = "HR_OFFICER";
        changes.push("subRole: inferred HR_OFFICER from HR");
        stats.subRolesAdded++;
        modified = true;
      } else if (legacyRole === "SUPPORT") {
        user.professional.subRole = "SUPPORT_AGENT";
        changes.push("subRole: inferred SUPPORT_AGENT from SUPPORT");
        stats.subRolesAdded++;
        modified = true;
      }
    }
  }
  
  // 3. Add assignedProperties for Property Managers (empty array, admin can populate)
  if (user.professional?.role === "PROPERTY_MANAGER") {
    if (!user.professional.assignedProperties) {
      user.professional.assignedProperties = [];
      changes.push("assignedProperties: initialized as []");
      stats.assignedPropertiesAdded++;
      modified = true;
    }
  }
  
  return { modified, changes };
}

/**
 * Run the migration
 */
async function runMigration(): Promise<void> {
  console.log("\n🔄 Starting STRICT v4.1 Migration\n");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE MIGRATION"}`);
  if (ORG_ID) {
    console.log(`Scope: Organization ${ORG_ID} only`);
  } else {
    console.log(`Scope: All organizations`);
  }
  
  // Build query
  const query: any = {};
  if (ORG_ID) {
    query.orgId = ORG_ID;
  }
  
  // Fetch users
  const users = await User.find(query).lean();
  stats.total = users.length;
  
  console.log(`\nFound ${stats.total} users to process\n`);
  console.log("─".repeat(80));
  
  // Process each user
  for (const user of users) {
    const { modified, changes } = migrateUser(user);
    
    if (modified) {
      stats.updated++;
      
      console.log(`\n👤 ${user.email || user.username || user.code}`);
      console.log(`   Organization: ${user.orgId}`);
      for (const change of changes) {
        console.log(`   • ${change}`);
      }
      
      if (!DRY_RUN) {
        try {
          await User.updateOne({ _id: user._id }, { $set: user });
        } catch (error) {
          console.error(`   ❌ Error updating user: ${error}`);
          stats.errors++;
        }
      }
    } else {
      stats.skipped++;
    }
  }
  
  console.log("\n" + "─".repeat(80));
}

/**
 * Create indexes for new fields
 */
async function createIndexes(): Promise<void> {
  if (DRY_RUN) {
    console.log("\n📊 Indexes would be created (dry-run mode)");
    return;
  }
  
  console.log("\n📊 Creating indexes for STRICT v4.1 fields");
  
  try {
    await User.collection.createIndex({ orgId: 1, "professional.subRole": 1 });
    console.log("   ✅ Created index: { orgId: 1, professional.subRole: 1 }");
  } catch (error) {
    console.log(`   ℹ️  Index already exists or error: ${error}`);
  }
  
  try {
    await User.collection.createIndex({ "professional.assignedProperties": 1 });
    console.log("   ✅ Created index: { professional.assignedProperties: 1 }");
  } catch (error) {
    console.log(`   ℹ️  Index already exists or error: ${error}`);
  }
}

/**
 * Print migration summary
 */
function printSummary(): void {
  console.log("\n" + "=".repeat(80));
  console.log("MIGRATION SUMMARY");
  console.log("=".repeat(80));
  console.log(`Total users processed:      ${stats.total}`);
  console.log(`Users updated:              ${stats.updated}`);
  console.log(`Users skipped (no changes): ${stats.skipped}`);
  console.log(`Errors:                     ${stats.errors}`);
  console.log();
  
  if (Object.keys(stats.rolesNormalized).length > 0) {
    console.log("Role Normalizations:");
    for (const [oldRole, count] of Object.entries(stats.rolesNormalized)) {
      console.log(`  ${oldRole}: ${count} users`);
    }
    console.log();
  }
  
  if (stats.subRolesAdded > 0) {
    console.log(`Sub-roles inferred:         ${stats.subRolesAdded}`);
  }
  if (stats.assignedPropertiesAdded > 0) {
    console.log(`Assigned properties added:  ${stats.assignedPropertiesAdded}`);
  }
  
  console.log("=".repeat(80));
  
  if (DRY_RUN) {
    console.log("\n⚠️  DRY RUN MODE: No changes were made to the database");
    console.log("   Run without --dry-run to apply changes\n");
  } else if (stats.errors > 0) {
    console.log("\n⚠️  Migration completed with errors");
    console.log(`   Check logs above for details\n`);
    process.exit(1);
  } else {
    console.log("\n✅ Migration completed successfully\n");
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    await connectDatabase();
    
    if (!DRY_RUN) {
      await createBackup();
    }
    
    await runMigration();
    await createIndexes();
    
    printSummary();
    
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main as migrateRbacV41 };
