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
 *   npx ts-node scripts/migrate-rbac-v4.1.ts [OPTIONS]
 * 
 * OPTIONS:
 *   --dry-run            Preview changes without modifying database
 *   --org=ORG_ID         Migrate only users from specific organization
 *   --batch-size=N       Process N users per batch (default: 500)
 * 
 * EXAMPLES:
 *   # Preview all changes
 *   npx ts-node scripts/migrate-rbac-v4.1.ts --dry-run
 *   
 *   # Migrate specific organization
 *   npx ts-node scripts/migrate-rbac-v4.1.ts --org=abc123
 *   
 *   # Large dataset with custom batch size
 *   npx ts-node scripts/migrate-rbac-v4.1.ts --batch-size=1000
 * 
 * SAFETY:
 *   - Pre-migration validation checks
 *   - Creates backup collection before migration (users_backup_v4_1)
 *   - Batched processing with progress tracking
 *   - Automatic rollback on any error
 *   - Performance metrics and ETA display
 * 
 * COMPLIANCE:
 *   - GDPR Article 5 (data accuracy)
 *   - ISO 27001 change management
 *   - SOC 2 audit trail requirements
 */

import mongoose, { ClientSession } from "mongoose";
import { User } from "@/server/models/User";
import { normalizeRole } from "@/domain/fm/fm.behavior";
import { logger } from "@/lib/logger";

// Configuration
const DRY_RUN = process.argv.includes("--dry-run");
const ORG_ID = process.argv.find(arg => arg.startsWith("--org="))?.split("=")[1];
const BATCH_SIZE = parseInt(
  process.argv.find(arg => arg.startsWith("--batch-size="))?.split("=")[1] ||
  process.env.BATCH_SIZE ||
  "500",
  10,
);
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
  batchesProcessed: number;
  startTime: number;
  endTime?: number;
  failedUserIds: string[];
}

const stats: MigrationStats = {
  total: 0,
  updated: 0,
  skipped: 0,
  batchesProcessed: 0,
  startTime: Date.now(),
  failedUserIds: [],
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
  logger.info("Connected to MongoDB", {
    action: 'migration:db:connect',
    readyState: mongoose.connection.readyState,
  });
}

/**
 * Create per-tenant backup of users collection
 */
async function createBackup(): Promise<void> {
  const backupName = ORG_ID 
    ? `${BACKUP_COLLECTION}_${ORG_ID}`
    : BACKUP_COLLECTION;
  
  logger.info(`Creating backup collection: ${backupName}`, {
    action: 'migration:backup:start',
    orgId: ORG_ID,
    backupCollection: backupName,
  });
  
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection not established");
  }
  
  // Drop existing backup if present
  const collections = await db.listCollections({ name: backupName }).toArray();
  if (collections.length > 0) {
    await db.dropCollection(backupName);
    logger.info(`Dropped existing backup collection`, {
      action: 'migration:backup:drop',
      backupCollection: backupName,
    });
  }
  
  // Build backup query (scope to org if provided)
  const matchStage = ORG_ID ? { $match: { orgId: ORG_ID } } : { $match: {} };
  
  // Copy users to backup (tenant-scoped if applicable)
  await db.collection("users").aggregate([
    matchStage,
    { $out: backupName },
  ]).toArray();
  
  const backupCount = await db.collection(backupName).countDocuments();
  logger.info(`Backup complete: ${backupCount} users backed up`, {
    action: 'migration:backup:complete',
    backupCollection: backupName,
    userCount: backupCount,
    orgId: ORG_ID,
  });
}

/**
 * Migrate a single user document
 */
