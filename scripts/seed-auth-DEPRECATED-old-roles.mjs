import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error('MONGODB_URI missing');

// Organization Schema
const orgSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  nameEn: { type: String, required: true, trim: true },
  nameAr: { type: String, trim: true },
  isActive: { type: Boolean, default: true, index: true },
  settings: {
    requireEmailVerification: { type: Boolean, default: false },
    require2FA: { type: Boolean, default: false },
    enforce2FAForAdmins: { type: Boolean, default: false },
    allowGuestAccess: { type: Boolean, default: true },
  },
}, { timestamps: true });

const Organization = mongoose.models.Organization || mongoose.model('Organization', orgSchema);

// User Schema
const userSchema = new mongoose.Schema({
  orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
  email: { type: String, required: true, lowercase: true },
  employeeId: { type: String, sparse: true },
  passwordHash: { type: String, required: true, select: false },
  name: { type: String, required: true },
  role: { type: String, required: true, enum: [
    'super_admin', 'corporate_admin', 'management', 'finance', 'hr',
    'employee', 'property_owner', 'technician', 'tenant', 'vendor', 'guest'
  ]},
  permissions: [String],
  isActive: { type: Boolean, default: true },
  emailVerifiedAt: Date,
  lastLoginAt: Date,
  loginAttempts: { type: Number, default: 0 },
  lockedUntil: Date,
  mfa: {
    enabled: { type: Boolean, default: false },
    secret: String,
    type: String,
  },
}, { timestamps: true });

userSchema.index({ orgId: 1, email: 1 }, { unique: true });
userSchema.index({ orgId: 1, employeeId: 1 }, { unique: true, sparse: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Seed data
const PASSWORD = 'Fixzit@123';

async function seed() {
  await mongoose.connect(MONGODB_URI, { dbName: 'fixzit' });
  console.log('✅ Connected to MongoDB');

  // Create orgs
  const fixzitOrg = await Organization.findOneAndUpdate(
    { code: 'platform-org-001' },
    { code: 'platform-org-001', nameEn: 'Fixzit Platform', nameAr: 'منصة فكسزت', isActive: true },
    { upsert: true, new: true }
  );

  const acmeOrg = await Organization.findOneAndUpdate(
    { code: 'acme-corp-001' },
    { code: 'acme-corp-001', nameEn: 'ACME Corporation', nameAr: 'شركة أكمي', isActive: true },
    { upsert: true, new: true }
  );

  console.log('✅ Organizations created');

  // Create users
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  
  const users = [
    { orgId: fixzitOrg._id, email: 'superadmin@fixzit.local', employeeId: 'SA001', name: 'Super Admin', role: 'super_admin', permissions: ['*'] },
    { orgId: acmeOrg._id, email: 'corp.admin@acme.local', employeeId: 'CA001', name: 'Corporate Admin', role: 'corporate_admin', permissions: ['org:*'] },
    { orgId: acmeOrg._id, email: 'manager@acme.local', employeeId: 'MGR001', name: 'Manager', role: 'management', permissions: ['properties:*', 'workorders:*', 'users:read'] },
    { orgId: acmeOrg._id, email: 'finance@acme.local', employeeId: 'FIN001', name: 'Finance Officer', role: 'finance', permissions: ['finance:*', 'invoices:*', 'reports:read'] },
    { orgId: acmeOrg._id, email: 'hr@acme.local', employeeId: 'HR001', name: 'HR Officer', role: 'hr', permissions: ['users:*', 'employees:*', 'reports:read'] },
    { orgId: acmeOrg._id, email: 'employee@acme.local', employeeId: 'EMP001', name: 'Employee', role: 'employee', permissions: ['profile:read', 'profile:update', 'workorders:create'] },
    { orgId: acmeOrg._id, email: 'owner@acme.local', employeeId: 'OWN001', name: 'Property Owner', role: 'property_owner', permissions: ['properties:read', 'properties:update', 'tenants:read', 'finance:read'] },
    { orgId: acmeOrg._id, email: 'technician@acme.local', employeeId: 'TECH001', name: 'Technician', role: 'technician', permissions: ['workorders:read', 'workorders:update', 'properties:read'] },
    { orgId: acmeOrg._id, email: 'tenant@acme.local', employeeId: null, name: 'Tenant User', role: 'tenant', permissions: ['workorders:create', 'profile:read', 'payments:read'] },
    { orgId: acmeOrg._id, email: 'vendor@acme.local', employeeId: null, name: 'Vendor User', role: 'vendor', permissions: ['workorders:read', 'invoices:create', 'profile:read'] },
    { orgId: acmeOrg._id, email: 'guest@acme.local', employeeId: null, name: 'Guest User', role: 'guest', permissions: ['public:read'] },
  ];

  for (const userData of users) {
    await User.findOneAndUpdate(
      { orgId: userData.orgId, email: userData.email },
      { ...userData, passwordHash, isActive: true, emailVerifiedAt: new Date() },
      { upsert: true, new: true }
    );
    console.log(`✅ Created: ${userData.email} (${userData.role})`);
  }

  const isDev = process.env.NODE_ENV === 'development' && !process.env.CI;
  if (isDev) {
    console.warn('⚠️  [DEPRECATED] This script uses old roles. Use seed-auth-14users.mjs instead.');
    console.log(`✅ Seed complete! Password: ${PASSWORD} (DEV ONLY)`);
  } else {
    console.log('✅ Seed complete! (password redacted)');
  }
  await mongoose.disconnect();
}

seed().catch(console.error);


