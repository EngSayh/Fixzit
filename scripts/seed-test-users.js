#!/usr/bin/env node
/**
 * Seed Test Users for E2E Tests (Node/JS entrypoint)
 *
 * Aligns seeded users with the current User model expectations:
 * - orgId + tenant-scoped unique fields (email, username/employee, code)
 * - ACTIVE status and professional.role set for RBAC menus
 * - username is the employee number (needed for corporate login)
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const envTestPath = path.resolve(__dirname, '../.env.test');
const envPath = fs.existsSync(envTestPath)
  ? envTestPath
  : fs.existsSync(path.resolve(__dirname, '../.env'))
  ? path.resolve(__dirname, '../.env')
  : null;

if (envPath) {
  require('dotenv').config({ path: envPath });
  console.log(`✅ Loaded env from ${envPath}`);
} else {
  console.warn('⚠️  .env.test/.env not found, relying on process environment');
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit_test';
const MONGODB_DB = process.env.MONGODB_DB || 'fixzit_test';
const TEST_ORG_ID = process.env.TEST_ORG_ID || '68dc8955a1ba6ed80ff372dc';

const orgObjectId = mongoose.Types.ObjectId.isValid(TEST_ORG_ID)
  ? new mongoose.Types.ObjectId(TEST_ORG_ID)
  : new mongoose.Types.ObjectId();

const normalizeEmployeeId = (value, fallback) => (value || fallback).trim().toUpperCase();
const primaryEmployeeId = normalizeEmployeeId(
  process.env.TEST_USER_EMPLOYEE || process.env.TEST_SUPERADMIN_EMPLOYEE || 'EMP-TEST-001',
  'EMP-TEST-001'
);
const nonAdminEmployeeId = normalizeEmployeeId(
  process.env.TEST_NONADMIN_EMPLOYEE || process.env.TEST_MANAGER_EMPLOYEE || 'EMP-TEST-100',
  'EMP-TEST-100'
);
const adminEmployeeId = normalizeEmployeeId('EMP-ADMIN-001', 'EMP-ADMIN-001');

// Test user configurations from env or defaults
const TEST_USERS = [
  {
    code: 'TEST-PRIMARY-ADMIN',
    email: process.env.TEST_USER_EMAIL || process.env.TEST_SUPERADMIN_IDENTIFIER || 'test-admin@fixzit.co',
    password: process.env.TEST_USER_PASSWORD || process.env.TEST_SUPERADMIN_PASSWORD || 'Test@1234',
    employeeId: primaryEmployeeId,
    phone: process.env.TEST_SUPERADMIN_PHONE || '+966500000001',
    role: 'SUPER_ADMIN',
    isSuperAdmin: true,
    personal: { firstName: 'Test', lastName: 'Admin' },
    title: 'E2E Primary Super Admin',
  },
  {
    code: 'TEST-RBAC-NONADMIN',
    email: process.env.TEST_NONADMIN_IDENTIFIER || process.env.TEST_MANAGER_IDENTIFIER || 'test-nonadmin@fixzit.co',
    password: process.env.TEST_NONADMIN_PASSWORD || process.env.TEST_MANAGER_PASSWORD || 'Test@1234',
    employeeId: nonAdminEmployeeId,
    phone: process.env.TEST_NONADMIN_PHONE || process.env.TEST_MANAGER_PHONE || '+966500000002',
    role: 'PROPERTY_MANAGER',
    isSuperAdmin: false,
    personal: { firstName: 'Test', lastName: 'NonAdmin' },
    title: 'E2E Property Manager',
  },
  {
    code: 'TEST-ADMIN',
    email: process.env.TEST_ADMIN_IDENTIFIER || 'admin@fixzit.co',
    password: process.env.TEST_ADMIN_PASSWORD || 'Test@1234',
    employeeId: adminEmployeeId,
    phone: process.env.TEST_ADMIN_PHONE || '+966500000003',
    role: 'ADMIN',
    isSuperAdmin: false,
    personal: { firstName: 'Admin', lastName: 'User' },
    title: 'E2E Admin',
  },
];

const UserSchema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, required: true },
    code: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    phone: { type: String },
    mobile: { type: String },
    employeeId: { type: String },
    employment: {
      employeeId: { type: String },
    },
    personal: {
      firstName: String,
      lastName: String,
    },
    professional: {
      role: { type: String, required: true },
      title: String,
      department: String,
    },
    security: {
      accessLevel: String,
      permissions: [String],
      lastLogin: Date,
    },
    preferences: {
      notifications: {
        email: Boolean,
        sms: Boolean,
        app: Boolean,
        workOrders: Boolean,
        maintenance: Boolean,
        reports: Boolean,
      },
      language: { type: String, default: 'en' },
      timezone: { type: String, default: 'Asia/Riyadh' },
      theme: { type: String, default: 'LIGHT' },
    },
    status: { type: String, default: 'ACTIVE' },
    isSuperAdmin: { type: Boolean, default: false },
    emailVerified: { type: Date },
  },
  { collection: 'users', timestamps: true }
);

UserSchema.index({ orgId: 1, email: 1 }, { unique: true });
UserSchema.index({ orgId: 1, username: 1 }, { unique: true });
UserSchema.index({ orgId: 1, code: 1 }, { unique: true });
UserSchema.index({ orgId: 1, employeeId: 1 }, { unique: true, sparse: true });

async function seedTestUsers() {
  let connection;

  try {
    console.log(`\n🔌 Connecting to ${MONGODB_URI} (db: ${MONGODB_DB})...`);
    connection = await mongoose.connect(MONGODB_URI, {
      dbName: MONGODB_DB,
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB');

    const User = connection.model('User', UserSchema);
    const now = new Date();
    let created = 0;
    let updated = 0;
    let failed = 0;

    console.log('\n👥 Seeding test users...\n');

    for (const userData of TEST_USERS) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const payload = {
        orgId: orgObjectId,
        code: userData.code,
        username: userData.employeeId,
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        phone: userData.phone,
        mobile: userData.phone,
        employeeId: userData.employeeId,
        employment: { employeeId: userData.employeeId },
        personal: userData.personal,
        professional: { role: userData.role, title: userData.title },
        security: { accessLevel: userData.isSuperAdmin ? 'ADMIN' : 'WRITE' },
        preferences: {
          notifications: {
            email: true,
            sms: false,
            app: true,
            workOrders: true,
            maintenance: true,
            reports: true,
          },
          language: 'en',
          timezone: 'Asia/Riyadh',
          theme: 'LIGHT',
        },
        status: 'ACTIVE',
        isSuperAdmin: userData.isSuperAdmin,
        emailVerified: now,
        updatedAt: now,
      };

      try {
        const existing = await User.findOne({ orgId: orgObjectId, email: payload.email });

        if (existing) {
          await User.updateOne({ _id: existing._id }, { $set: payload });
          console.log(`✅ Updated: ${payload.email} (${userData.role})`);
          updated++;
        } else {
          await User.create({ ...payload, createdAt: now });
          console.log(`✅ Created: ${payload.email} (${userData.role})`);
          created++;
        }

        console.log(`   📧 Email: ${payload.email}`);
        console.log(`   🔑 Password: ${userData.password}`);
        console.log(`   👤 Employee/Username: ${payload.username}`);
        console.log(`   🏢 orgId: ${orgObjectId.toString()}\n`);
      } catch (err) {
        failed++;
        const message = err instanceof Error ? err.message : String(err);
        console.error(`❌ Error seeding ${userData.email}: ${message}`);
      }
    }

    const count = await User.countDocuments({
      orgId: orgObjectId,
      email: { $in: TEST_USERS.map((u) => u.email.toLowerCase()) },
    });
    console.log(`\n✅ Seeding complete! ${count}/${TEST_USERS.length} users available (created ${created}, updated ${updated}, failed ${failed}).`);
    console.log('\n📝 Test credentials (password defaults to Test@1234):');
    console.log(`   Primary Admin: ${TEST_USERS[0].email} / ${TEST_USERS[0].password}`);
    console.log(`   Non-Admin:     ${TEST_USERS[1].email} / ${TEST_USERS[1].password}`);
    console.log('\n🧪 Run tests: npx playwright test tests/e2e/auth.spec.ts --project=chromium\n');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB\n');
    }
  }
}

// Run if called directly
if (require.main === module) {
  seedTestUsers();
}

module.exports = { seedTestUsers };
