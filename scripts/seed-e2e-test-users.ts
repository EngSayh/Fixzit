#!/usr/bin/env tsx
/**
 * Unified E2E Test User Seeding Script
 * 
 * Seeds all users required for E2E tests:
 * - TEST_USER_* (primary admin)
 * - TEST_NONADMIN_* (regular user for RBAC tests)
 * - TEST_MANAGER_* (manager for role-based tests)
 * - Demo users for login page quick access
 * 
 * Run: npx tsx scripts/seed-e2e-test-users.ts
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Types } from 'mongoose';

const envTestPath = path.resolve(process.cwd(), '.env.test');
if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath });
  console.log(`✅ Loaded test env from ${envTestPath}`);
} else {
  dotenv.config();
  console.warn('⚠️  .env.test not found, using process environment variables');
}

const TEST_ORG_ID = process.env.TEST_ORG_ID || '68dc8955a1ba6ed80ff372dc';
const SEED_USER_ID = new Types.ObjectId('000000000000000000000001');
const orgObjectId = Types.ObjectId.isValid(TEST_ORG_ID)
  ? new Types.ObjectId(TEST_ORG_ID)
  : new Types.ObjectId();

// Test user passwords from env or defaults
const PRIMARY_PASSWORD = process.env.TEST_USER_PASSWORD || process.env.TEST_SUPERADMIN_PASSWORD || 'Test@1234';
const NONADMIN_PASSWORD = process.env.TEST_NONADMIN_PASSWORD || process.env.TEST_MANAGER_PASSWORD || 'Test@1234';
const DEMO_SUPERADMIN_PASSWORD = process.env.DEMO_SUPERADMIN_PASSWORD || 'admin123';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'password123';

// Test phone numbers
const PRIMARY_PHONE = process.env.TEST_USER_PHONE || '+966552233456';
const NONADMIN_PHONE = process.env.TEST_NONADMIN_PHONE || '+966552233456';
const DEMO_PHONE = process.env.DEMO_PHONE || '+966552233456';

const normalizeEmployeeId = (value: string) => value.trim().toUpperCase();
const PRIMARY_EMPLOYEE_ID = normalizeEmployeeId(
  process.env.TEST_USER_EMPLOYEE || process.env.TEST_SUPERADMIN_EMPLOYEE || 'EMP-TEST-001'
);
const NONADMIN_EMPLOYEE_ID = normalizeEmployeeId(
  process.env.TEST_NONADMIN_EMPLOYEE || process.env.TEST_MANAGER_EMPLOYEE || 'EMP-TEST-100'
);
const DEMO_EMPLOYEE_ID = normalizeEmployeeId(process.env.DEMO_SUPERADMIN_EMPLOYEE || 'EMP-DEMO-001');

const e2eTestUsers = [
  // ============================================
  // PRIMARY TEST USERS (for TEST_USER_* env vars)
  // ============================================
  {
    envVars: {
      email: 'TEST_USER_EMAIL',
      password: 'TEST_USER_PASSWORD',
      employee: 'TEST_USER_EMPLOYEE'
    },
    code: 'TEST-PRIMARY-ADMIN',
    username: PRIMARY_EMPLOYEE_ID,
    email: process.env.TEST_USER_EMAIL || process.env.TEST_SUPERADMIN_IDENTIFIER || 'test-admin@fixzit.co',
    password: PRIMARY_PASSWORD,
    phone: PRIMARY_PHONE,
    employeeId: PRIMARY_EMPLOYEE_ID,
    orgId: orgObjectId,
    createdBy: SEED_USER_ID,
    isSuperAdmin: true,
    personal: {
      firstName: 'Test',
      lastName: 'Admin Primary',
      nationalId: '2000000001',
      dateOfBirth: new Date('1980-01-01'),
      gender: 'Male',
      nationality: 'SA',
      phone: PRIMARY_PHONE,
      address: {
        street: 'Test St 1',
        city: 'Riyadh',
        region: 'Riyadh',
        postalCode: '11564',
        country: 'SA'
      }
    },
    professional: {
      role: 'SUPER_ADMIN',
      title: 'E2E Test Super Administrator',
      department: 'Testing',
      skills: [],
      licenses: [],
      certifications: []
    },
    security: {
      accessLevel: 'ADMIN',
      permissions: ['*']
    },
    preferences: {
      notifications: {
        email: true,
        sms: false,
        app: true,
        workOrders: true,
        maintenance: true,
        reports: true
      },
      language: 'en',
      timezone: 'Asia/Riyadh',
      theme: 'LIGHT'
    },
    workload: {
      maxAssignments: 100,
      currentAssignments: 0,
      available: true,
      location: {
        city: 'Riyadh',
        region: 'Riyadh',
        radius: 100
      },
      workingHours: {
        start: '00:00',
        end: '23:59',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        timezone: 'Asia/Riyadh'
      }
    },
    performance: { reviews: [] },
    employment: {
      employeeId: process.env.TEST_USER_EMPLOYEE || process.env.TEST_SUPERADMIN_EMPLOYEE || 'EMP-TEST-001',
      benefits: []
    },
    compliance: { training: [] },
    status: 'ACTIVE',
    tenantId: 'test-tenant'
  },

  // ============================================
  // NON-ADMIN TEST USER (for RBAC tests)
  // ============================================
  {
    envVars: {
      email: 'TEST_NONADMIN_IDENTIFIER',
      password: 'TEST_NONADMIN_PASSWORD',
      employee: 'TEST_NONADMIN_EMPLOYEE'
    },
    code: 'TEST-NONADMIN',
    username: NONADMIN_EMPLOYEE_ID,
    email: process.env.TEST_NONADMIN_IDENTIFIER || process.env.TEST_MANAGER_IDENTIFIER || 'test-nonadmin@fixzit.co',
    password: NONADMIN_PASSWORD,
    phone: NONADMIN_PHONE,
    employeeId: NONADMIN_EMPLOYEE_ID,
    orgId: orgObjectId,
    createdBy: SEED_USER_ID,
    isSuperAdmin: false,
    personal: {
      firstName: 'Test',
      lastName: 'Non-Admin',
      nationalId: '2000000100',
      dateOfBirth: new Date('1990-01-01'),
      gender: 'Female',
      nationality: 'SA',
      phone: NONADMIN_PHONE,
      address: {
        street: 'Test St 100',
        city: 'Jeddah',
        region: 'Makkah',
        postalCode: '21564',
        country: 'SA'
      }
    },
    professional: {
      role: 'EMPLOYEE',
      title: 'E2E Test Regular User',
      department: 'Operations',
      skills: [],
      licenses: [],
      certifications: []
    },
    security: {
      accessLevel: 'READ',
      permissions: ['workorders.read', 'properties.read']
    },
    preferences: {
      notifications: {
        email: true,
        sms: true,
        app: true,
        workOrders: true,
        maintenance: false,
        reports: false
      },
      language: 'en',
      timezone: 'Asia/Riyadh',
      theme: 'LIGHT'
    },
    workload: {
      maxAssignments: 5,
      currentAssignments: 0,
      available: true,
      location: {
        city: 'Jeddah',
        region: 'Makkah',
        radius: 30
      },
      workingHours: {
        start: '08:00',
        end: '17:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'sunday'],
        timezone: 'Asia/Riyadh'
      }
    },
    performance: { reviews: [] },
    employment: {
      employeeId: process.env.TEST_NONADMIN_EMPLOYEE || process.env.TEST_MANAGER_EMPLOYEE || 'EMP-TEST-100',
      benefits: []
    },
    compliance: { training: [] },
    status: 'ACTIVE',
    tenantId: 'test-tenant'
  },

  // ============================================
  // DEMO USERS (for login page quick access)
  // ============================================
  {
    envVars: {
      email: 'DEMO_SUPERADMIN_EMAIL',
      password: 'DEMO_SUPERADMIN_PASSWORD',
      employee: 'DEMO_SUPERADMIN_EMPLOYEE'
    },
    code: 'DEMO-SUPERADMIN',
    username: DEMO_EMPLOYEE_ID,
    email: 'superadmin@fixzit.co',
    password: DEMO_SUPERADMIN_PASSWORD,
    phone: DEMO_PHONE,
    employeeId: DEMO_EMPLOYEE_ID,
    orgId: orgObjectId,
    createdBy: SEED_USER_ID,
    isSuperAdmin: true,
    personal: {
      firstName: 'Super',
      lastName: 'Admin',
      nationalId: '3000000001',
      dateOfBirth: new Date('1975-01-01'),
      gender: 'Male',
      nationality: 'SA',
      phone: DEMO_PHONE,
      address: {
        street: 'Demo St 1',
        city: 'Riyadh',
        region: 'Riyadh',
        postalCode: '11564',
        country: 'SA'
      }
    },
    professional: {
      role: 'SUPER_ADMIN',
      title: 'Super Administrator',
      department: 'IT',
      skills: [],
      licenses: [],
      certifications: []
    },
    security: {
      accessLevel: 'ADMIN',
      permissions: ['*']
    },
    preferences: {
      notifications: {
        email: true,
        sms: false,
        app: true,
        workOrders: true,
        maintenance: true,
        reports: true
      },
      language: 'en',
      timezone: 'Asia/Riyadh',
      theme: 'LIGHT'
    },
    workload: {
      maxAssignments: 100,
      currentAssignments: 0,
      available: true,
      location: { city: 'Riyadh', region: 'Riyadh', radius: 100 },
      workingHours: {
        start: '00:00',
        end: '23:59',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        timezone: 'Asia/Riyadh'
      }
    },
    performance: { reviews: [] },
    employment: {
      employeeId: 'EMP-DEMO-001',
      benefits: []
    },
    compliance: { training: [] },
    status: 'ACTIVE',
    tenantId: 'demo-tenant'
  },

  {
    envVars: null,
    code: 'DEMO-ADMIN',
    username: normalizeEmployeeId('EMP-DEMO-002'),
    email: 'admin@fixzit.co',
    password: DEMO_PASSWORD,
    phone: DEMO_PHONE,
    employeeId: normalizeEmployeeId('EMP-DEMO-002'),
    orgId: orgObjectId,
    createdBy: SEED_USER_ID,
    isSuperAdmin: false,
    personal: {
      firstName: 'Corporate',
      lastName: 'Admin',
      nationalId: '3000000002',
      dateOfBirth: new Date('1985-03-15'),
      gender: 'Female',
      nationality: 'SA',
      phone: DEMO_PHONE,
      address: {
        street: 'Demo St 2',
        city: 'Riyadh',
        region: 'Riyadh',
        postalCode: '11622',
        country: 'SA'
      }
    },
    professional: {
      role: 'ADMIN',
      title: 'Corporate Admin',
      department: 'Operations',
      skills: [],
      licenses: [],
      certifications: []
    },
    security: {
      accessLevel: 'WRITE',
      permissions: ['properties.*', 'tenants.*', 'workorders.*', 'finance.*']
    },
    preferences: {
      notifications: {
        email: true,
        sms: true,
        app: true,
        workOrders: true,
        maintenance: true,
        reports: true
      },
      language: 'en',
      timezone: 'Asia/Riyadh',
      theme: 'LIGHT'
    },
    workload: {
      maxAssignments: 50,
      currentAssignments: 0,
      available: true,
      location: { city: 'Riyadh', region: 'Riyadh', radius: 50 },
      workingHours: {
        start: '08:00',
        end: '17:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'sunday'],
        timezone: 'Asia/Riyadh'
      }
    },
    performance: { reviews: [] },
    employment: {
      employeeId: 'EMP-DEMO-002',
      benefits: []
    },
    compliance: { training: [] },
    status: 'ACTIVE',
    tenantId: 'demo-tenant'
  },

  {
    envVars: null,
    code: 'DEMO-MANAGER',
    username: normalizeEmployeeId('EMP-DEMO-003'),
    email: 'manager@fixzit.co',
    password: DEMO_PASSWORD,
    phone: DEMO_PHONE,
    employeeId: normalizeEmployeeId('EMP-DEMO-003'),
    orgId: orgObjectId,
    createdBy: SEED_USER_ID,
    isSuperAdmin: false,
    personal: {
      firstName: 'Property',
      lastName: 'Manager',
      nationalId: '3000000003',
      dateOfBirth: new Date('1988-04-12'),
      gender: 'Female',
      nationality: 'SA',
      phone: DEMO_PHONE,
      address: {
        street: 'Demo St 3',
        city: 'Riyadh',
        region: 'Riyadh',
        postalCode: '11564',
        country: 'SA'
      }
    },
    professional: {
      role: 'PROPERTY_MANAGER',
      title: 'Property Manager',
      department: 'Property Management',
      skills: [],
      licenses: [],
      certifications: []
    },
    security: {
      accessLevel: 'WRITE',
      permissions: ['properties.*', 'tenants.*', 'workorders.*', 'crm.*']
    },
    preferences: {
      notifications: {
        email: true,
        sms: true,
        app: true,
        workOrders: true,
        maintenance: true,
        reports: false
      },
      language: 'en',
      timezone: 'Asia/Riyadh',
      theme: 'LIGHT'
    },
    workload: {
      maxAssignments: 30,
      currentAssignments: 0,
      available: true,
      location: { city: 'Riyadh', region: 'Riyadh', radius: 40 },
      workingHours: {
        start: '08:00',
        end: '17:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'sunday'],
        timezone: 'Asia/Riyadh'
      }
    },
    performance: { reviews: [] },
    employment: {
      employeeId: 'EMP-DEMO-003',
      benefits: []
    },
    compliance: { training: [] },
    status: 'ACTIVE',
    tenantId: 'demo-tenant'
  },

  {
    envVars: null,
    code: 'DEMO-EMP001',
    username: normalizeEmployeeId('EMP001'),
    email: 'emp001@fixzit.co',
    password: DEMO_PASSWORD,
    phone: DEMO_PHONE,
    employeeId: normalizeEmployeeId('EMP001'),
    orgId: orgObjectId,
    createdBy: SEED_USER_ID,
    isSuperAdmin: false,
    personal: {
      firstName: 'Employee',
      lastName: 'One',
      nationalId: '3000000004',
      dateOfBirth: new Date('1992-08-20'),
      gender: 'Male',
      nationality: 'SA',
      phone: DEMO_PHONE,
      address: {
        street: 'Demo St 4',
        city: 'Jeddah',
        region: 'Makkah',
        postalCode: '21564',
        country: 'SA'
      }
    },
    professional: {
      role: 'EMPLOYEE',
      title: 'Corporate Employee',
      department: 'Operations',
      skills: [],
      licenses: [],
      certifications: []
    },
    security: {
      accessLevel: 'READ',
      permissions: ['workorders.read', 'properties.read']
    },
    preferences: {
      notifications: {
        email: true,
        sms: false,
        app: true,
        workOrders: true,
        maintenance: false,
        reports: false
      },
      language: 'en',
      timezone: 'Asia/Riyadh',
      theme: 'LIGHT'
    },
    workload: {
      maxAssignments: 10,
      currentAssignments: 0,
      available: true,
      location: { city: 'Jeddah', region: 'Makkah', radius: 25 },
      workingHours: {
        start: '08:00',
        end: '17:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'sunday'],
        timezone: 'Asia/Riyadh'
      }
    },
    performance: { reviews: [] },
    employment: {
      employeeId: 'EMP001',
      benefits: []
    },
    compliance: { training: [] },
    status: 'ACTIVE',
    tenantId: 'demo-tenant'
  }
];

async function seedE2ETestUsers() {
  try {
    const { db } = await import('../lib/mongo');
    const { User } = await import('../server/models/User');
    const { hashPassword } = await import('../lib/auth');

    await db;
    
    console.log('🧪 ==========================================');
    console.log('🧪 E2E Test User Seeding');
    console.log('🧪 ==========================================\n');
    
    let created = 0;
    let updated = 0;
    let skipped = 0;
    
  for (const userData of e2eTestUsers) {
    const existingUser = await User.findOne({ email: userData.email });
    const hashedPassword = await hashPassword(userData.password);
    const normalizedEmployeeId = normalizeEmployeeId(userData.employeeId);
    const normalizedUsername = normalizeEmployeeId(userData.username);

    const userDoc = {
      ...userData,
      password: hashedPassword,
      role: userData.professional.role,
      mobile: userData.phone,
      username: normalizedUsername,
      employeeId: normalizedEmployeeId,
      orgId: orgObjectId,
      status: 'ACTIVE',
      emailVerifiedAt: userData.emailVerified || new Date(),
      updatedAt: new Date(),
    };

    try {
      await User.findOneAndUpdate(
        { email: userData.email },
        {
          $set: {
            ...userDoc,
            createdBy: userData.createdBy ?? SEED_USER_ID,
            isSuperAdmin: userData.isSuperAdmin || false,
          },
          $setOnInsert: {
            createdAt: new Date(),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      if (existingUser) {
        console.log(`✅ Updated: ${userData.email.padEnd(35)} (${userData.professional.role})`);
        updated++;
      } else {
        console.log(`✅ Created: ${userData.email.padEnd(35)} (${userData.professional.role})`);
        created++;
      }
    } catch (error: unknown) {
      const duplicateKey =
        typeof error === 'object' && error !== null
          ? (error as { code?: number; keyValue?: unknown })
          : undefined;
      if (duplicateKey?.code === 11000) {
        console.log(`⏭️  Duplicate: ${userData.email} - ${JSON.stringify(duplicateKey.keyValue)}`);
        skipped++;
      } else {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error: ${userData.email} - ${message}`);
      }
    }
  }
    
    console.log('\n📊 ==========================================');
    console.log('📊 Summary');
    console.log('📊 ==========================================');
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total:   ${created + updated + skipped}/${e2eTestUsers.length}`);
    
    console.log('\n📝 ==========================================');
    console.log('📝 Environment Variables Configuration');
    console.log('📝 ==========================================');
    console.log('\nAdd these to your .env.local or .env.test file:\n');
    
    console.log('# ===== PRIMARY TEST USER (Admin) =====');
    const primaryUser = e2eTestUsers[0];
    console.log(`TEST_USER_EMAIL=${primaryUser.email}`);
    console.log(`TEST_USER_PASSWORD=${PRIMARY_PASSWORD}`);
    console.log(`TEST_USER_EMPLOYEE=${primaryUser.employeeId}`);
    
    console.log('\n# ===== NON-ADMIN TEST USER (RBAC) =====');
    const nonAdminUser = e2eTestUsers[1];
    console.log(`TEST_NONADMIN_IDENTIFIER=${nonAdminUser.email}`);
    console.log(`TEST_NONADMIN_PASSWORD=${NONADMIN_PASSWORD}`);
    console.log(`TEST_NONADMIN_EMPLOYEE=${nonAdminUser.employeeId}`);
    
    console.log('\n# ===== DEMO USERS (Login Page) =====');
    console.log(`DEMO_SUPERADMIN_PASSWORD=${DEMO_SUPERADMIN_PASSWORD}`);
    console.log(`DEMO_PASSWORD=${DEMO_PASSWORD}`);
    
    console.log('\n# ===== OPTIONAL: Override Test Org ID =====');
    console.log(`TEST_ORG_ID=${TEST_ORG_ID}`);
    
    console.log('\n🎯 ==========================================');
    console.log('🎯 Login Credentials');
    console.log('🎯 ==========================================\n');
    
    console.log('PRIMARY TEST USER (for E2E tests):');
    console.log(`   Email:    ${primaryUser.email}`);
    console.log(`   Employee: ${primaryUser.employeeId}`);
    console.log(`   Password: ${PRIMARY_PASSWORD}`);
    console.log(`   Role:     ${primaryUser.professional.role}\n`);
    
    console.log('NON-ADMIN TEST USER (for RBAC tests):');
    console.log(`   Email:    ${nonAdminUser.email}`);
    console.log(`   Employee: ${nonAdminUser.employeeId}`);
    console.log(`   Password: ${NONADMIN_PASSWORD}`);
    console.log(`   Role:     ${nonAdminUser.professional.role}\n`);
    
    console.log('DEMO USERS (login page quick access):');
    e2eTestUsers.slice(2).forEach(u => {
      console.log(`   ${u.email.padEnd(30)} ${u.professional.role.padEnd(20)} ${u.code.includes('SUPERADMIN') ? DEMO_SUPERADMIN_PASSWORD : DEMO_PASSWORD}`);
    });
    
    console.log('\n✅ ==========================================');
    console.log('✅ Seeding Complete!');
    console.log('✅ ==========================================');
    console.log('\n🚀 Next Steps:');
    console.log('   1. Copy the environment variables above to .env.local');
    console.log('   2. Run: npx playwright test tests/e2e/auth.spec.ts --project=chromium');
    console.log('   3. Run: npx playwright test tests/specs/smoke.spec.ts --project=chromium\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ==========================================');
    console.error('❌ Error Seeding E2E Test Users');
    console.error('❌ ==========================================\n');
    console.error(error);
    console.error('\n');
    process.exit(1);
  }
}

seedE2ETestUsers();
