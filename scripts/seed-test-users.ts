#!/usr/bin/env tsx
import { db } from "../lib/mongo";
import { User } from "../server/models/User";
import { hashPassword } from "../lib/auth";
import { Types } from "mongoose";

const TEST_ORG_ID = "68dc8955a1ba6ed80ff372dc";
const TEST_PASSWORD = "Test@1234";
const SEED_USER_ID = new Types.ObjectId("000000000000000000000001");

const TEST_PHONE = "+966552233456";

const testUsers = [
  {
    code: "TEST-SUPERADMIN",
    username: "test-superadmin",
    email: "superadmin@test.fixzit.co",
    password: TEST_PASSWORD,
    orgId: TEST_ORG_ID,
    employeeId: "EMP-TEST-001",
    createdBy: SEED_USER_ID,
    isSuperAdmin: true,
    personal: {
      firstName: "Test",
      lastName: "SuperAdmin",
      nationalId: "1000000001",
      dateOfBirth: new Date("1980-01-01"),
      gender: "Male",
      nationality: "SA",
      address: {
        street: "Test St 1",
        city: "Riyadh",
        region: "Riyadh",
        postalCode: "11564",
        country: "SA",
      },
    },
    professional: {
      role: "SUPER_ADMIN",
      title: "Super Administrator",
      department: "IT",
      skills: [],
      licenses: [],
      certifications: [],
    },
    security: { accessLevel: "ADMIN", permissions: ["*"] },
    preferences: {
      notifications: {
        email: true,
        sms: false,
        app: true,
        workOrders: true,
        maintenance: true,
        reports: true,
      },
      language: "en",
      timezone: "Asia/Riyadh",
      theme: "LIGHT",
    },
    workload: {
      maxAssignments: 100,
      currentAssignments: 0,
      available: true,
      location: { city: "Riyadh", region: "Riyadh", radius: 100 },
      workingHours: {
        start: "00:00",
        end: "23:59",
        days: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ],
        timezone: "Asia/Riyadh",
      },
    },
    performance: { reviews: [] },
    employment: { employeeId: "EMP-TEST-001", benefits: [] },
    compliance: { training: [] },
    status: "ACTIVE",
    tenantId: "test-tenant",
  },
  {
    code: "TEST-ADMIN",
    username: "test-admin",
    email: "admin@test.fixzit.co",
    password: TEST_PASSWORD,
    orgId: TEST_ORG_ID,
    employeeId: "EMP-TEST-002",
    createdBy: SEED_USER_ID,
    personal: {
      firstName: "Test",
      lastName: "Admin",
      nationalId: "1000000002",
      dateOfBirth: new Date("1985-03-15"),
      gender: "Female",
      nationality: "SA",
      address: {
        street: "Test St 2",
        city: "Riyadh",
        region: "Riyadh",
        postalCode: "11622",
        country: "SA",
      },
    },
    professional: {
      role: "ADMIN",
      title: "Corporate Admin",
      department: "Operations",
      skills: [],
      licenses: [],
      certifications: [],
    },
    security: {
      accessLevel: "WRITE",
      permissions: [
        "properties.*",
        "tenants.*",
        "workorders.*",
        "finance.*",
        "hr.*",
        "crm.*",
      ],
    },
    preferences: {
      notifications: {
        email: true,
        sms: true,
        app: true,
        workOrders: true,
        maintenance: true,
        reports: true,
      },
      language: "en",
      timezone: "Asia/Riyadh",
      theme: "LIGHT",
    },
    workload: {
      maxAssignments: 50,
      currentAssignments: 0,
      available: true,
      location: { city: "Riyadh", region: "Riyadh", radius: 50 },
      workingHours: {
        start: "08:00",
        end: "17:00",
        days: ["monday", "tuesday", "wednesday", "thursday", "sunday"],
        timezone: "Asia/Riyadh",
      },
    },
    performance: { reviews: [] },
    employment: { employeeId: "EMP-TEST-002", benefits: [] },
    compliance: { training: [] },
    status: "ACTIVE",
    tenantId: "test-tenant",
  },
  {
    code: "TEST-PROPERTY-MANAGER",
    username: "test-property-manager",
    email: "property-manager@test.fixzit.co",
    password: TEST_PASSWORD,
    orgId: TEST_ORG_ID,
    employeeId: "EMP-TEST-003",
    createdBy: SEED_USER_ID,
    personal: {
      firstName: "Test",
      lastName: "Property Manager",
      nationalId: "1000000006",
      dateOfBirth: new Date("1988-04-12"),
      gender: "Female",
      nationality: "SA",
      address: {
        street: "Test St 6",
        city: "Riyadh",
        region: "Riyadh",
        postalCode: "11564",
        country: "SA",
      },
    },
    professional: {
      role: "MANAGER",
      title: "Property Manager",
      department: "Property Management",
      skills: [],
      licenses: [],
      certifications: [],
    },
    security: {
      accessLevel: "WRITE",
      permissions: [
        "properties.*",
        "tenants.*",
        "workorders.*",
        "crm.*",
        "reports.read",
      ],
    },
    preferences: {
      notifications: {
        email: true,
        sms: true,
        app: true,
        workOrders: true,
        maintenance: true,
        reports: true,
      },
      language: "en",
      timezone: "Asia/Riyadh",
      theme: "LIGHT",
    },
    workload: {
      maxAssignments: 30,
      currentAssignments: 0,
      available: true,
      location: { city: "Riyadh", region: "Riyadh", radius: 40 },
      workingHours: {
        start: "08:00",
        end: "17:00",
        days: ["monday", "tuesday", "wednesday", "thursday", "sunday"],
        timezone: "Asia/Riyadh",
      },
    },
    performance: { reviews: [] },
    employment: { employeeId: "EMP-TEST-003", benefits: [] },
    compliance: { training: [] },
    status: "ACTIVE",
    tenantId: "test-tenant",
  },
  {
    code: "TEST-TECHNICIAN",
    username: "test-technician",
    email: "technician@test.fixzit.co",
    password: TEST_PASSWORD,
    orgId: TEST_ORG_ID,
    employeeId: "EMP-TEST-004",
    createdBy: SEED_USER_ID,
    personal: {
      firstName: "Test",
      lastName: "Technician",
      nationalId: "1000000005",
      dateOfBirth: new Date("1990-11-25"),
      gender: "Male",
      nationality: "SA",
      address: {
        street: "Test St 5",
        city: "Dammam",
        region: "Eastern Province",
        postalCode: "32244",
        country: "SA",
      },
    },
    professional: {
      role: "TECHNICIAN",
      title: "Senior Technician",
      department: "Maintenance",
      skills: [
        {
          category: "ELECTRICAL",
          skill: "Wiring Installation",
          level: "EXPERT",
          certified: true,
          certification: "Master Electrician",
          expiry: new Date("2026-12-31"),
          experience: 5,
        },
      ],
      licenses: [],
      certifications: [],
    },
    security: {
      accessLevel: "WRITE",
      permissions: ["workorders.update", "assets.read"],
    },
    preferences: {
      notifications: {
        email: true,
        sms: true,
        app: true,
        workOrders: true,
        maintenance: true,
        reports: false,
      },
      language: "ar",
      timezone: "Asia/Riyadh",
      theme: "LIGHT",
    },
    workload: {
      maxAssignments: 10,
      currentAssignments: 0,
      available: true,
      location: { city: "Dammam", region: "Eastern Province", radius: 25 },
      workingHours: {
        start: "07:00",
        end: "16:00",
        days: ["monday", "tuesday", "wednesday", "thursday", "sunday"],
        timezone: "Asia/Riyadh",
      },
    },
    performance: {
      rating: 4.7,
      completedJobs: 45,
      ongoingJobs: 2,
      successRate: 98,
      averageResponseTime: 1.5,
      averageResolutionTime: 18,
      customerSatisfaction: 96,
      reviews: [],
    },
    employment: { employeeId: "EMP-TEST-004", benefits: [] },
    compliance: { training: [] },
    status: "ACTIVE",
    tenantId: "test-tenant",
  },
  {
    code: "TEST-TENANT",
    username: "test-tenant",
    email: "tenant@test.fixzit.co",
    password: TEST_PASSWORD,
    orgId: TEST_ORG_ID,
    employeeId: "EMP-TEST-005",
    createdBy: SEED_USER_ID,
    personal: {
      firstName: "Test",
      lastName: "Tenant",
      nationalId: "1000000007",
      dateOfBirth: new Date("1995-09-30"),
      gender: "Male",
      nationality: "SA",
      address: {
        street: "Test St 7",
        city: "Riyadh",
        region: "Riyadh",
        postalCode: "11693",
        country: "SA",
      },
    },
    professional: {
      role: "TENANT",
      title: "Tenant",
      department: "N/A",
      skills: [],
      licenses: [],
      certifications: [],
    },
    security: {
      accessLevel: "READ",
      permissions: ["workorders.create", "workorders.read", "support.read"],
    },
    preferences: {
      notifications: {
        email: true,
        sms: true,
        app: true,
        workOrders: true,
        maintenance: true,
        reports: false,
      },
      language: "ar",
      timezone: "Asia/Riyadh",
      theme: "LIGHT",
    },
    workload: {
      maxAssignments: 0,
      currentAssignments: 0,
      available: false,
      location: { city: "Riyadh", region: "Riyadh", radius: 0 },
      workingHours: {
        start: "00:00",
        end: "23:59",
        days: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ],
        timezone: "Asia/Riyadh",
      },
    },
    performance: { reviews: [] },
    employment: { employeeId: "EMP-TEST-005", benefits: [] },
    compliance: { training: [] },
    status: "ACTIVE",
    tenantId: "test-tenant",
  },
  {
    code: "TEST-VENDOR",
    username: "test-vendor",
    email: "vendor@test.fixzit.co",
    password: TEST_PASSWORD,
    orgId: TEST_ORG_ID,
    employeeId: "EMP-TEST-006",
    createdBy: SEED_USER_ID,
    personal: {
      firstName: "Test",
      lastName: "Vendor",
      nationalId: "1000000008",
      dateOfBirth: new Date("1982-12-05"),
      gender: "Male",
      nationality: "SA",
      address: {
        street: "Test St 8",
        city: "Jeddah",
        region: "Makkah",
        postalCode: "21589",
        country: "SA",
      },
    },
    professional: {
      role: "VENDOR",
      title: "Service Provider",
      department: "External",
      skills: [
        {
          category: "HVAC",
          skill: "AC Installation",
          level: "EXPERT",
          certified: true,
          certification: "HVAC Master",
          expiry: new Date("2026-03-31"),
          experience: 8,
        },
      ],
      licenses: [],
      certifications: [],
    },
    security: {
      accessLevel: "READ",
      permissions: ["marketplace.read", "workorders.read"],
    },
    preferences: {
      notifications: {
        email: true,
        sms: true,
        app: true,
        workOrders: true,
        maintenance: false,
        reports: false,
      },
      language: "ar",
      timezone: "Asia/Riyadh",
      theme: "LIGHT",
    },
    workload: {
      maxAssignments: 15,
      currentAssignments: 0,
      available: true,
      location: { city: "Jeddah", region: "Makkah", radius: 50 },
      workingHours: {
        start: "08:00",
        end: "18:00",
        days: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ],
        timezone: "Asia/Riyadh",
      },
    },
    performance: {
      rating: 4.5,
      completedJobs: 78,
      ongoingJobs: 5,
      successRate: 95,
      averageResponseTime: 3,
      averageResolutionTime: 36,
      customerSatisfaction: 92,
      reviews: [],
    },
    employment: { employeeId: "EMP-TEST-006", benefits: [] },
    compliance: { training: [] },
    status: "ACTIVE",
    tenantId: "test-tenant",
  },
  {
    code: "TEST-OWNER",
    username: "test-owner",
    email: "owner@test.fixzit.co",
    password: TEST_PASSWORD,
    orgId: TEST_ORG_ID,
    employeeId: "EMP-TEST-007",
    createdBy: SEED_USER_ID,
    personal: {
      firstName: "Test",
      lastName: "Owner",
      nationalId: "1000000009",
      dateOfBirth: new Date("1975-06-20"),
      gender: "Male",
      nationality: "SA",
      address: {
        street: "Test St 9",
        city: "Riyadh",
        region: "Riyadh",
        postalCode: "11564",
        country: "SA",
      },
    },
    professional: {
      role: "OWNER",
      title: "Corporate Owner",
      department: "Executive",
      skills: [],
      licenses: [],
      certifications: [],
    },
    security: { accessLevel: "ADMIN", permissions: ["*"] },
    preferences: {
      notifications: {
        email: true,
        sms: false,
        app: true,
        workOrders: true,
        maintenance: true,
        reports: true,
      },
      language: "en",
      timezone: "Asia/Riyadh",
      theme: "LIGHT",
    },
    workload: {
      maxAssignments: 0,
      currentAssignments: 0,
      available: false,
      location: { city: "Riyadh", region: "Riyadh", radius: 0 },
      workingHours: {
        start: "00:00",
        end: "23:59",
        days: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ],
        timezone: "Asia/Riyadh",
      },
    },
    performance: { reviews: [] },
    employment: { employeeId: "EMP-TEST-007", benefits: [] },
    compliance: { training: [] },
    status: "ACTIVE",
    tenantId: "test-tenant",
  },
  {
    code: "TEST-GUEST",
    username: "test-guest",
    email: "guest@test.fixzit.co",
    password: TEST_PASSWORD,
    orgId: TEST_ORG_ID,
    employeeId: "EMP-TEST-008",
    createdBy: SEED_USER_ID,
    personal: {
      firstName: "Test",
      lastName: "Guest",
      nationalId: "1000000010",
      dateOfBirth: new Date("1992-08-15"),
      gender: "Female",
      nationality: "SA",
      address: {
        street: "Test St 10",
        city: "Riyadh",
        region: "Riyadh",
        postalCode: "11564",
        country: "SA",
      },
    },
    professional: {
      role: "VIEWER",
      title: "Guest User",
      department: "N/A",
      skills: [],
      licenses: [],
      certifications: [],
    },
    security: { accessLevel: "READ", permissions: ["support.read"] },
    preferences: {
      notifications: {
        email: false,
        sms: false,
        app: false,
        workOrders: false,
        maintenance: false,
        reports: false,
      },
      language: "en",
      timezone: "Asia/Riyadh",
      theme: "LIGHT",
    },
    workload: {
      maxAssignments: 0,
      currentAssignments: 0,
      available: false,
      location: { city: "Riyadh", region: "Riyadh", radius: 0 },
      workingHours: {
        start: "00:00",
        end: "23:59",
        days: [
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
        ],
        timezone: "Asia/Riyadh",
      },
    },
    performance: { reviews: [] },
    employment: { employeeId: "EMP-TEST-008", benefits: [] },
    compliance: { training: [] },
    status: "ACTIVE",
    tenantId: "test-tenant",
  },
];

