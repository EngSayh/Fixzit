#!/usr/bin/env node
/**
 * Seed demo users that match the login page credentials
 * Default passwords: superadmin uses "admin123", others use "password123"
 * 
 * Email domain is configurable via EMAIL_DOMAIN environment variable.
 * Uses centralized demo user configuration from lib/config/demo-users.ts
 */
import { db } from "../lib/mongo";
import { User } from "../server/models/User";
import { hashPassword } from "../lib/auth";
import { getDemoEmail, DEMO_USER_DEFINITIONS } from "../lib/config/demo-users";

const demoPhones = {
  superadmin:
    process.env.DEMO_SUPERADMIN_PHONE ||
    process.env.NEXTAUTH_SUPERADMIN_FALLBACK_PHONE ||
    "+966552233456",
  admin: process.env.DEMO_ADMIN_PHONE || "+966552233456",
  manager: process.env.DEMO_MANAGER_PHONE || "+966552233456",
  tenant: process.env.DEMO_TENANT_PHONE || "+966552233456",
  vendor: process.env.DEMO_VENDOR_PHONE || "+966552233456",
  emp001: process.env.DEMO_EMP001_PHONE || "+966552233456",
  emp002: process.env.DEMO_EMP002_PHONE || "+966552233456",
} as const;

const demoUsers = [
  {
    code: "USR-SUPERADMIN",
    username: "superadmin",
    email: getDemoEmail("superadmin"),
    password: "admin123",
    phone: demoPhones.superadmin,
    orgId: "68dc8955a1ba6ed80ff372dc",
    personal: {
      firstName: "Super",
      lastName: "Admin",
      phone: demoPhones.superadmin,
      nationality: "SA",
      address: { country: "SA" },
    },
    professional: {
      role: "SUPER_ADMIN",
      title: "Super Administrator",
      department: "IT",
      skills: [],
      licenses: [],
      certifications: [],
    },
    workload: {
      workingHours: { days: [], timezone: "Asia/Riyadh" },
      availability: [],
    },
    performance: { reviews: [] },
    security: { permissions: [] },
    employment: { benefits: [] },
    compliance: { training: [] },
    status: "ACTIVE",
    createdBy: "seed-script",
  },
  {
    code: "USR-ADMIN",
    username: "admin",
    email: getDemoEmail("admin"),
    password: "password123",
    phone: demoPhones.admin,
    // Don't set orgId/createdBy for existing user - will be updated via updateOne
  },
  {
    code: "USR-MANAGER",
    username: "manager",
    email: getDemoEmail("manager"),
    password: "password123",
    phone: demoPhones.manager,
    orgId: "68dc8955a1ba6ed80ff372dc",
    personal: {
      firstName: "Property",
      lastName: "Manager",
      phone: demoPhones.manager,
      nationality: "SA",
      address: { country: "SA" },
    },
    professional: {
      role: "PROPERTY_MANAGER",
      title: "Property Manager",
      department: "Operations",
      skills: [],
      licenses: [],
      certifications: [],
    },
    workload: {
      workingHours: { days: [], timezone: "Asia/Riyadh" },
      availability: [],
    },
    performance: { reviews: [] },
    security: { permissions: [] },
    employment: { benefits: [] },
    compliance: { training: [] },
    status: "ACTIVE",
    createdBy: "seed-script",
  },
  {
    code: "USR-TENANT",
    username: "tenant",
    email: getDemoEmail("tenant"),
    password: "password123",
    phone: demoPhones.tenant,
    orgId: "68dc8955a1ba6ed80ff372dc",
    personal: {
      firstName: "Demo",
      lastName: "Tenant",
      phone: demoPhones.tenant,
      nationality: "SA",
      address: { country: "SA" },
    },
    professional: {
      role: "TENANT",
      title: "Tenant",
      department: "N/A",
      skills: [],
      licenses: [],
      certifications: [],
    },
    workload: {
      workingHours: { days: [], timezone: "Asia/Riyadh" },
      availability: [],
    },
    performance: { reviews: [] },
    security: { permissions: [] },
    employment: { benefits: [] },
    compliance: { training: [] },
    status: "ACTIVE",
    createdBy: "seed-script",
  },
  {
    code: "USR-VENDOR",
    username: "vendor",
    email: getDemoEmail("vendor"),
    password: "password123",
    phone: demoPhones.vendor,
    orgId: "68dc8955a1ba6ed80ff372dc",
    personal: {
      firstName: "Demo",
      lastName: "Vendor",
      phone: demoPhones.vendor,
      nationality: "SA",
      address: { country: "SA" },
    },
    professional: {
      role: "VENDOR",
      title: "Vendor",
      department: "N/A",
      skills: [],
      licenses: [],
      certifications: [],
    },
    workload: {
      workingHours: { days: [], timezone: "Asia/Riyadh" },
      availability: [],
    },
    performance: { reviews: [] },
    security: { permissions: [] },
    employment: { benefits: [] },
    compliance: { training: [] },
    status: "ACTIVE",
    createdBy: "seed-script",
  },
  {
    code: "EMP001",
    username: "EMP001",
    email: getDemoEmail("emp001"),
    password: "password123",
    phone: demoPhones.emp001,
    orgId: "68dc8955a1ba6ed80ff372dc",
    personal: {
      firstName: "Employee",
      lastName: "One",
      phone: demoPhones.emp001,
      nationality: "SA",
      address: { country: "SA" },
    },
    professional: {
      role: "EMPLOYEE",
      title: "Corporate Employee",
      department: "Operations",
      skills: [],
      licenses: [],
      certifications: [],
    },
    workload: {
      workingHours: { days: [], timezone: "Asia/Riyadh" },
      availability: [],
    },
    performance: { reviews: [] },
    security: { permissions: [] },
    employment: { benefits: [] },
    compliance: { training: [] },
    status: "ACTIVE",
    createdBy: "seed-script",
  },
  {
    code: "EMP002",
    username: "EMP002",
    email: getDemoEmail("emp002"),
    password: "password123",
    phone: demoPhones.emp002,
    orgId: "68dc8955a1ba6ed80ff372dc",
    personal: {
      firstName: "Employee",
      lastName: "Two",
      phone: demoPhones.emp002,
      nationality: "SA",
      address: { country: "SA" },
    },
    professional: {
      role: "EMPLOYEE",
      title: "Corporate Employee",
      department: "Operations",
      skills: [],
      licenses: [],
      certifications: [],
    },
    workload: {
      workingHours: { days: [], timezone: "Asia/Riyadh" },
      availability: [],
    },
    performance: { reviews: [] },
    security: { permissions: [] },
    employment: { benefits: [] },
    compliance: { training: [] },
    status: "ACTIVE",
    createdBy: "seed-script",
  },
];

