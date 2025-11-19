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
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import bcrypt from 'bcryptjs';

// Load environment files in order of precedence
config({ path: '.env.local' });
config({ path: '.env.test', override: true });

const TEST_PASSWORD = 'Test@1234';

const ORG_FIXTURES = [
  {
    key: 'platform',
    _idHex: '66a000000000000000000001',
    orgId: 'fixzit-platform',
    name: 'Fixzit Platform HQ',
    code: 'FIXZIT',
    type: 'CORPORATE',
    description: 'Internal Fixzit organization used for smoke testing.',
    website: 'https://fixzit.sa',
    contact: {
      primary: {
        name: 'Transformation Office',
        title: 'Program Director',
        email: 'ops@fixzit.sa',
        phone: '+966-11-123-4567',
        mobile: '+966-50-000-0001',
      },
      billing: {
        name: 'Finance Ops',
        email: 'finance@fixzit.sa',
        phone: '+966-11-654-3210',
        address: {
          street: 'King Fahd Road',
          city: 'Riyadh',
          region: 'Riyadh',
          postalCode: '11564',
          country: 'Saudi Arabia',
        },
      },
      technical: {
        name: 'Platform Engineering',
        email: 'platform@fixzit.sa',
        phone: '+966-11-555-0101',
      },
    },
    address: {
      headquarters: {
        street: 'King Fahd Road 123',
        city: 'Riyadh',
        region: 'Riyadh',
        postalCode: '11564',
        country: 'Saudi Arabia',
      },
    },
    subscription: {
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      startDate: new Date('2024-01-01'),
      billingCycle: 'ANNUAL',
      features: {
        maxUsers: 500,
        maxProperties: 200,
        maxWorkOrders: 5000,
        advancedReporting: true,
        apiAccess: true,
        customBranding: true,
        ssoIntegration: true,
        mobileApp: true,
        supportLevel: 'PREMIUM',
      },
      usage: {
        currentUsers: 18,
        currentProperties: 32,
        currentWorkOrders: 480,
        apiCalls: 3200,
        storageUsed: 128,
      },
      limits: { exceeded: false, warnings: [] },
    },
    settings: {
      locale: 'en',
      timezone: 'Asia/Riyadh',
      currency: 'SAR',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: '1,234.56',
      businessHours: {
        workdays: ['SUN', 'MON', 'TUE', 'WED', 'THU'],
        startTime: '09:00',
        endTime: '18:00',
        breakTime: { enabled: true, start: '13:00', end: '14:00' },
      },
    },
    tags: ['smoke-test', 'platform'],
  },
  {
    key: 'enterprise',
    _idHex: '66a000000000000000000002',
    orgId: 'alpha-developments',
    name: 'Alpha Developments',
    code: 'ALPHACO',
    type: 'CORPORATE',
    description: 'Demo enterprise tenant used for multi-tenant regression.',
    website: 'https://alpha.dev.sa',
    contact: {
      primary: {
        name: 'Alpha Ops',
        title: 'FM Director',
        email: 'ops@alpha.dev.sa',
        phone: '+966-12-444-2222',
        mobile: '+966-55-777-2222',
      },
      billing: {
        name: 'Alpha Finance',
        email: 'finance@alpha.dev.sa',
        phone: '+966-12-111-0909',
        address: {
          street: 'Olaya Street 45',
          city: 'Riyadh',
          region: 'Riyadh',
          postalCode: '12611',
          country: 'Saudi Arabia',
        },
      },
      technical: {
        name: 'Alpha IT',
        email: 'it@alpha.dev.sa',
        phone: '+966-12-909-9988',
      },
    },
    address: {
      headquarters: {
        street: 'Olaya Street 45',
        city: 'Riyadh',
        region: 'Riyadh',
        postalCode: '12611',
        country: 'Saudi Arabia',
      },
    },
    subscription: {
      plan: 'PREMIUM',
      status: 'ACTIVE',
      startDate: new Date('2024-02-01'),
      billingCycle: 'MONTHLY',
      features: {
        maxUsers: 150,
        maxProperties: 60,
        maxWorkOrders: 1200,
        advancedReporting: true,
        apiAccess: false,
        customBranding: true,
        ssoIntegration: false,
        mobileApp: true,
        supportLevel: 'STANDARD',
      },
      usage: {
        currentUsers: 42,
        currentProperties: 18,
        currentWorkOrders: 210,
        apiCalls: 320,
        storageUsed: 32,
      },
      limits: { exceeded: false, warnings: [] },
    },
    settings: {
      locale: 'ar',
      timezone: 'Asia/Riyadh',
      currency: 'SAR',
      dateFormat: 'DD/MM/YYYY',
      numberFormat: '1.234,56',
      businessHours: {
        workdays: ['SUN', 'MON', 'TUE', 'WED', 'THU'],
        startTime: '08:00',
        endTime: '17:00',
        breakTime: { enabled: true, start: '12:30', end: '13:15' },
      },
    },
    tags: ['multi-tenant', 'demo'],
  },
] as const;