function migrateUser(user: Record<string, unknown> & { professional?: Record<string, unknown>; _id?: unknown }): { modified: boolean; changes: string[] } {
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
 * Validate database state before migration
 */
async function validatePreMigration(): Promise<void> {
  logger.info("Pre-migration validation checks", { action: 'migration:validation:start' });
  
  // Check User model exists
  const collections = await mongoose.connection.db?.listCollections({ name: "users" }).toArray();
  if (!collections || collections.length === 0) {
    throw new Error("Users collection not found in database");
  }
  logger.info("Users collection exists", { action: 'migration:validation:collection_exists' });
  
  // Check for required fields in User schema
  const sampleUser = await User.findOne().lean();
  if (sampleUser) {
    if (!sampleUser.professional) {
      throw new Error("User schema missing 'professional' field - incompatible schema");
    }
    logger.info("User schema contains required fields", { action: 'migration:validation:schema_valid' });
  }
  
  // Verify MongoDB version supports transactions
  const adminDb = mongoose.connection.db?.admin();
  if (adminDb && !DRY_RUN) {
    try {
      const buildInfo = await adminDb.command({ buildInfo: 1 });
      const version = buildInfo.version as string;
      const majorVersion = parseInt(version.split(".")[0], 10);
      if (majorVersion < 4) {
        logger.warn(`MongoDB ${version} - transactions require v4.0+`, {
          action: 'migration:validation:mongodb_version',
          version,
          majorVersion,
          supportsTransactions: false,
        });
      } else {
        logger.info(`MongoDB ${version} supports transactions`, {
          action: 'migration:validation:mongodb_version',
          version,
          majorVersion,
          supportsTransactions: true,
        });
      }
    } catch (error) {
      logger.info(`Could not verify MongoDB version`, {
        action: 'migration:validation:mongodb_version',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * Calculate and display progress with ETA
 */
function displayProgress(current: number, total: number, startTime: number): void {
  const percentage = ((current / total) * 100).toFixed(1);
  const elapsed = Date.now() - startTime;
  const estimatedTotal = (elapsed / current) * total;
  const remaining = estimatedTotal - elapsed;
  const eta = new Date(Date.now() + remaining);
  
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };
  
  logger.info("Migration progress", {
    action: 'migration:progress',
    current,
    total,
    percentage: parseFloat(percentage),
    elapsed: formatDuration(elapsed),
    eta: eta.toISOString(),
  });
}

/**
 * Run the migration with batching, per-batch transactions, and progress tracking
 */
async function runMigration(session?: ClientSession): Promise<void> {
  logger.info("Starting STRICT v4.1 Migration", {
    action: 'migration:start',
    mode: DRY_RUN ? 'dry-run' : 'live',
    batchSize: BATCH_SIZE,
    orgId: ORG_ID,
    scope: ORG_ID ? 'single-tenant' : 'all-tenants',
  });
  
  if (!ORG_ID) {
    logger.warn("Running migration across ALL tenants", {
      action: 'migration:multi-tenant-warning',
      recommendation: 'Use --org=<orgId> for production to maintain tenant boundaries',
    });
  }
  
  // Build query
  const query: { orgId?: string } = {};
  if (ORG_ID) {
    query.orgId = ORG_ID;
  }
  
  // Count total users first
  const totalCount = await User.countDocuments(query);
  stats.total = totalCount;
  
  if (totalCount === 0) {
    logger.warn("No users found matching criteria", {
      action: 'migration:no_users',
      orgId: ORG_ID,
      query,
    });
    return;
  }
  
  logger.info(`Found ${stats.total} users to process`, {
    action: 'migration:scan-complete',
    totalUsers: stats.total,
    batchCount: Math.ceil(totalCount / BATCH_SIZE),
    orgId: ORG_ID,
  });
  
  let processedCount = 0;
  
  // Process in batches
  while (processedCount < totalCount) {
    const batchStart = processedCount;
    const batchEnd = Math.min(processedCount + BATCH_SIZE, totalCount);
    const batchNum = stats.batchesProcessed + 1;
    
    logger.info(`Batch ${batchNum}: Processing users ${batchStart + 1}-${batchEnd}`, {
      action: 'migration:batch:start',
      batchNumber: batchNum,
      userRange: `${batchStart + 1}-${batchEnd}`,
      orgId: ORG_ID,
    });
    
    // Per-batch transaction for safety (session arg preserved for legacy single-transaction mode)
    const batchSession = DRY_RUN ? null : (session ?? await mongoose.startSession());
    const shouldManageTransaction = batchSession && !session;
    if (shouldManageTransaction && !batchSession.inTransaction()) {
      batchSession.startTransaction();
    }

    try {
      // Fetch batch with stable sort for deterministic pagination
      const findQuery = User.find(query)
        .sort({ _id: 1 }) // Stable sort to avoid non-deterministic paging
        .skip(processedCount)
        .limit(BATCH_SIZE);
      if (batchSession) {
        findQuery.session(batchSession);
      }
      const users = await findQuery.lean();
      
      // Process batch
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const { modified, changes } = migrateUser(user);
        
        if (modified) {
          stats.updated++;
          
          if (DRY_RUN || stats.updated <= 10 || i === 0) {
            // Log first 10 changes, or first of each batch
            logger.info(`User migration: ${user.email || user.username || user.code}`, {
              action: 'migration:user:updated',
              userId: user._id,
              userEmail: user.email,
              orgId: user.orgId,
              changes: changes,
              dryRun: DRY_RUN,
            });
          }
          
          if (!DRY_RUN) {
            try {
              // Avoid attempting to update immutable _id field
              const { _id, ...update } = user;
              if (!_id) {
                throw new Error("User record missing _id");
              }
              // B.1 Multi-tenancy Enforcement: Scope update by orgId to prevent cross-tenant writes
              const updateFilter = ORG_ID 
                ? { _id, orgId: ORG_ID } 
                : { _id, orgId: user.orgId };
              const updateOptions = batchSession ? { session: batchSession } : {};
              await User.updateOne(updateFilter, { $set: update }, updateOptions);
            } catch (error) {
              const userId = String(user._id || "unknown");
              logger.error(`Error updating user`, {
                action: 'migration:user:update_error',
                userId,
                orgId: user.orgId,
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
              });
              stats.errors++;
              stats.failedUserIds.push(userId);
              
              // Stop batch on first error to trigger rollback
              throw new Error(`Failed to update user ${userId}: ${error}`);
            }
          }
        } else {
          stats.skipped++;
        }
        
        processedCount++;
        
        // Display progress every 50 users or at batch end
        if (processedCount % 50 === 0 || processedCount === batchEnd) {
          displayProgress(processedCount, totalCount, stats.startTime);
        }
      }

      // Commit batch transaction
      if (shouldManageTransaction) {
        await batchSession.commitTransaction();
      }
      
      stats.batchesProcessed++;
      logger.info(`Batch complete`, {
        action: 'migration:batch:complete',
        batchNumber: batchNum,
        usersProcessed: Math.min(users.length, BATCH_SIZE),
      });
    } catch (error) {
      if (shouldManageTransaction) {
        await batchSession.abortTransaction();
        logger.error("Batch transaction aborted", {
          action: 'migration:batch:abort',
          batchNumber: batchNum,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      throw error;
    } finally {
      if (shouldManageTransaction) {
        batchSession.endSession();
      }
    }
  }

  // If any update failed, trigger rollback in the calling transaction
  if (!DRY_RUN && session && stats.errors > 0) {
    throw new Error(`Encountered ${stats.errors} error(s) during migration. Failed user IDs: ${stats.failedUserIds.join(", ")}`);
  }
}

/**
 * Create indexes for new fields
 */
async function createIndexes(): Promise<void> {
  if (DRY_RUN) {
    logger.info("Indexes would be created (dry-run mode)", {
      action: 'migration:indexes:dry_run',
    });
    return;
  }
  
  logger.info("Creating indexes for STRICT v4.1 fields", {
    action: 'migration:indexes:start',
  });
  
  try {
    await User.collection.createIndex({ orgId: 1, "professional.subRole": 1 });
    logger.info("Created index", {
      action: 'migration:indexes:create',
      index: '{ orgId: 1, professional.subRole: 1 }',
    });
  } catch (error) {
    logger.info("Index already exists or error", {
      action: 'migration:indexes:create',
      index: '{ orgId: 1, professional.subRole: 1 }',
      error: error instanceof Error ? error.message : String(error),
    });
  }
  
  try {
    await User.collection.createIndex({ "professional.assignedProperties": 1 });
    logger.info("Created index", {
      action: 'migration:indexes:create',
      index: '{ professional.assignedProperties: 1 }',
    });
  } catch (error) {
    logger.info("Index already exists or error", {
      action: 'migration:indexes:create',
      index: '{ professional.assignedProperties: 1 }',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Print migration summary with performance metrics
 */
function printSummary(): void {
  stats.endTime = Date.now();
  const durationMs = stats.endTime - stats.startTime;
  const durationSec = durationMs / 1000;
  const throughput = stats.total > 0 ? (stats.total / durationSec).toFixed(2) : "0";
  
  logger.info("Migration summary", {
    action: 'migration:summary',
    stats: {
      total: stats.total,
      updated: stats.updated,
      skipped: stats.skipped,
      batchesProcessed: stats.batchesProcessed,
      errors: stats.errors,
    },
    performance: {
      durationMinutes: (durationSec / 60).toFixed(2),
      durationSeconds: durationSec.toFixed(1),
      throughputPerSecond: throughput,
      avgBatchTimeSeconds: stats.batchesProcessed > 0 ? (durationSec / stats.batchesProcessed).toFixed(2) : null,
    },
    rolesNormalized: stats.rolesNormalized,
    subRolesAdded: stats.subRolesAdded,
    assignedPropertiesAdded: stats.assignedPropertiesAdded,
    failedUserIds: stats.failedUserIds,
  });
  
  if (DRY_RUN) {
    logger.warn("DRY RUN MODE: No changes were made to the database", {
      action: 'migration:complete:dry_run',
    });
  } else if (stats.errors > 0) {
    logger.error("Migration FAILED and was rolled back", {
      action: 'migration:complete:failed',
      errors: stats.errors,
      failedUserIds: stats.failedUserIds,
    });
    process.exit(1);
  } else {
    logger.info("Migration completed successfully", {
      action: 'migration:complete:success',
      updated: stats.updated,
      skipped: stats.skipped,
    });
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  let session: ClientSession | null = null;
  try {
    logger.info("STRICT v4.1 RBAC Migration Tool", {
      action: 'migration:start',
      startTime: new Date().toISOString(),
      orgId: ORG_ID,
      dryRun: DRY_RUN,
      batchSize: BATCH_SIZE,
    });
    
    await connectDatabase();
    await validatePreMigration();
    
    if (!DRY_RUN) {
      await createBackup();
      
      // Single transaction covering all batches for full rollback safety
      session = await mongoose.startSession();
      session.startTransaction();
      try {
        await runMigration(session);
        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        await session.endSession();
        session = null;
      }
    } else {
      await runMigration();
    }
    
    await createIndexes();
    
    printSummary();
    
  } catch (error) {
    logger.error("Migration failed", {
      action: 'migration:failed',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logger.info("Migration tool complete", {
      action: 'migration:complete',
      completedAt: new Date().toISOString(),
      disconnected: true,
    });
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main as migrateRbacV41 };
