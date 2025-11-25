#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Types } from 'mongoose';
import { db } from '../lib/mongo';
import { User } from '../server/models/User';
import { hashPassword } from '../lib/auth';

type SeedUser = {
  code: string;
  email: string;
  password: string;
  employeeId: string;
  professional: { role: string; [key: string]: unknown };
  username?: string;
  phone?: string;
  mobile?: string;
  orgId?: string;
  createdBy?: Types.ObjectId;
  isSuperAdmin?: boolean;
  [key: string]: unknown;
};

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
const DEFAULT_PHONE = process.env.TEST_USER_PHONE || '+966552233456';

const normalizeEmployeeId = (value: string) => value.trim().toUpperCase();

const PRIMARY_EMAIL = process.env.TEST_USER_EMAIL || process.env.TEST_SUPERADMIN_IDENTIFIER || 'test-admin@fixzit.co';
const PRIMARY_PASSWORD = process.env.TEST_USER_PASSWORD || process.env.TEST_SUPERADMIN_PASSWORD || 'Test@1234';
const PRIMARY_EMPLOYEE_ID = normalizeEmployeeId(process.env.TEST_USER_EMPLOYEE || process.env.TEST_SUPERADMIN_EMPLOYEE || 'EMP-TEST-001');
const PRIMARY_PHONE = process.env.TEST_SUPERADMIN_PHONE || DEFAULT_PHONE;

const NONADMIN_EMAIL = process.env.TEST_NONADMIN_IDENTIFIER || process.env.TEST_MANAGER_IDENTIFIER || 'test-nonadmin@fixzit.co';
const NONADMIN_PASSWORD = process.env.TEST_NONADMIN_PASSWORD || process.env.TEST_MANAGER_PASSWORD || 'Test@1234';
const NONADMIN_EMPLOYEE_ID = normalizeEmployeeId(process.env.TEST_NONADMIN_EMPLOYEE || process.env.TEST_MANAGER_EMPLOYEE || 'EMP-TEST-100');
const NONADMIN_PHONE = process.env.TEST_NONADMIN_PHONE || DEFAULT_PHONE;

const ADMIN_EMAIL = process.env.TEST_ADMIN_IDENTIFIER || 'admin@fixzit.co';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Test@1234';
const ADMIN_EMPLOYEE_ID = normalizeEmployeeId(process.env.TEST_ADMIN_EMPLOYEE || 'EMP-ADMIN-001');
const ADMIN_PHONE = process.env.TEST_ADMIN_PHONE || DEFAULT_PHONE;

const TECH_EMAIL = process.env.TEST_TECHNICIAN_IDENTIFIER || 'technician@test.fixzit.co';
const TECH_PASSWORD = process.env.TEST_TECHNICIAN_PASSWORD || PRIMARY_PASSWORD;
const TECH_EMPLOYEE_ID = normalizeEmployeeId(process.env.TEST_TECHNICIAN_EMPLOYEE || 'EMP-TEST-004');
const TECH_PHONE = process.env.TEST_TECHNICIAN_PHONE || DEFAULT_PHONE;

const TENANT_EMAIL = process.env.TEST_TENANT_IDENTIFIER || 'tenant@test.fixzit.co';
const TENANT_PASSWORD = process.env.TEST_TENANT_PASSWORD || PRIMARY_PASSWORD;
const TENANT_EMPLOYEE_ID = normalizeEmployeeId(process.env.TEST_TENANT_EMPLOYEE || 'EMP-TEST-005');
const TENANT_PHONE = process.env.TEST_TENANT_PHONE || DEFAULT_PHONE;

const VENDOR_EMAIL = process.env.TEST_VENDOR_IDENTIFIER || 'vendor@test.fixzit.co';
const VENDOR_PASSWORD = process.env.TEST_VENDOR_PASSWORD || PRIMARY_PASSWORD;
const VENDOR_EMPLOYEE_ID = normalizeEmployeeId(process.env.TEST_VENDOR_EMPLOYEE || 'EMP-TEST-006');
const VENDOR_PHONE = process.env.TEST_VENDOR_PHONE || DEFAULT_PHONE;

const OWNER_EMAIL = 'owner@fixzit.co';
const OWNER_PASSWORD = PRIMARY_PASSWORD;
const OWNER_EMPLOYEE_ID = normalizeEmployeeId('EMP-TEST-007');

