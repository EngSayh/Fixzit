#!/usr/bin/env tsx
/**
 * Setup Test Environment
 * 
 * Ensures test environment is properly configured:
 * - Creates .env.test if missing
 * - Seeds test database with required users
 * - Validates all connections
 * 
 * Usage:
 *   tsx scripts/setup-test-env.ts
 */

import { config } from 'dotenv';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

// Load environment files in order of precedence
config({ path: '.env.local' });
config({ path: '.env.test', override: true });

const TEST_PASSWORD = 'Test@1234';
const TEST_ORG_ID = 'test-org-fixzit';
const TEST_ORG_NAME = 'Test Organization';

interface TestUser {
  email: string;
  password: string;
  name: string;
  role: string;
  orgId: string;
}

function log(message: string, level: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARN' = 'INFO') {
  const colors = {
    INFO: '\x1b[36m',
    SUCCESS: '\x1b[32m',
    ERROR: '\x1b[31m',
    WARN: '\x1b[33m',
  };
  const reset = '\x1b[0m';
  console.log(`${colors[level]}[${level}]${reset} ${message}`);
}

async function ensureTestEnvFile() {
  if (!existsSync('.env.test')) {
    log('Creating .env.test file...', 'INFO');
    
    const envTestContent = `# =============================================================================
# TEST ENVIRONMENT VARIABLES
# =============================================================================
# Generated test accounts - Password for all: Test@1234
# =============================================================================

# MongoDB (inherited from .env.local)
# MONGODB_URI is loaded from .env.local automatically

# === SUPER ADMIN TEST ACCOUNT ===
TEST_SUPERADMIN_EMAIL=superadmin@test.fixzit.co
TEST_SUPERADMIN_PASSWORD=${TEST_PASSWORD}

# === ADMIN TEST ACCOUNT ===
TEST_ADMIN_EMAIL=admin@test.fixzit.co
TEST_ADMIN_PASSWORD=${TEST_PASSWORD}

# === MANAGER TEST ACCOUNT ===
TEST_MANAGER_EMAIL=property-manager@test.fixzit.co
TEST_MANAGER_PASSWORD=${TEST_PASSWORD}

# === TECHNICIAN TEST ACCOUNT ===
TEST_TECHNICIAN_EMAIL=technician@test.fixzit.co
TEST_TECHNICIAN_PASSWORD=${TEST_PASSWORD}

# === TENANT TEST ACCOUNT ===
TEST_TENANT_EMAIL=tenant@test.fixzit.co
TEST_TENANT_PASSWORD=${TEST_PASSWORD}

# === VENDOR TEST ACCOUNT ===
TEST_VENDOR_EMAIL=vendor@test.fixzit.co
TEST_VENDOR_PASSWORD=${TEST_PASSWORD}

# === TEST ORG ===
TEST_ORG_ID=${TEST_ORG_ID}
TEST_ORG_NAME=${TEST_ORG_NAME}

# === API Testing ===
BASE_URL=http://localhost:3000
`;
    
    await writeFile('.env.test', envTestContent);
    log('.env.test created successfully', 'SUCCESS');
  } else {
    log('.env.test already exists', 'INFO');
  }
}

