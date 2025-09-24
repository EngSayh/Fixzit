// scripts/seed-rbac-ksa.js - Seed RBAC roles and permissions with KSA compliance
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit';

// Role definitions with KSA compliance considerations
const ROLES = [
  {
    code: 'SUPER_ADMIN',
    name: 'Super Administrator',
    nameAr: 'المشرف العام',
    description: 'Full system access across all tenants',
    modules: ['*'],
    permissions: ['*'],
    dataScope: 'global',
    requiresNafath: false,
    requiresFAL: false
  },
  {
    code: 'CORP_ADMIN',
    name: 'Corporate Administrator',
    nameAr: 'مدير الشركة',
    description: 'Full access within organization',
    modules: ['dashboard', 'work_orders', 'properties', 'finance', 'hr', 'administration', 'crm', 'marketplace', 'support', 'compliance', 'reports'],
    permissions: ['read', 'write', 'delete', 'approve', 'export'],
    dataScope: 'tenant',
    requiresNafath: true,
    requiresFAL: false
  },
  {
    code: 'MANAGEMENT',
    name: 'Management',
    nameAr: 'الإدارة',
    description: 'Management oversight and approvals',
    modules: ['dashboard', 'work_orders', 'properties', 'reports', 'support'],
    permissions: ['read', 'write', 'approve'],
    dataScope: 'tenant',
    requiresNafath: false,
    requiresFAL: false
  },
  {
    code: 'FINANCE',
    name: 'Finance Manager',
    nameAr: 'مدير المالية',
    description: 'Financial operations and reporting',
    modules: ['dashboard', 'finance', 'reports', 'support'],
    permissions: ['read', 'write', 'approve', 'export'],
    dataScope: 'tenant',
    requiresNafath: true,
    requiresFAL: false
  },
  {
    code: 'HR',
    name: 'Human Resources',
    nameAr: 'الموارد البشرية',
    description: 'HR management and operations',
    modules: ['dashboard', 'hr', 'reports', 'support'],
    permissions: ['read', 'write', 'approve'],
    dataScope: 'tenant',
    requiresNafath: false,
    requiresFAL: false
  },
  {
    code: 'PROPERTY_OWNER',
    name: 'Property Owner',
    nameAr: 'مالك العقار',
    description: 'Property owner with portfolio access',
    modules: ['dashboard', 'properties', 'work_orders', 'finance', 'reports', 'support'],
    permissions: ['read', 'write'],
    dataScope: 'owned',
    requiresNafath: true,
    requiresFAL: false
  },
  {
    code: 'PROPERTY_MANAGER',
    name: 'Property Manager',
    nameAr: 'مدير العقار',
    description: 'Manages properties and operations',
    modules: ['dashboard', 'properties', 'work_orders', 'support', 'reports'],
    permissions: ['read', 'write', 'assign'],
    dataScope: 'assigned',
    requiresNafath: false,
    requiresFAL: false
  },
  {
    code: 'TECHNICIAN',
    name: 'Technician',
    nameAr: 'فني',
    description: 'Executes work orders',
    modules: ['dashboard', 'work_orders', 'support', 'reports'],
    permissions: ['read', 'update'],
    dataScope: 'assigned',
    requiresNafath: false,
    requiresFAL: false
  },
  {
    code: 'TENANT',
    name: 'Tenant',
    nameAr: 'المستأجر',
    description: 'Tenant/customer access',
    modules: ['dashboard', 'work_orders', 'properties', 'marketplace', 'support', 'reports'],
    permissions: ['read', 'create'],
    dataScope: 'own',
    requiresNafath: false,
    requiresFAL: false
  },
  {
    code: 'VENDOR',
    name: 'Vendor/Supplier',
    nameAr: 'المورد',
    description: 'Marketplace vendor access',
    modules: ['dashboard', 'work_orders', 'marketplace', 'support', 'reports'],
    permissions: ['read', 'write'],
    dataScope: 'vendor',
    requiresNafath: false,
    requiresFAL: false
  },
  {
    code: 'BROKER_AGENT',
    name: 'Real Estate Broker/Agent',
    nameAr: 'وسيط عقاري',
    description: 'Licensed real estate professional',
    modules: ['dashboard', 'properties', 'marketplace', 'support', 'compliance', 'reports'],
    permissions: ['read', 'write', 'list'],
    dataScope: 'broker',
    requiresNafath: true,
    requiresFAL: true // REGA FAL license required
  },
  {
    code: 'FINANCE_CONTROLLER',
    name: 'Finance Controller',
    nameAr: 'المراقب المالي',
    description: 'Financial oversight and audit',
    modules: ['dashboard', 'finance', 'reports', 'compliance'],
    permissions: ['read', 'approve', 'export'],
    dataScope: 'tenant',
    requiresNafath: true,
    requiresFAL: false
  },
  {
    code: 'COMPLIANCE_AUDITOR',
    name: 'Compliance Auditor',
    nameAr: 'مدقق الامتثال',
    description: 'Compliance and audit access',
    modules: ['dashboard', 'properties', 'finance', 'support', 'compliance', 'reports'],
    permissions: ['read', 'export'],
    dataScope: 'tenant',
    requiresNafath: true,
    requiresFAL: false
  },
  {
    code: 'GUEST',
    name: 'Guest/Visitor',
    nameAr: 'زائر',
    description: 'Public browsing access',
    modules: ['dashboard', 'marketplace'],
    permissions: ['read'],
    dataScope: 'public',
    requiresNafath: false,
    requiresFAL: false
  }
];

