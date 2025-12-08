import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'fixzit.co';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI missing");

// Organization Schema
const orgSchema = new mongoose.Schema(
  {
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
  },
  { timestamps: true },
);

const Organization =
  mongoose.models.Organization || mongoose.model("Organization", orgSchema);

// User Schema - UPDATED TO 14 ROLES
const userSchema = new mongoose.Schema(
  {
    orgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    email: { type: String, required: true, lowercase: true },
    employeeId: { type: String, sparse: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: [
        "super_admin",
        "corporate_admin",
        "property_manager",
        "operations_dispatcher",
        "supervisor",
        "technician_internal",
        "vendor_admin",
        "vendor_technician",
        "tenant_resident",
        "owner_landlord",
        "finance_manager",
        "hr_manager",
        "helpdesk_agent",
        "auditor_compliance",
      ],
    },
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
  },
  { timestamps: true },
);

userSchema.index({ orgId: 1, email: 1 }, { unique: true });
userSchema.index({ orgId: 1, employeeId: 1 }, { unique: true, sparse: true });

const User = mongoose.models.User || mongoose.model("User", userSchema);

// Seed data
/**
 * ⚠️ DEVELOPMENT-ONLY SEED PASSWORD WARNING ⚠️
 *
 * This hardcoded password is ONLY for local development and testing purposes.
 *
 * CRITICAL SECURITY REQUIREMENTS:
 * - NEVER run this script against production databases
 * - NEVER use this password in production environments
 * - Users MUST be forced to change password on first login in any non-local environment
 * - Production credentials must be generated with secure random passwords
 * - See SECURITY_POLICY.md for production credential management
 */
const PASSWORD = process.env.SEED_PASSWORD;

if (!PASSWORD) {
  console.error("❌ SEED_PASSWORD environment variable is required");
  console.error('💡 Set it with: export SEED_PASSWORD="your-secure-password"');
  process.exit(1);
}

async function seed() {
  await mongoose.connect(MONGODB_URI, { dbName: "fixzit" });
  console.log("✅ Connected to MongoDB");

  // Create orgs
  const fixzitOrg = await Organization.findOneAndUpdate(
    { code: "platform-org-001" },
    {
      code: "platform-org-001",
      nameEn: "Fixzit Platform",
      nameAr: "منصة فكسزت",
      isActive: true,
    },
    { upsert: true, new: true },
  );

  const acmeOrg = await Organization.findOneAndUpdate(
    { code: "acme-corp-001" },
    {
      code: "acme-corp-001",
      nameEn: "ACME Corporation",
      nameAr: "شركة أكمي",
      isActive: true,
    },
    { upsert: true, new: true },
  );

  console.log("✅ Organizations created");

  // Create users - ALL 14 ROLES
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const users = [
    // 1. Platform role
    {
      orgId: fixzitOrg._id,
      email: `superadmin@${EMAIL_DOMAIN}`,
      employeeId: "SA001",
      name: "Super Admin",
      role: "super_admin",
      permissions: ["*"],
    },

    // 2-3. Core admin roles
    {
      orgId: acmeOrg._id,
      email: `corp.admin@${EMAIL_DOMAIN}`,
      employeeId: "CA001",
      name: "Corporate Admin",
      role: "corporate_admin",
      permissions: ["org:*"],
    },
    {
      orgId: acmeOrg._id,
      email: `property.manager@${EMAIL_DOMAIN}`,
      employeeId: "PM001",
      name: "Property Manager",
      role: "property_manager",
      permissions: ["properties:*", "workorders:*"],
    },

    // 4-5. Operations roles
    {
      orgId: acmeOrg._id,
      email: `dispatcher@${EMAIL_DOMAIN}`,
      employeeId: "DISP001",
      name: "Operations Dispatcher",
      role: "operations_dispatcher",
      permissions: ["dispatch:*"],
    },
    {
      orgId: acmeOrg._id,
      email: `supervisor@${EMAIL_DOMAIN}`,
      employeeId: "SUP001",
      name: "Supervisor",
      role: "supervisor",
      permissions: ["workorders:*", "assets:*"],
    },

    // 6. Technical role (internal)
    {
      orgId: acmeOrg._id,
      email: `technician@${EMAIL_DOMAIN}`,
      employeeId: "TECH001",
      name: "Technician (Internal)",
      role: "technician_internal",
      permissions: ["workorders:execute"],
    },

    // 7-8. Vendor roles
    {
      orgId: acmeOrg._id,
      email: `vendor.admin@${EMAIL_DOMAIN}`,
      employeeId: "VEND001",
      name: "Vendor Admin",
      role: "vendor_admin",
      permissions: ["vendors:*", "marketplace:*"],
    },
    {
      orgId: acmeOrg._id,
      email: `vendor.tech@${EMAIL_DOMAIN}`,
      employeeId: "VTECH001",
      name: "Vendor Technician",
      role: "vendor_technician",
      permissions: ["workorders:execute"],
    },

    // 9-10. Customer roles
    {
      orgId: acmeOrg._id,
      email: `tenant@${EMAIL_DOMAIN}`,
      employeeId: null,
      name: "Tenant / Resident",
      role: "tenant_resident",
      permissions: ["tenant_portal:*"],
    },
    {
      orgId: acmeOrg._id,
      email: `owner@${EMAIL_DOMAIN}`,
      employeeId: "OWN001",
      name: "Owner / Landlord",
      role: "owner_landlord",
      permissions: ["owner_portal:*"],
    },

    // 11-14. Support & Management roles
    {
      orgId: acmeOrg._id,
      email: `finance@${EMAIL_DOMAIN}`,
      employeeId: "FIN001",
      name: "Finance Manager",
      role: "finance_manager",
      permissions: ["finance:*", "zatca:*"],
    },
    {
      orgId: acmeOrg._id,
      email: `hr@${EMAIL_DOMAIN}`,
      employeeId: "HR001",
      name: "HR Manager",
      role: "hr_manager",
      permissions: ["hr:*"],
    },
    {
      orgId: acmeOrg._id,
      email: `helpdesk@${EMAIL_DOMAIN}`,
      employeeId: "HELP001",
      name: "Helpdesk Agent",
      role: "helpdesk_agent",
      permissions: ["support:*", "crm:*"],
    },
    {
      orgId: acmeOrg._id,
      email: `auditor@${EMAIL_DOMAIN}`,
      employeeId: "AUD001",
      name: "Auditor / Compliance",
      role: "auditor_compliance",
      permissions: ["*"],
    },
  ];

  console.log(`\n📝 Seeding ${users.length} users...\n`);

  for (const userData of users) {
    await User.findOneAndUpdate(
      { orgId: userData.orgId, email: userData.email },
      {
        ...userData,
        passwordHash,
        isActive: true,
        emailVerifiedAt: new Date(),
      },
      { upsert: true, new: true },
    );
    console.log(`✅ Created: ${userData.email} (${userData.role})`);
  }

  const isDev =
    process.env.NODE_ENV === "development" &&
    !process.env.CI &&
    process.env.LOCAL_DEV === "1";
  if (isDev) {
    console.log(`\n🔑 LOCAL DEV ONLY (LOCAL_DEV=1) - Password: ${PASSWORD}`);
    console.log(
      "⚠️  WARNING: Never log passwords in production, CI, or shared environments!\n",
    );
  } else {
    console.log("\n✅ Seed complete! Users created with secure passwords\n");
  }
  console.log(`📊 Total users seeded: ${users.length}`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
