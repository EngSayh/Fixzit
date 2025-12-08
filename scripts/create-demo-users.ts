#!/usr/bin/env node
/**
 * Create missing demo users
 */
import { db } from "../lib/mongo";
import { User } from "../server/models/User";
import { hashPassword } from "../lib/auth";

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "fixzit.co";

// Safety: block accidental production/CI execution and require explicit opt-in
const isProdLike =
  process.env.NODE_ENV === "production" || process.env.CI === "true";
if (isProdLike) {
  console.error("❌ SEEDING BLOCKED: create-demo-users.ts cannot run in production/CI");
  process.exit(1);
}
if (process.env.ALLOW_SEED !== "1") {
  console.error("❌ ALLOW_SEED=1 is required to run create-demo-users.ts (prevents accidental prod writes)");
  process.exit(1);
}

const demoPhones = {
  superadmin:
    process.env.DEMO_SUPERADMIN_PHONE ||
    process.env.NEXTAUTH_SUPERADMIN_FALLBACK_PHONE ||
    "+966552233456",
  manager: process.env.DEMO_MANAGER_PHONE || "+966552233456",
  tenant: process.env.DEMO_TENANT_PHONE || "+966552233456",
  vendor: process.env.DEMO_VENDOR_PHONE || "+966552233456",
  emp001: process.env.DEMO_EMP001_PHONE || "+966552233456",
  emp002: process.env.DEMO_EMP002_PHONE || "+966552233456",
} as const;

const newUsers = [
  {
    code: "USR-SUPERADMIN",
    username: "superadmin",
    email: `superadmin@${EMAIL_DOMAIN}`,

    employeeId: "SUPER-001",
    phone: demoPhones.superadmin,
    orgId: "68dc8955a1ba6ed80ff372dc",
    personal: {
      firstName: "Super",
      lastName: "Admin",
      phone: demoPhones.superadmin,
      address: { country: "SA" },
    },
    professional: {
      role: "SUPER_ADMIN",
      title: "Super Administrator",
      department: "IT",
    },
    status: "ACTIVE",
  },
  {
    code: "USR-MANAGER",
    username: "manager",
    email: `manager@${EMAIL_DOMAIN}`,
    employeeId: "MGR-001",
    phone: demoPhones.manager,
    orgId: "68dc8955a1ba6ed80ff372dc",
    personal: {
      firstName: "Property",
      lastName: "Manager",
      phone: demoPhones.manager,
      address: { country: "SA" },
    },
    professional: {
      role: "PROPERTY_MANAGER",
      title: "Property Manager",
      department: "Operations",
    },
    status: "ACTIVE",
  },
  {
    code: "USR-TENANT",
    username: "tenant",
    email: `tenant@${EMAIL_DOMAIN}`,
    employeeId: "TENANT-001",
    phone: demoPhones.tenant,
    orgId: "68dc8955a1ba6ed80ff372dc",
    personal: {
      firstName: "Demo",
      lastName: "Tenant",
      phone: demoPhones.tenant,
      address: { country: "SA" },
    },
    professional: {
      role: "TENANT",
      title: "Tenant",
      department: "N/A",
    },
    status: "ACTIVE",
  },
  {
    code: "USR-VENDOR",
    username: "vendor",
    email: `vendor@${EMAIL_DOMAIN}`,
    employeeId: "VENDOR-001",
    phone: demoPhones.vendor,
    orgId: "68dc8955a1ba6ed80ff372dc",
    personal: {
      firstName: "Demo",
      lastName: "Vendor",
      phone: demoPhones.vendor,
      address: { country: "SA" },
    },
    professional: {
      role: "VENDOR",
      title: "Vendor",
      department: "N/A",
    },
    status: "ACTIVE",
  },
  {
    code: "EMP001",
    username: "EMP001",
    email: `emp001@${EMAIL_DOMAIN}`,
    employeeId: "EMP001",
    phone: demoPhones.emp001,
    orgId: "68dc8955a1ba6ed80ff372dc",
    personal: {
      firstName: "Employee",
      lastName: "One",
      phone: demoPhones.emp001,
      address: { country: "SA" },
    },
    professional: {
      role: "EMPLOYEE",
      title: "Corporate Employee",
      department: "Operations",
    },
    status: "ACTIVE",
  },
  {
    code: "EMP002",
    username: "EMP002",
    email: `emp002@${EMAIL_DOMAIN}`,
    employeeId: "EMP002",
    phone: demoPhones.emp002,
    orgId: "68dc8955a1ba6ed80ff372dc",
    personal: {
      firstName: "Employee",
      lastName: "Two",
      phone: demoPhones.emp002,
      address: { country: "SA" },
    },
    professional: {
      role: "EMPLOYEE",
      title: "Corporate Employee",
      department: "Operations",
    },
    status: "ACTIVE",
  },
];