// Module definitions
const MODULES = [
  { code: 'dashboard', name: 'Dashboard', nameAr: 'لوحة القيادة', public: true },
  { code: 'work_orders', name: 'Work Orders', nameAr: 'أوامر العمل', public: false },
  { code: 'properties', name: 'Properties', nameAr: 'العقارات', public: false },
  { code: 'finance', name: 'Finance', nameAr: 'المالية', public: false },
  { code: 'hr', name: 'Human Resources', nameAr: 'الموارد البشرية', public: false },
  { code: 'administration', name: 'Administration', nameAr: 'الإدارة', public: false },
  { code: 'crm', name: 'CRM', nameAr: 'إدارة العملاء', public: false },
  { code: 'marketplace', name: 'Marketplace', nameAr: 'السوق', public: true },
  { code: 'support', name: 'Support', nameAr: 'الدعم', public: true },
  { code: 'compliance', name: 'Compliance & Legal', nameAr: 'الامتثال والقانون', public: false },
  { code: 'reports', name: 'Reports & Analytics', nameAr: 'التقارير والتحليلات', public: false },
  { code: 'system', name: 'System Management', nameAr: 'إدارة النظام', public: false }
];

// Permission types
const PERMISSIONS = [
  { code: 'read', name: 'Read', nameAr: 'قراءة' },
  { code: 'write', name: 'Write', nameAr: 'كتابة' },
  { code: 'delete', name: 'Delete', nameAr: 'حذف' },
  { code: 'approve', name: 'Approve', nameAr: 'موافقة' },
  { code: 'assign', name: 'Assign', nameAr: 'تعيين' },
  { code: 'export', name: 'Export', nameAr: 'تصدير' },
  { code: 'list', name: 'List/Publish', nameAr: 'نشر' },
  { code: 'update', name: 'Update', nameAr: 'تحديث' },
  { code: 'create', name: 'Create', nameAr: 'إنشاء' }
];

// Schemas
const RoleSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  nameAr: { type: String },
  description: { type: String },
  modules: [{ type: String }],
  permissions: [{ type: String }],
  dataScope: { type: String, enum: ['global', 'tenant', 'owned', 'assigned', 'own', 'vendor', 'broker', 'public'] },
  requiresNafath: { type: Boolean, default: false },
  requiresFAL: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ModuleSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  nameAr: { type: String },
  description: { type: String },
  public: { type: Boolean, default: false },
  icon: { type: String },
  route: { type: String },
  order: { type: Number },
  isActive: { type: Boolean, default: true }
});

const PermissionSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  nameAr: { type: String },
  description: { type: String }
});

// Models
const Role = mongoose.models.Role || mongoose.model('Role', RoleSchema);
const Module = mongoose.models.Module || mongoose.model('Module', ModuleSchema);
const Permission = mongoose.models.Permission || mongoose.model('Permission', PermissionSchema);

// Seed function
async function seedRBAC() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Seed Permissions
    console.log('\n🌱 Seeding permissions...');
    for (const perm of PERMISSIONS) {
      await Permission.findOneAndUpdate(
        { code: perm.code },
        perm,
        { upsert: true, new: true }
      );
      console.log(`  ✅ Permission: ${perm.code}`);
    }

    // Seed Modules
    console.log('\n🌱 Seeding modules...');
    for (let i = 0; i < MODULES.length; i++) {
      const module = { ...MODULES[i], order: i + 1 };
      await Module.findOneAndUpdate(
        { code: module.code },
        module,
        { upsert: true, new: true }
      );
      console.log(`  ✅ Module: ${module.code}`);
    }

    // Seed Roles
    console.log('\n🌱 Seeding roles...');
    for (const role of ROLES) {
      await Role.findOneAndUpdate(
        { code: role.code },
        { ...role, updatedAt: new Date() },
        { upsert: true, new: true }
      );
      console.log(`  ✅ Role: ${role.code} - ${role.name}`);
    }

    // Summary
    const roleCount = await Role.countDocuments();
    const moduleCount = await Module.countDocuments();
    const permCount = await Permission.countDocuments();

    console.log('\n📊 Summary:');
    console.log(`  - Roles: ${roleCount}`);
    console.log(`  - Modules: ${moduleCount}`);
    console.log(`  - Permissions: ${permCount}`);

    // Special notes for KSA compliance
    console.log('\n🇸🇦 KSA Compliance Notes:');
    console.log('  - BROKER_AGENT role requires REGA FAL license validation');
    console.log('  - High-value transactions require Nafath authentication');
    console.log('  - ZATCA e-invoicing enabled for marketplace transactions');
    console.log('  - National Address (SPL) validation for property listings');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the seeder
seedRBAC();