const normalizedUsers = testUsers.map((user) => ({
  ...user,
  phone: TEST_PHONE,
  mobile: TEST_PHONE,
  role: user.professional?.role ?? "USER",
}));

async function seedTestUsers() {
  try {
    await db;
    console.log("🧪 Seeding test users...\n");
    let created = 0,
      updated = 0,
      skipped = 0;
    for (const userData of normalizedUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      const hashedPassword = await hashPassword(userData.password);
      const userWithHashedPassword = { ...userData, password: hashedPassword };
      if (existingUser) {
        await User.updateOne(
          { _id: existingUser._id },
          {
            $set: {
              password: hashedPassword,
              status: "ACTIVE",
              username: userData.username,
              role: userData.professional.role,
              "professional.role": userData.professional.role,
              employeeId: userData.employeeId,
              "employment.employeeId": userData.employment.employeeId,
              isSuperAdmin: userData.isSuperAdmin || false,
            },
          },
        );
        console.log(
          `✅ Updated: ${userData.email} (${userData.professional.role})`,
        );
        updated++;
      } else {
        try {
          await User.create(userWithHashedPassword);
          console.log(
            `✅ Created: ${userData.email} (${userData.professional.role})`,
          );
          created++;
        } catch (error: unknown) {
          const duplicateKey =
            typeof error === "object" && error !== null
              ? (error as { code?: number; keyValue?: unknown })
              : undefined;
          if (duplicateKey?.code === 11000) {
            console.log(
              `⏭️  Duplicate: ${userData.email} - ${JSON.stringify(duplicateKey.keyValue)}`,
            );
            skipped++;
          } else {
            const message =
              error instanceof Error ? error.message : String(error);
            console.error(`❌ Error: ${userData.email} - ${message}`);
          }
        }
      }
    }
    console.log(
      `\n📊 Summary: Created ${created}, Updated ${updated}, Skipped ${skipped}, Total ${created + updated + skipped}/8`,
    );
    console.log("\n📝 Test Credentials (password: Test@1234):");
    normalizedUsers.forEach((u) =>
      console.log(`   ${u.professional.role.padEnd(20)} ${u.email}`),
    );
    console.log("\n🎯 Run: pnpm test:e2e --project=setup && pnpm test:e2e");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

seedTestUsers();