async function seedTestUsers() {
  log('Seeding test users...', 'INFO');
  
  try {
    // Dynamically import after env is loaded
    const { connectToDatabase } = await import('../lib/mongodb-unified');
    await connectToDatabase();
    
    const mongoose = (await import('mongoose')).default;
    const db = mongoose.connection.db;
    
    if (!db) {
      throw new Error('Database connection not established');
    }

    // Create test organization
    const orgsCollection = db.collection('organizations');
    const existingOrg = await orgsCollection.findOne({ orgId: TEST_ORG_ID });
    
    if (!existingOrg) {
      log('Creating test organization...', 'INFO');
      await orgsCollection.insertOne({
        orgId: TEST_ORG_ID,
        name: TEST_ORG_NAME,
        subscriptionPlan: 'Enterprise',
        status: 'active',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      log('Test organization created', 'SUCCESS');
    } else {
      log('Test organization already exists', 'INFO');
    }

    // Create test users
    const usersCollection = db.collection('users');
    const testUsers: TestUser[] = [
      {
        email: 'superadmin@test.fixzit.co',
        name: 'Super Admin Test',
        role: 'SUPER_ADMIN',
        password: TEST_PASSWORD,
        orgId: TEST_ORG_ID,
      },
      {
        email: 'admin@test.fixzit.co',
        name: 'Admin Test',
        role: 'ADMIN',
        password: TEST_PASSWORD,
        orgId: TEST_ORG_ID,
      },
      {
        email: 'property-manager@test.fixzit.co',
        name: 'Property Manager Test',
        role: 'MANAGER',
        password: TEST_PASSWORD,
        orgId: TEST_ORG_ID,
      },
      {
        email: 'technician@test.fixzit.co',
        name: 'Technician Test',
        role: 'TECHNICIAN',
        password: TEST_PASSWORD,
        orgId: TEST_ORG_ID,
      },
      {
        email: 'tenant@test.fixzit.co',
        name: 'Tenant Test',
        role: 'TENANT',
        password: TEST_PASSWORD,
        orgId: TEST_ORG_ID,
      },
      {
        email: 'vendor@test.fixzit.co',
        name: 'Vendor Test',
        role: 'VENDOR',
        password: TEST_PASSWORD,
        orgId: TEST_ORG_ID,
      },
    ];

    let created = 0;
    let existing = 0;

    for (const user of testUsers) {
      const existingUser = await usersCollection.findOne({ email: user.email });
      
      if (!existingUser) {
        const passwordHash = await bcrypt.hash(user.password, 10);
        
        await usersCollection.insertOne({
          email: user.email,
          name: user.name,
          role: user.role,
          passwordHash,
          orgId: user.orgId,
          isActive: true,
          permissions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        created++;
        log(`Created user: ${user.email} (${user.role})`, 'SUCCESS');
      } else {
        existing++;
      }
    }

    log(`Test users seeded: ${created} created, ${existing} already existed`, 'SUCCESS');
    
    // Disconnect
    await mongoose.disconnect();
    
  } catch (error) {
    log(`Failed to seed test users: ${error instanceof Error ? error.message : String(error)}`, 'ERROR');
    throw error;
  }
}

async function validateMongoConnection() {
  log('Validating MongoDB connection...', 'INFO');
  
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  
  if (!mongoUri) {
    log('MONGODB_URI not found in environment', 'ERROR');
    log('Make sure .env.local exists with MONGODB_URI configured', 'WARN');
    return false;
  }
  
  try {
    const { connectToDatabase } = await import('../lib/mongodb-unified');
    await connectToDatabase();
    
    const mongoose = (await import('mongoose')).default;
    const db = mongoose.connection.db;
    
    if (db) {
      await db.admin().ping();
      log(`MongoDB connection successful: ${db.databaseName}`, 'SUCCESS');
      await mongoose.disconnect();
      return true;
    }
    
    return false;
  } catch (error) {
    log(`MongoDB connection failed: ${error instanceof Error ? error.message : String(error)}`, 'ERROR');
    return false;
  }
}

async function main() {
  console.log('🔧 Setting Up Test Environment\n');
  
  try {
    // Step 1: Ensure .env.test exists
    await ensureTestEnvFile();
    
    // Reload environment after creating .env.test
    config({ path: '.env.test', override: true });
    
    // Step 2: Validate MongoDB connection
    const dbConnected = await validateMongoConnection();
    
    if (!dbConnected) {
      log('Cannot proceed without database connection', 'ERROR');
      log('Please ensure MongoDB is running and MONGODB_URI is set in .env.local', 'WARN');
      process.exit(1);
    }
    
    // Step 3: Seed test users
    await seedTestUsers();
    
    // Step 4: Create state directory for Playwright
    await mkdir('tests/state', { recursive: true });
    log('Created tests/state directory', 'SUCCESS');
    
    console.log('\n✅ Test environment setup complete!');
    console.log('\nNext steps:');
    console.log('  1. Run API tests: pnpm exec tsx scripts/test-api-endpoints.ts');
    console.log('  2. Run E2E tests: pnpm exec playwright test');
    console.log('  3. Generate auth states: pnpm exec playwright test tests/setup-auth.ts\n');
    
  } catch (error) {
    log(`Setup failed: ${error instanceof Error ? error.message : String(error)}`, 'ERROR');
    process.exit(1);
  }
}

main();
