import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../server/models/User';
import { Organization } from '../server/models/Organization';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error('MONGODB_URI missing');

const PASSWORD = process.env.SEED_PASSWORD || 'admin123';

async function seed() {
  await mongoose.connect(MONGODB_URI, { dbName: 'fixzit' });
  console.log('✅ Connected to MongoDB');

  // Organizations with orgId
  const fixzitOrg = await Organization.findOneAndUpdate(
    { code: 'platform-org-001' },
    { 
      code: 'platform-org-001', 
      orgId: 'platform-org-001',
      nameEn: 'Fixzit Platform', 
      nameAr: 'منصة فكسزت', 
      isActive: true 
    },
    { upsert: true, new: true }
  );

  const acmeOrg = await Organization.findOneAndUpdate(
    { code: 'acme-corp-001' },
    { 
      code: 'acme-corp-001', 
      orgId: 'acme-corp-001',
      nameEn: 'ACME Corporation', 
      nameAr: 'شركة أكمي', 
      isActive: true 
    },
    { upsert: true, new: true }
  );

  const vendorOrg = await Organization.findOneAndUpdate(
    { code: 'vendor-org-001' },
    { 
      code: 'vendor-org-001', 
      orgId: 'vendor-org-001',
      nameEn: 'Vendor Corp', 
      nameAr: 'شركة الموردين', 
      isActive: true 
    },
    { upsert: true, new: true }
  );

  console.log('✅ Organizations created');

  const hashedPassword = await bcrypt.hash(PASSWORD, 12);

  // Users with CORRECT structure (professional.role)
  const users = [
    { orgId: fixzitOrg._id, email: 'superadmin@fixzit.co', code: 'USR-SA001', username: 'superadmin', employeeId: 'SA001', personal: { firstName: 'Sultan', lastName: 'Al-Harthi' }, professional: { role: 'super_admin', title: 'Super Administrator', department: 'Platform' }, permissions: ['*'] },
    { orgId: acmeOrg._id, email: 'corp.admin@fixzit.co', code: 'USR-CA001', username: 'corpadmin', employeeId: 'CA001', personal: { firstName: 'Corporate', lastName: 'Admin' }, professional: { role: 'corporate_admin', title: 'Corporate Administrator', department: 'Admin' }, permissions: ['org:*', 'users:*', 'reports:*'] },
    { orgId: acmeOrg._id, email: 'property.manager@fixzit.co', code: 'USR-PM001', username: 'propmanager', employeeId: 'PM001', personal: { firstName: 'Property', lastName: 'Manager' }, professional: { role: 'property_manager', title: 'Property Manager', department: 'Operations' }, permissions: ['properties:*', 'tenants:*', 'work_orders:*'] },
    { orgId: acmeOrg._id, email: 'dispatcher@fixzit.co', code: 'USR-DISP001', username: 'dispatcher', employeeId: 'DISP001', personal: { firstName: 'Operations', lastName: 'Dispatcher' }, professional: { role: 'operations_dispatcher', title: 'Operations Dispatcher', department: 'Operations' }, permissions: ['work_orders:*', 'schedules:*'] },
    { orgId: acmeOrg._id, email: 'supervisor@fixzit.co', code: 'USR-SUP001', username: 'supervisor', employeeId: 'SUP001', personal: { firstName: 'Field', lastName: 'Supervisor' }, professional: { role: 'supervisor', title: 'Field Supervisor', department: 'Operations' }, permissions: ['work_orders:*', 'technicians:*'] },
    { orgId: acmeOrg._id, email: 'technician@fixzit.co', code: 'USR-TECH001', username: 'technician', employeeId: 'TECH001', personal: { firstName: 'Internal', lastName: 'Technician' }, professional: { role: 'technician_internal', title: 'Technician', department: 'Field' }, permissions: ['work_orders:assigned', 'inventory:view'] },
    { orgId: vendorOrg._id, email: 'vendor.admin@fixzit.co', code: 'USR-VA001', username: 'vendoradmin', employeeId: 'VA001', personal: { firstName: 'Vendor', lastName: 'Admin' }, professional: { role: 'vendor_admin', title: 'Vendor Administrator', department: 'Vendor' }, permissions: ['vendor:*', 'work_orders:vendor'] },
    { orgId: vendorOrg._id, email: 'vendor.tech@fixzit.co', code: 'USR-VT001', username: 'vendortech', employeeId: 'VT001', personal: { firstName: 'Vendor', lastName: 'Technician' }, professional: { role: 'vendor_technician', title: 'Vendor Technician', department: 'Vendor' }, permissions: ['work_orders:assigned'] },
    { orgId: acmeOrg._id, email: 'tenant@fixzit.co', code: 'USR-TEN001', username: 'tenant', employeeId: 'TEN001', personal: { firstName: 'Tenant', lastName: 'User' }, professional: { role: 'tenant_resident', title: 'Tenant', department: 'Residents' }, permissions: ['work_orders:create', 'payments:*'] },
    { orgId: acmeOrg._id, email: 'owner@fixzit.co', code: 'USR-OWN001', username: 'owner', employeeId: 'OWN001', personal: { firstName: 'Property', lastName: 'Owner' }, professional: { role: 'owner_landlord', title: 'Property Owner', department: 'Owners' }, permissions: ['properties:read', 'reports:*', 'payments:receive'] },
    { orgId: acmeOrg._id, email: 'finance@fixzit.co', code: 'USR-FIN001', username: 'finance', employeeId: 'FIN001', personal: { firstName: 'Finance', lastName: 'Manager' }, professional: { role: 'finance_manager', title: 'Finance Manager', department: 'Finance' }, permissions: ['finance:*', 'zatca:*'] },
    { orgId: acmeOrg._id, email: 'hr@fixzit.co', code: 'USR-HR001', username: 'hr', employeeId: 'HR001', personal: { firstName: 'HR', lastName: 'Manager' }, professional: { role: 'hr_manager', title: 'HR Manager', department: 'HR' }, permissions: ['hr:*'] },
    { orgId: acmeOrg._id, email: 'helpdesk@fixzit.co', code: 'USR-HELP001', username: 'helpdesk', employeeId: 'HELP001', personal: { firstName: 'Helpdesk', lastName: 'Agent' }, professional: { role: 'helpdesk_agent', title: 'Helpdesk Agent', department: 'Support' }, permissions: ['support:*', 'crm:*'] },
    { orgId: acmeOrg._id, email: 'auditor@fixzit.co', code: 'USR-AUD001', username: 'auditor', employeeId: 'AUD001', personal: { firstName: 'Auditor', lastName: 'Compliance' }, professional: { role: 'auditor_compliance', title: 'Auditor / Compliance', department: 'Compliance' }, permissions: ['*:read'] },
    { orgId: fixzitOrg._id, email: 'admin@fixzit.co', code: 'USR-SA001-TEST', username: 'admin', employeeId: 'SA001-TEST', personal: { firstName: 'Admin', lastName: '(Test)' }, professional: { role: 'super_admin', title: 'Super Administrator', department: 'Platform' }, permissions: ['*'] }
  ];

  console.log(`\n📝 Seeding ${users.length} users...\n`);

  for (const userData of users) {
    await User.findOneAndUpdate(
      { orgId: userData.orgId, email: userData.email },
      { ...userData, password: hashedPassword, status: 'ACTIVE', isActive: true, emailVerifiedAt: new Date() },
      { upsert: true, new: true }
    );
    console.log(`✅ Created: ${userData.email} (${userData.professional.role})`);
  }

  console.log('\n✅ Seed complete!');
  console.log(`📊 Total users: ${users.length}`);
  
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