async function seedDemoUsers() {
  try {
    await db;
    console.log("🌱 Seeding demo users...\n");

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const userData of demoUsers) {
      const existingUser = await User.findOne({ email: userData.email });

      const hashedPassword = await hashPassword(userData.password);
      const userWithHashedPassword = {
        ...userData,
        password: hashedPassword,
      };

      if (existingUser) {
        // Update existing user's password using direct MongoDB update to skip validation
        const updateFields: Record<string, unknown> = {
          password: hashedPassword,
          status: "ACTIVE",
          username: userData.username,
        };

        if (userData.phone) {
          updateFields.phone = userData.phone;
        }
        if (userData.personal?.phone) {
          updateFields["personal.phone"] = userData.personal.phone;
        }

        await User.updateOne(
          { _id: existingUser._id },
          {
            $set: updateFields,
          },
        );
        console.log(`✅ Updated user: ${userData.email} (password updated)`);
        updated++;
      } else {
        try {
          await User.create(userWithHashedPassword);
          console.log(
            `✅ Created user: ${userData.email} (${userData.professional?.role || "user"})`,
          );
          created++;
        } catch (error: unknown) {
          const duplicate =
            typeof error === "object" && error !== null
              ? (error as { code?: number })
              : undefined;
          if (duplicate?.code === 11000) {
            console.log(`⏭️  User already exists: ${userData.email}`);
            skipped++;
          } else {
            const message =
              error instanceof Error ? error.message : String(error);
            console.error(`❌ Error creating ${userData.email}:`, message);
          }
        }
      }
    }

    console.log("\n📊 Summary:");
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log("   Total:   " + (created + updated + skipped));
    console.log("\n✅ Demo user seeding completed!");
    console.log("\n📝 Login credentials:");
    console.log(`   Personal:  ${getDemoEmail("superadmin")} / admin123`);
    console.log(`   Personal:  ${getDemoEmail("admin")} / password123`);
    console.log(`   Personal:  ${getDemoEmail("manager")} / password123`);
    console.log(`   Personal:  ${getDemoEmail("tenant")} / password123`);
    console.log(`   Personal:  ${getDemoEmail("vendor")} / password123`);
    console.log("   Corporate: EMP001 / password123");
    console.log("   Corporate: EMP002 / password123");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding demo users:", error);
    process.exit(1);
  }
}

seedDemoUsers();