// SEC-051: Use environment variables (no hardcoded fallbacks)
const BASE_PASSWORD =
  process.env.SEED_PASSWORD ||
  process.env.TEST_USER_PASSWORD ||
  process.env.DEMO_DEFAULT_PASSWORD;
if (!BASE_PASSWORD) {
  throw new Error(
    "DEMO_DEFAULT_PASSWORD/SEED_PASSWORD/TEST_USER_PASSWORD is required for create-demo-users.ts",
  );
}
const DEMO_SUPERADMIN_PASSWORD =
  process.env.DEMO_SUPERADMIN_PASSWORD || BASE_PASSWORD;
const DEMO_DEFAULT_PASSWORD =
  process.env.DEMO_DEFAULT_PASSWORD || BASE_PASSWORD;

async function createUsers() {
  try {
    await db;
    console.log("🌱 Creating missing demo users...\n");

    const [hashedSuperAdminPassword, hashedDefaultPassword] = await Promise.all(
      [hashPassword(DEMO_SUPERADMIN_PASSWORD), hashPassword(DEMO_DEFAULT_PASSWORD)],
    );
    let created = 0;

    for (const userData of newUsers) {
      const exists = await User.findOne({ email: userData.email });
      if (exists) {
        console.log(`⏭️  Skip: ${userData.email} (already exists)`);
        continue;
      }

      try {
        // Use insertOne to bypass validation plugins
        const result = await User.collection.insertOne({
          ...userData,
          password:
            userData.username === "superadmin"
              ? hashedSuperAdminPassword
              : hashedDefaultPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          changeHistory: [],
          tags: [],
        });

        if (result.acknowledged) {
          console.log(
            `✅ Created: ${userData.email} (${userData.professional.role})`,
          );
          created++;
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error creating ${userData.email}:`, message);
      }
    }

    console.log(`\n📊 Created ${created} new users`);
    // SEC-051: Don't log passwords to console - they may end up in CI logs
    console.log("\n📝 All demo users should now be available:");
    console.log(`   superadmin@${EMAIL_DOMAIN} / [DEMO_SUPERADMIN_PASSWORD]`);
    console.log(`   admin@${EMAIL_DOMAIN} / [DEMO_DEFAULT_PASSWORD]`);
    console.log(`   manager@${EMAIL_DOMAIN} / [DEMO_DEFAULT_PASSWORD]`);
    console.log(`   tenant@${EMAIL_DOMAIN} / [DEMO_DEFAULT_PASSWORD]`);
    console.log(`   vendor@${EMAIL_DOMAIN} / [DEMO_DEFAULT_PASSWORD]`);
    console.log(`   EMP001 / [DEMO_DEFAULT_PASSWORD] (corporate)`);
    console.log(`   EMP002 / [DEMO_DEFAULT_PASSWORD] (corporate)`);
    console.log('\n💡 Set SHOW_DEMO_CREDS=true to display actual passwords');

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

createUsers();
