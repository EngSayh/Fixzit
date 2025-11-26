#!/usr/bin/env tsx
/**
 * PII Encryption Migration Script
 * 
 * Encrypts existing plaintext PII data in User collection.
 * 
 * FIELDS ENCRYPTED:
 * - personal.nationalId (National ID)
 * - personal.passport (Passport Number)
 * - employment.salary (Salary)
 * - security.mfa.secret (MFA Secret)
 * 
 * SAFETY FEATURES:
 * - Dry-run mode (preview changes without modifying database)
 * - Org-scoped processing (--org=ORG_ID)
 * - Batch processing with configurable batch size
 * - Pre-migration backup
 * - Progress tracking with ETA
 * - Rollback capability
 * - Idempotent (skips already encrypted fields)
 * 
 * USAGE:
 *   # Preview changes (no database modification)
 *   tsx scripts/migrate-encrypt-pii.ts --dry-run
 *   
 *   # Encrypt specific organization
 *   tsx scripts/migrate-encrypt-pii.ts --org=abc123
 *   
 *   # Encrypt all organizations
 *   tsx scripts/migrate-encrypt-pii.ts
 *   
 *   # Custom batch size
 *   tsx scripts/migrate-encrypt-pii.ts --batch-size=100
 *   
 *   # Rollback (restore from backup)
 *   tsx scripts/migrate-encrypt-pii.ts --rollback
 * 
 * REQUIREMENTS:
 * - ENCRYPTION_KEY environment variable must be set
 * - Database connection configured
 * 
 * COMPLIANCE:
 * - GDPR Article 32: Security of processing (encryption at rest)
 * - HIPAA: PHI encryption requirements
 * - ISO 27001: Cryptographic controls
 */

import mongoose from 'mongoose';
import { User } from '@/server/models/User';
import { encryptField, isEncrypted } from '@/lib/security/encryption';
import { logger } from '@/lib/logger';

// Configuration from CLI args
const DRY_RUN = process.argv.includes('--dry-run');
const ROLLBACK = process.argv.includes('--rollback');
const ORG_ID = process.argv.find(arg => arg.startsWith('--org='))?.split('=')[1];
const BATCH_SIZE = parseInt(
  process.argv.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '500',
  10,
);

const BACKUP_COLLECTION_PREFIX = 'users_backup_pii_encryption';

// Fields to encrypt
const ENCRYPTED_FIELDS = [
  { path: 'personal.nationalId', name: 'National ID' },
  { path: 'personal.passport', name: 'Passport' },
  { path: 'employment.salary', name: 'Salary' },
  { path: 'security.mfa.secret', name: 'MFA Secret' },
];

// Statistics
interface MigrationStats {
  total: number;
  processed: number;
  encrypted: number;
  skipped: number;
  errors: number;
  fieldStats: Record<string, { encrypted: number; skipped: number }>;
  startTime: number;
  endTime?: number;
  failedUserIds: string[];
}

const stats: MigrationStats = {
  total: 0,
  processed: 0,
  encrypted: 0,
  skipped: 0,
  errors: 0,
  fieldStats: {},
  startTime: Date.now(),
  failedUserIds: [],
};

// Initialize field stats
for (const field of ENCRYPTED_FIELDS) {
  stats.fieldStats[field.path] = { encrypted: 0, skipped: 0 };
}

/**
 * Connect to MongoDB
 */
async function connectDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    throw new Error('MONGODB_URI or DATABASE_URL environment variable not set');
  }
  
  await mongoose.connect(mongoUri);
  logger.info('migration:db:connect', {
    action: 'pii_encryption_migration',
    readyState: mongoose.connection.readyState,
  });
}

/**
 * Create backup of users collection
 */
