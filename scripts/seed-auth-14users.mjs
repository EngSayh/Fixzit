import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'fixzit.co';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI missing");

// Safety: block accidental production/CI execution and require explicit opt-in
const isProdLike = process.env.NODE_ENV === "production" || process.env.CI === "true";
if (isProdLike) {
  console.error("❌ SEEDING BLOCKED: seed-auth-14users.mjs cannot run in production/CI");
  process.exit(1);
}
if (process.env.ALLOW_SEED !== "1") {
  console.error("❌ ALLOW_SEED=1 is required to run this script (prevents accidental prod writes)");
  process.exit(1);
}

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
        "SUPER_ADMIN",
        "CORPORATE_ADMIN",
        "MANAGER",
        "PROPERTY_MANAGER",
        "OPERATIONS_MANAGER",
        "TECHNICIAN",
        "VENDOR",
        "TENANT",
        "OWNER",
        "FINANCE",
        "FINANCE_OFFICER",
        "HR",
        "HR_OFFICER",
        "SUPPORT_AGENT",
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
      employeeId: "EMP001",
      name: "Super Admin",
      role: "SUPER_ADMIN",
      permissions: ["*"],
    },

    // 2-3. Core admin roles
    {
      orgId: acmeOrg._id,
      email: `corp.admin@${EMAIL_DOMAIN}`,
      employeeId: "EMP002",
      name: "Corporate Admin",
      role: "CORPORATE_ADMIN",
      permissions: ["org:*"],
    },
    {
      orgId: acmeOrg._id,
      email: `manager@${EMAIL_DOMAIN}`,
      employeeId: "EMP003",
      name: "Manager",
      role: "MANAGER",
      permissions: ["org:*", "workorders:*"],
    },

    // 4-5. Operations & property roles
    {
      orgId: acmeOrg._id,
      email: `property.manager@${EMAIL_DOMAIN}`,
      employeeId: "EMP004",
      name: "Property Manager",
      role: "PROPERTY_MANAGER",
      permissions: ["properties:*", "workorders:*"],
    },
    {
      orgId: acmeOrg._id,
      email: `ops.manager@${EMAIL_DOMAIN}`,
      employeeId: "EMP005",
      name: "Operations Manager",
      role: "OPERATIONS_MANAGER",
      permissions: ["dispatch:*", "workorders:*"],
    },

    // 6. Technical role (internal)
    {
      orgId: acmeOrg._id,
      email: `technician@${EMAIL_DOMAIN}`,
      employeeId: "EMP006",
      name: "Technician (Internal)",
      role: "TECHNICIAN",
      permissions: ["workorders:execute"],
    },

    // 7. Vendor role
    {
      orgId: acmeOrg._id,
      email: `vendor@${EMAIL_DOMAIN}`,
      employeeId: "EMP007",
      name: "Vendor",
      role: "VENDOR",
      permissions: ["vendors:*", "marketplace:*"],
    },

    // 8-9. Customer roles
    {
      orgId: acmeOrg._id,
      email: `tenant@${EMAIL_DOMAIN}`,
      employeeId: null,
      name: "Tenant / Resident",
      role: "TENANT",
      permissions: ["tenant_portal:*"],
    },
    {
      orgId: acmeOrg._id,
      email: `owner@${EMAIL_DOMAIN}`,
      employeeId: "EMP008",
      name: "Owner / Landlord",
      role: "OWNER",
      permissions: ["owner_portal:*"],
    },

    // 10-14. Business & support roles
    {
      orgId: acmeOrg._id,
      email: `finance@${EMAIL_DOMAIN}`,
      employeeId: "EMP009",
      name: "Finance",
      role: "FINANCE",
      permissions: ["finance:*", "zatca:*"],
    },
    {
      orgId: acmeOrg._id,
      email: `finance.officer@${EMAIL_DOMAIN}`,
      employeeId: "EMP010",
      name: "Finance Officer",
      role: "FINANCE_OFFICER",
      permissions: ["finance:*"],
    },
    {
      orgId: acmeOrg._id,
      email: `hr@${EMAIL_DOMAIN}`,
      employeeId: "EMP011",
      name: "HR",
      role: "HR",
      permissions: ["hr:*"],
    },
    {
      orgId: acmeOrg._id,
      email: `hr.officer@${EMAIL_DOMAIN}`,
      employeeId: "EMP012",
      name: "HR Officer",
      role: "HR_OFFICER",
      permissions: ["hr:*"],
    },
    {
      orgId: acmeOrg._id,
      email: `support@${EMAIL_DOMAIN}`,
      employeeId: "EMP013",
      name: "Support Agent",
      role: "SUPPORT_AGENT",
      permissions: ["support:*", "crm:*"],
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