const USER_FIXTURES = [
  {
    key: 'superadmin',
    _idHex: '66a000000000000000000101',
    orgKey: 'platform',
    email: 'superadmin@test.fixzit.co',
    code: 'SA-0001',
    username: 'superadmin',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'SUPER_ADMIN',
    isSuperAdmin: true,
    phone: '+966-50-000-0001',
  },
  {
    key: 'platform-admin',
    _idHex: '66a000000000000000000102',
    orgKey: 'platform',
    email: 'admin@test.fixzit.co',
    code: 'AD-0001',
    username: 'fixzit-admin',
    firstName: 'Fixzit',
    lastName: 'Admin',
    role: 'ADMIN',
    department: 'Platform Ops',
    phone: '+966-50-000-0002',
  },
  {
    key: 'platform-technician',
    _idHex: '66a000000000000000000103',
    orgKey: 'platform',
    email: 'technician@test.fixzit.co',
    code: 'TECH-0001',
    username: 'senior-tech',
    firstName: 'Lead',
    lastName: 'Technician',
    role: 'TECHNICIAN',
    department: 'FM Field',
    phone: '+966-50-000-0003',
  },
  {
    key: 'platform-tenant',
    _idHex: '66a000000000000000000104',
    orgKey: 'platform',
    email: 'tenant@test.fixzit.co',
    code: 'TEN-0001',
    username: 'tenant-user',
    firstName: 'Tenant',
    lastName: 'User',
    role: 'TENANT',
    department: 'Residential',
    phone: '+966-50-000-0004',
  },
  {
    key: 'alpha-manager',
    _idHex: '66a000000000000000000105',
    orgKey: 'enterprise',
    email: 'property-manager@test.fixzit.co',
    code: 'PM-0001',
    username: 'alpha-manager',
    firstName: 'Alpha',
    lastName: 'Manager',
    role: 'PROPERTY_MANAGER',
    department: 'Portfolio',
    phone: '+966-50-000-0005',
  },
  {
    key: 'alpha-vendor',
    _idHex: '66a000000000000000000106',
    orgKey: 'enterprise',
    email: 'vendor@test.fixzit.co',
    code: 'VEND-0001',
    username: 'vendor-success',
    firstName: 'Vendor',
    lastName: 'Lead',
    role: 'VENDOR',
    department: 'Marketplace',
    phone: '+966-50-000-0006',
  },
] as const;

const PRIMARY_TEST_ORG = ORG_FIXTURES[0];
const TEST_ORG_ID = PRIMARY_TEST_ORG.orgId;
const TEST_ORG_NAME = PRIMARY_TEST_ORG.name;

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

async function seedSmokeTestData() {
  log('Seeding smoke-test organizations and users...', 'INFO');

  try {
    const { connectToDatabase } = await import('../lib/mongodb-unified');
    await connectToDatabase();

    const mongooseModule = await import('mongoose');
    const mongoose = mongooseModule.default;
    const { Organization } = await import('../server/models/Organization');
    const { User } = await import('../server/models/User');

    const toObjectId = (hex: string) => new mongooseModule.Types.ObjectId(hex);
    const orgMap = new Map<string, ReturnType<typeof toObjectId>>();

    for (const fixture of ORG_FIXTURES) {
      const updateResult = await Organization.updateOne(
        { orgId: fixture.orgId },
        {
          $set: {
            name: fixture.name,
            code: fixture.code,
            type: fixture.type,
            description: fixture.description,
            website: fixture.website,
            contact: fixture.contact,
            address: fixture.address,
            subscription: fixture.subscription,
            settings: fixture.settings,
            tags: fixture.tags,
          },
          $setOnInsert: { _id: toObjectId(fixture._idHex) },
        },
        { upsert: true }
      );

      const orgDoc = await Organization.findOne({ orgId: fixture.orgId }).lean();
      if (orgDoc?._id) {
        orgMap.set(fixture.key, orgDoc._id as ReturnType<typeof toObjectId>);
      }

      log(`${updateResult.upsertedCount ? 'Created' : 'Updated'} organization ${fixture.name}`, updateResult.upsertedCount ? 'SUCCESS' : 'INFO');
    }

    let created = 0;
    let updated = 0;

    for (const userFixture of USER_FIXTURES) {
      const orgObjectId = orgMap.get(userFixture.orgKey);
      if (!orgObjectId) {
        log(`Skipping user ${userFixture.email} – missing org ${userFixture.orgKey}`, 'WARN');
        continue;
      }

      const normalizedEmail = userFixture.email.toLowerCase();
      const passwordHash = await bcrypt.hash(userFixture.password || TEST_PASSWORD, 12);

      const updateResult = await User.updateOne(
        { email: normalizedEmail },
        {
          $set: {
            orgId: orgObjectId,
            code: userFixture.code,
            username: userFixture.username,
            email: normalizedEmail,
            password: passwordHash,
            phone: userFixture.phone,
            personal: {
              firstName: userFixture.firstName,
              lastName: userFixture.lastName,
              fullName: `${userFixture.firstName} ${userFixture.lastName}`,
            },
            professional: {
              role: userFixture.role,
              department: userFixture.department,
            },
            status: 'ACTIVE',
            isSuperAdmin: Boolean(userFixture.isSuperAdmin),
            security: {
              lastLogin: new Date(),
            },
          },
          $setOnInsert: {
            _id: toObjectId(userFixture._idHex),
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );

      if (updateResult.upsertedCount) {
        created++;
        log(`Created user: ${userFixture.email} (${userFixture.role})`, 'SUCCESS');
      } else {
        updated++;
        log(`Updated user: ${userFixture.email}`, 'INFO');
      }
    }

    log(`Test users seeded: ${created} created, ${updated} updated`, 'SUCCESS');

    await mongoose.disconnect();
  } catch (error) {
    log(`Failed to seed fixtures: ${error instanceof Error ? error.message : String(error)}`, 'ERROR');
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
    
    // Step 3: Seed organizations and users for smoke tests
    await seedSmokeTestData();
    
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