async function createBackup(): Promise<string> {
  const backupCollectionName = `${BACKUP_COLLECTION_PREFIX}_${ORG_ID || 'all'}_${Date.now()}`;
  
  const filter = ORG_ID ? { orgId: ORG_ID } : {};
  const users = await User.find(filter).lean();
  
  if (users.length === 0) {
    logger.warn('migration:backup:empty', {
      action: 'pii_encryption_migration',
      orgId: ORG_ID,
      message: 'No users found to backup',
    });
    return backupCollectionName;
  }
  
  const backupCollection = mongoose.connection.collection(backupCollectionName);
  await backupCollection.insertMany(users);
  
  logger.info('migration:backup:created', {
    action: 'pii_encryption_migration',
    backupCollection: backupCollectionName,
    orgId: ORG_ID,
    userCount: users.length,
  });
  
  return backupCollectionName;
}

/**
 * Restore from backup (rollback)
 */
async function restoreFromBackup(): Promise<void> {
  console.log('🔄 Searching for backup collections...\n');
  
  const collections = await mongoose.connection.db!.listCollections().toArray();
  const backupCollections = collections
    .filter(c => c.name.startsWith(BACKUP_COLLECTION_PREFIX))
    .sort((a, b) => b.name.localeCompare(a.name)); // Most recent first
  
  if (backupCollections.length === 0) {
    console.error('❌ No backup collections found.');
    process.exit(1);
  }
  
  console.log('Available backups:');
  backupCollections.forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.name}`);
  });
  
  // Use most recent backup
  const backupName = backupCollections[0].name;
  console.log(`\n📦 Restoring from: ${backupName}\n`);
  
  const backupCollection = mongoose.connection.collection(backupName);
  const backupUsers = await backupCollection.find({}).toArray();
  
  console.log(`Found ${backupUsers.length} users in backup\n`);
  
  // Restore users (replace encrypted fields with backup values)
  let restored = 0;
  for (const backupUser of backupUsers) {
    try {
      const updates: any = {};
      
      for (const field of ENCRYPTED_FIELDS) {
        const parts = field.path.split('.');
        let value = backupUser;
        for (const part of parts) {
          value = value?.[part];
        }
        
        if (value !== null && value !== undefined) {
          updates[field.path] = value;
        }
      }
      
      if (Object.keys(updates).length > 0) {
        await User.updateOne({ _id: backupUser._id }, { $set: updates });
        restored++;
      }
    } catch (error) {
      console.error(`❌ Failed to restore user ${backupUser._id}:`, error);
    }
  }
  
  console.log(`\n✅ Restored ${restored} users from backup\n`);
  logger.info('migration:rollback:complete', {
    action: 'pii_encryption_rollback',
    backupCollection: backupName,
    restored,
  });
}

/**
 * Get value from nested path
 */
function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

/**
 * Encrypt PII fields for a batch of users
 */
async function encryptUserBatch(users: any[]): Promise<void> {
  for (const user of users) {
    try {
      const updates: any = {};
      let hasUpdates = false;
      
      for (const field of ENCRYPTED_FIELDS) {
        const value = getNestedValue(user, field.path);
        
        if (value && !isEncrypted(value)) {
          // Encrypt field
          const encrypted = encryptField(value, field.path);
          if (encrypted) {
            updates[field.path] = encrypted;
            hasUpdates = true;
            stats.fieldStats[field.path].encrypted++;
          }
        } else if (value && isEncrypted(value)) {
          // Already encrypted, skip
          stats.fieldStats[field.path].skipped++;
        }
      }
      
      if (hasUpdates) {
        if (!DRY_RUN) {
          await User.updateOne(
            { _id: user._id, orgId: user.orgId },
            { $set: updates },
          );
        }
        stats.encrypted++;
      } else {
        stats.skipped++;
      }
      
      stats.processed++;
      
    } catch (error) {
      stats.errors++;
      stats.failedUserIds.push(user._id.toString());
      logger.error('migration:user_encryption_failed', {
        action: 'pii_encryption_migration',
        userId: user._id.toString(),
        orgId: user.orgId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * Display progress
 */
function displayProgress(): void {
  const elapsed = Date.now() - stats.startTime;
  const rate = stats.processed / (elapsed / 1000);
  const remaining = stats.total - stats.processed;
  const eta = remaining / rate;
  
  console.log(`\r⏳ Progress: ${stats.processed}/${stats.total} users (${Math.round(stats.processed / stats.total * 100)}%) | ` +
              `Encrypted: ${stats.encrypted} | Skipped: ${stats.skipped} | Errors: ${stats.errors} | ` +
              `ETA: ${Math.round(eta)}s`);
}

/**
 * Main migration function
 */
async function migrate(): Promise<void> {
  console.log('🔐 PII Encryption Migration\n');
  console.log('═══════════════════════════════════════════════════════\n');
  
  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  if (ROLLBACK) {
    await restoreFromBackup();
    return;
  }
  
  // Validate encryption key
  if (!process.env.ENCRYPTION_KEY && !process.env.PII_ENCRYPTION_KEY) {
    console.error('❌ ENCRYPTION_KEY environment variable not set');
    process.exit(1);
  }
  
  // Connect to database
  await connectDatabase();
  
  // Build query filter
  const filter: any = {};
  if (ORG_ID) {
    filter.orgId = ORG_ID;
    console.log(`📊 Org-scoped migration: ${ORG_ID}\n`);
  } else {
    console.log('⚠️  WARNING: Migrating ALL organizations\n');
  }
  
  // Count total users
  stats.total = await User.countDocuments(filter);
  console.log(`📈 Total users to process: ${stats.total}\n`);
  
  if (stats.total === 0) {
    console.log('✅ No users found. Migration complete.\n');
    return;
  }
  
  // Create backup (skip in dry-run)
  let backupCollectionName: string | undefined;
  if (!DRY_RUN) {
    backupCollectionName = await createBackup();
    console.log(`💾 Backup created: ${backupCollectionName}\n`);
  }
  
  // Process in batches
  console.log(`⚙️  Processing in batches of ${BATCH_SIZE}...\n`);
  
  let skip = 0;
  while (skip < stats.total) {
    const users = await User.find(filter)
      .skip(skip)
      .limit(BATCH_SIZE)
      .lean();
    
    await encryptUserBatch(users);
    skip += BATCH_SIZE;
    
    displayProgress();
  }
  
  stats.endTime = Date.now();
  
  // Final report
  console.log('\n\n═══════════════════════════════════════════════════════');
  console.log('📊 MIGRATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════\n');
  
  console.log(`Total Users:          ${stats.total}`);
  console.log(`Processed:            ${stats.processed}`);
  console.log(`Encrypted:            ${stats.encrypted}`);
  console.log(`Skipped (already encrypted): ${stats.skipped}`);
  console.log(`Errors:               ${stats.errors}`);
  console.log(`Duration:             ${Math.round((stats.endTime - stats.startTime) / 1000)}s\n`);
  
  console.log('Field Statistics:');
  for (const field of ENCRYPTED_FIELDS) {
    const fieldStat = stats.fieldStats[field.path];
    console.log(`  ${field.name}:`);
    console.log(`    Encrypted: ${fieldStat.encrypted}`);
    console.log(`    Skipped:   ${fieldStat.skipped}`);
  }
  
  if (stats.errors > 0) {
    console.log(`\n⚠️  ${stats.errors} errors occurred. Check logs for details.`);
    console.log(`Failed user IDs: ${stats.failedUserIds.join(', ')}`);
  }
  
  if (backupCollectionName) {
    console.log(`\n💾 Backup available: ${backupCollectionName}`);
    console.log(`   To rollback: tsx scripts/migrate-encrypt-pii.ts --rollback`);
  }
  
  console.log('\n✅ Migration complete!\n');
  
  logger.info('migration:pii_encryption:complete', {
    action: 'pii_encryption_migration',
    stats,
    backupCollection: backupCollectionName,
    dryRun: DRY_RUN,
  });
}

// Run migration
migrate()
  .then(() => {
    mongoose.connection.close();
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    logger.error('migration:pii_encryption:failed', {
      action: 'pii_encryption_migration',
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    mongoose.connection.close();
    process.exit(1);
  });