const GUEST_EMAIL = 'guest@fixzit.co';
const GUEST_PASSWORD = PRIMARY_PASSWORD;
const GUEST_EMPLOYEE_ID = normalizeEmployeeId('EMP-TEST-008');

const testUsers: SeedUser[] = [
  {
    code: 'TEST-PRIMARY-ADMIN',
    email: PRIMARY_EMAIL,
    password: PRIMARY_PASSWORD,
    employeeId: PRIMARY_EMPLOYEE_ID,
    phone: PRIMARY_PHONE,
    isSuperAdmin: true,
    personal: {
      firstName: 'Test',
      lastName: 'Admin',
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
        country: 'SA',
      },
    },
    professional: {
      role: 'SUPER_ADMIN',
      title: 'E2E Test Super Administrator',
      department: 'Testing',
      skills: [],
      licenses: [],
      certifications: [],
    },
    security: { accessLevel: 'ADMIN', permissions: ['*'] },
    preferences: {
      notifications: { email: true, sms: false, app: true, workOrders: true, maintenance: true, reports: true },
      language: 'en',
      timezone: 'Asia/Riyadh',
      theme: 'LIGHT',
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
        timezone: 'Asia/Riyadh',
      },
    },
    employment: { employeeId: PRIMARY_EMPLOYEE_ID, benefits: [] },
    compliance: { training: [] },
    status: 'ACTIVE',
    tenantId: 'test-tenant',
  },
  {
    code: 'TEST-RBAC-NONADMIN',
    email: NONADMIN_EMAIL,
    password: NONADMIN_PASSWORD,
    employeeId: NONADMIN_EMPLOYEE_ID,
    phone: NONADMIN_PHONE,
    isSuperAdmin: false,
    personal: {
      firstName: 'Test',
      lastName: 'NonAdmin',
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
        country: 'SA',
      },
    },
    professional: {
      role: 'PROPERTY_MANAGER',
      title: 'E2E Test Regular User',
      department: 'Operations',
      skills: [],
      licenses: [],
      certifications: [],
    },
    security: { accessLevel: 'READ', permissions: ['workorders.read', 'properties.read'] },
    preferences: {
      notifications: { email: true, sms: true, app: true, workOrders: true, maintenance: false, reports: false },
      language: 'en',
      timezone: 'Asia/Riyadh',
      theme: 'LIGHT',
    },
    workload: {
      maxAssignments: 5,
      currentAssignments: 0,
      available: true,
      location: { city: 'Jeddah', region: 'Makkah', radius: 30 },
      workingHours: {
        start: '08:00',
        end: '17:00',
        days: ['monday', 'tuesday', 'wednesday', 'thursday', 'sunday'],
        timezone: 'Asia/Riyadh',
      },
    },
    employment: { employeeId: NONADMIN_EMPLOYEE_ID, benefits: [] },
    compliance: { training: [] },
    status: 'ACTIVE',
    tenantId: 'test-tenant',
  },
  {
    code: 'TEST-ADMIN',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    employeeId: ADMIN_EMPLOYEE_ID,
    phone: ADMIN_PHONE,
    isSuperAdmin: false,
    personal: {
      firstName: 'Test',
      lastName: 'Admin',
      nationalId: '1000000002',
      dateOfBirth: new Date('1985-03-15'),
      gender: 'Female',
      nationality: 'SA',
      address: { street: 'Test St 2', city: 'Riyadh', region: 'Riyadh', postalCode: '11622', country: 'SA' },
    },
    professional: { role: 'ADMIN', title: 'Corporate Admin', department: 'Operations', skills: [], licenses: [], certifications: [] },
    security: { accessLevel: 'WRITE', permissions: ['properties.*', 'tenants.*', 'workorders.*', 'finance.*', 'hr.*', 'crm.*'] },
    preferences: { notifications: { email: true, sms: true, app: true, workOrders: true, maintenance: true, reports: true }, language: 'en', timezone: 'Asia/Riyadh', theme: 'LIGHT' },
    workload: { maxAssignments: 50, currentAssignments: 0, available: true, location: { city: 'Riyadh', region: 'Riyadh', radius: 50 }, workingHours: { start: '08:00', end: '17:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'sunday'], timezone: 'Asia/Riyadh' } },
    performance: { reviews: [] },
    employment: { employeeId: ADMIN_EMPLOYEE_ID, benefits: [] },
    compliance: { training: [] },
    status: 'ACTIVE',
    tenantId: 'test-tenant',
  },
  {
    code: 'TEST-TECHNICIAN',
    email: TECH_EMAIL,
    password: TECH_PASSWORD,
    employeeId: TECH_EMPLOYEE_ID,
    phone: TECH_PHONE,
    professional: { role: 'TECHNICIAN', title: 'Senior Technician', department: 'Maintenance', skills: [{ category: 'ELECTRICAL', skill: 'Wiring Installation', level: 'EXPERT', certified: true, certification: 'Master Electrician', expiry: new Date('2026-12-31'), experience: 5 }], licenses: [], certifications: [] },
    personal: { firstName: 'Test', lastName: 'Technician', nationalId: '1000000005', dateOfBirth: new Date('1990-11-25'), gender: 'Male', nationality: 'SA', address: { street: 'Test St 5', city: 'Dammam', region: 'Eastern Province', postalCode: '32244', country: 'SA' } },
    security: { accessLevel: 'WRITE', permissions: ['workorders.update', 'assets.read'] },
    preferences: { notifications: { email: true, sms: true, app: true, workOrders: true, maintenance: true, reports: false }, language: 'ar', timezone: 'Asia/Riyadh', theme: 'LIGHT' },
    workload: { maxAssignments: 10, currentAssignments: 0, available: true, location: { city: 'Dammam', region: 'Eastern Province', radius: 25 }, workingHours: { start: '07:00', end: '16:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'sunday'], timezone: 'Asia/Riyadh' } },
    performance: { rating: 4.7, completedJobs: 45, ongoingJobs: 2, successRate: 98, averageResponseTime: 1.5, averageResolutionTime: 18, customerSatisfaction: 96, reviews: [] },
    employment: { employeeId: TECH_EMPLOYEE_ID, benefits: [] },
    compliance: { training: [] },
    status: 'ACTIVE',
    tenantId: 'test-tenant',
  },
  {
    code: 'TEST-TENANT',
    email: TENANT_EMAIL,
    password: TENANT_PASSWORD,
    employeeId: TENANT_EMPLOYEE_ID,
    phone: TENANT_PHONE,
    professional: { role: 'TENANT', title: 'Tenant', department: 'N/A', skills: [], licenses: [], certifications: [] },
    personal: { firstName: 'Test', lastName: 'Tenant', nationalId: '1000000007', dateOfBirth: new Date('1995-09-30'), gender: 'Male', nationality: 'SA', address: { street: 'Test St 7', city: 'Riyadh', region: 'Riyadh', postalCode: '11693', country: 'SA' } },
    security: { accessLevel: 'READ', permissions: ['workorders.create', 'workorders.read', 'support.read'] },
    preferences: { notifications: { email: true, sms: true, app: true, workOrders: true, maintenance: true, reports: false }, language: 'ar', timezone: 'Asia/Riyadh', theme: 'LIGHT' },
    workload: { maxAssignments: 0, currentAssignments: 0, available: false, location: { city: 'Riyadh', region: 'Riyadh', radius: 0 }, workingHours: { start: '00:00', end: '23:59', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], timezone: 'Asia/Riyadh' } },
    performance: { reviews: [] },
    employment: { employeeId: TENANT_EMPLOYEE_ID, benefits: [] },
    compliance: { training: [] },
    status: 'ACTIVE',
    tenantId: 'test-tenant',
  },
  {
    code: 'TEST-VENDOR',
    email: VENDOR_EMAIL,
    password: VENDOR_PASSWORD,
    employeeId: VENDOR_EMPLOYEE_ID,
    phone: VENDOR_PHONE,
    professional: { role: 'VENDOR', title: 'Service Provider', department: 'External', skills: [{ category: 'HVAC', skill: 'AC Installation', level: 'EXPERT', certified: true, certification: 'HVAC Master', expiry: new Date('2026-03-31'), experience: 8 }], licenses: [], certifications: [] },
    personal: { firstName: 'Test', lastName: 'Vendor', nationalId: '1000000008', dateOfBirth: new Date('1982-12-05'), gender: 'Male', nationality: 'SA', address: { street: 'Test St 8', city: 'Jeddah', region: 'Makkah', postalCode: '21589', country: 'SA' } },
    security: { accessLevel: 'READ', permissions: ['marketplace.read', 'workorders.read'] },
    preferences: { notifications: { email: true, sms: true, app: true, workOrders: true, maintenance: false, reports: false }, language: 'ar', timezone: 'Asia/Riyadh', theme: 'LIGHT' },
    workload: { maxAssignments: 15, currentAssignments: 0, available: true, location: { city: 'Jeddah', region: 'Makkah', radius: 50 }, workingHours: { start: '08:00', end: '18:00', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'], timezone: 'Asia/Riyadh' } },
    performance: { rating: 4.5, completedJobs: 78, ongoingJobs: 5, successRate: 95, averageResponseTime: 3, averageResolutionTime: 36, customerSatisfaction: 92, reviews: [] },
    employment: { employeeId: VENDOR_EMPLOYEE_ID, benefits: [] },
    compliance: { training: [] },
    status: 'ACTIVE',
    tenantId: 'test-tenant',
  },
  {
    code: 'TEST-OWNER',
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    employeeId: OWNER_EMPLOYEE_ID,
    phone: DEFAULT_PHONE,
    professional: { role: 'OWNER', title: 'Corporate Owner', department: 'Executive', skills: [], licenses: [], certifications: [] },
    personal: { firstName: 'Test', lastName: 'Owner', nationalId: '1000000009', dateOfBirth: new Date('1975-06-20'), gender: 'Male', nationality: 'SA', address: { street: 'Test St 9', city: 'Riyadh', region: 'Riyadh', postalCode: '11564', country: 'SA' } },
    security: { accessLevel: 'ADMIN', permissions: ['*'] },
    preferences: { notifications: { email: true, sms: false, app: true, workOrders: true, maintenance: true, reports: true }, language: 'en', timezone: 'Asia/Riyadh', theme: 'LIGHT' },
    workload: { maxAssignments: 0, currentAssignments: 0, available: false, location: { city: 'Riyadh', region: 'Riyadh', radius: 0 }, workingHours: { start: '00:00', end: '23:59', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], timezone: 'Asia/Riyadh' } },
    performance: { reviews: [] },
    employment: { employeeId: OWNER_EMPLOYEE_ID, benefits: [] },
    compliance: { training: [] },
    status: 'ACTIVE',
    tenantId: 'test-tenant',
  },
  {
    code: 'TEST-GUEST',
    email: GUEST_EMAIL,
    password: GUEST_PASSWORD,
    employeeId: GUEST_EMPLOYEE_ID,
    phone: DEFAULT_PHONE,
    professional: { role: 'VIEWER', title: 'Guest User', department: 'N/A', skills: [], licenses: [], certifications: [] },
    personal: { firstName: 'Test', lastName: 'Guest', nationalId: '1000000010', dateOfBirth: new Date('1992-08-15'), gender: 'Female', nationality: 'SA', address: { street: 'Test St 10', city: 'Riyadh', region: 'Riyadh', postalCode: '11564', country: 'SA' } },
    security: { accessLevel: 'READ', permissions: ['support.read'] },
    preferences: { notifications: { email: false, sms: false, app: false, workOrders: false, maintenance: false, reports: false }, language: 'en', timezone: 'Asia/Riyadh', theme: 'LIGHT' },
    workload: { maxAssignments: 0, currentAssignments: 0, available: false, location: { city: 'Riyadh', region: 'Riyadh', radius: 0 }, workingHours: { start: '00:00', end: '23:59', days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], timezone: 'Asia/Riyadh' } },
    performance: { reviews: [] },
    employment: { employeeId: GUEST_EMPLOYEE_ID, benefits: [] },
    compliance: { training: [] },
    status: 'ACTIVE',
    tenantId: 'test-tenant',
  },
];

function normalizeUser(user: SeedUser) {
  const employeeId = normalizeEmployeeId(user.employeeId);
  return {
    ...user,
    orgId: user.orgId || TEST_ORG_ID,
    username: normalizeEmployeeId(user.username || user.employeeId),
    employeeId,
    phone: user.phone || DEFAULT_PHONE,
    mobile: user.mobile || user.phone || DEFAULT_PHONE,
    role: user.professional?.role ?? 'USER',
    emailVerified: user.emailVerified || new Date(),
    employment: {
      ...(user.employment || {}),
      employeeId,
    },
  };
}

export async function seedTestUsers() {
  await db;
  console.log('🧪 Seeding test users...\n');

  const orgCandidates: unknown[] = [TEST_ORG_ID];
  if (Types.ObjectId.isValid(TEST_ORG_ID)) {
    orgCandidates.push(new Types.ObjectId(TEST_ORG_ID));
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const rawUser of testUsers) {
    const userData = normalizeUser(rawUser);
    const normalizedEmployeeId = userData.employeeId;
    const normalizedUsername = userData.username;

    const existing = await User.findOne({
      $or: [
        { email: userData.email },
        { employeeId: normalizedEmployeeId },
        { username: normalizedUsername },
        { code: userData.code },
      ],
    });

    const hashedPassword = await hashPassword(userData.password);
    const orgIdToUse = existing?.orgId || userData.orgId;

    const userDoc = {
      ...userData,
      orgId: orgIdToUse,
      password: hashedPassword,
      username: normalizedUsername,
      employeeId: normalizedEmployeeId,
      status: 'ACTIVE',
      isSuperAdmin: Boolean(userData.isSuperAdmin),
      updatedAt: new Date(),
    };

    const upsertFilter = existing
      ? { _id: existing._id }
      : {
          $or: [
            { code: userData.code },
            { email: userData.email },
            { employeeId: normalizedEmployeeId },
            { username: normalizedUsername },
          ],
        };

    try {
      await User.updateOne(
        upsertFilter,
        {
          $set: {
            ...userDoc,
          },
          $setOnInsert: {
            createdAt: new Date(),
            createdBy: userData.createdBy || SEED_USER_ID,
          },
        },
        { upsert: true }
      );

      if (existing) {
        console.log(`✅ Updated: ${userData.email.padEnd(32)} (${userData.professional.role})`);
        updated++;
      } else {
        console.log(`✅ Created: ${userData.email.padEnd(32)} (${userData.professional.role})`);
        created++;
      }
    } catch (error: unknown) {
      const duplicateKey =
        typeof error === 'object' && error !== null
          ? (error as { code?: number; keyValue?: unknown })
          : undefined;
      if (duplicateKey?.code === 11000) {
        try {
          const dedupeFilter = {
            orgId: { $in: orgCandidates },
            $or: [
              { email: userData.email },
              { employeeId: normalizedEmployeeId },
              { username: normalizedUsername },
              { code: userData.code },
            ],
          };
          const removed = await User.deleteMany(dedupeFilter);
          await User.create({
            ...userDoc,
            createdAt: new Date(),
            createdBy: userData.createdBy || SEED_USER_ID,
          });
          console.log(`♻️  Reset user ${userData.email.padEnd(32)} (${userData.professional.role}) (removed ${removed.deletedCount} duplicates)`);
          updated++;
        } catch (repairErr) {
          const message = repairErr instanceof Error ? repairErr.message : String(repairErr);
          console.log(`⏭️  Duplicate unresolved for ${userData.email}: ${JSON.stringify(duplicateKey.keyValue)} (${message})`);
          skipped++;
        }
      } else {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error: ${userData.email} - ${message}`);
      }
    }
  }

  console.log(`\n📊 Summary: Created ${created}, Updated ${updated}, Skipped ${skipped}, Total ${created + updated + skipped}/${testUsers.length}`);
  console.log('\n📝 Test Credentials (password: Test@1234 unless overridden):');
  console.log(`   Admin (TEST_USER_EMAIL):    ${PRIMARY_EMAIL}`);
  console.log(`   Non-Admin (TEST_NONADMIN):  ${NONADMIN_EMAIL}`);
  console.log('\n🎯 Run: npx tsx scripts/seed-test-users.ts');
  console.log('🎯 Then: npx playwright test tests/e2e/auth.spec.ts --project=chromium --workers=1');
}

if (process.argv[1]?.includes('seed-test-users')) {
  seedTestUsers()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Error:', err);
      process.exit(1);
    });
}
