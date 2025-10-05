import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../server/models/User';
import { Organization } from '../server/models/Organization';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error('MONGODB_URI missing');

const PASSWORD = process.env.SEED_PASSWORD;
if (!PASSWORD) {
  console.error('❌ SEED_PASSWORD environment variable is required');
  process.exit(1);
}

async function seed() {
  await mongoose.connect(MONGODB_URI, { dbName: 'fixzit' });
  console.log('✅ Connected to MongoDB');

  // Create organizations
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

  const vendorOrg = await Organization.findOneAndUpdate(
    { code: 'vendor-org-001' },
    { code: 'vendor-org-001', nameEn: 'Vendor Corp', nameAr: 'شركة الموردين', isActive: true },
    { upsert: true, new: true }
  );

  console.log('✅ Organizations created');

  const hashedPassword = await bcrypt.hash(PASSWORD, 12);

  // Test alias user ONLY
  const testUser = {
    orgId: fixzitOrg._id,
    email: 'admin@fixzit.co',
    code: 'USR-SA001-TEST',
    username: 'admin',
    employeeId: 'SA001-TEST',
    personal: { firstName: 'Admin', lastName: 'Test' },
    professional: { role: 'super_admin', title: 'Super Administrator', department: 'Platform' },
    permissions: ['*']
  };

  console.log('\n📝 Seeding 1 test user...\n');

  await User.findOneAndUpdate(
    { orgId: testUser.orgId, email: testUser.email },
    { ...testUser, password: hashedPassword, status: 'ACTIVE', isActive: true, emailVerifiedAt: new Date() },
    { upsert: true, new: true }
  );
  
  console.log(`✅ Created: ${testUser.email} (${testUser.professional.role})`);
  console.log('\n✅ Seed complete!\n');
  
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
