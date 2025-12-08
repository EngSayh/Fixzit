import { db } from "../lib/mongo";
import { User } from "../server/models/User";
import { hashPassword } from "../lib/auth";
import { getDemoEmail } from "../lib/config/demo-users";

// SEC-051: Use environment variables with local dev fallbacks
const DEMO_SUPERADMIN_PASSWORD = process.env.DEMO_SUPERADMIN_PASSWORD || "admin123";
const DEMO_DEFAULT_PASSWORD = process.env.DEMO_DEFAULT_PASSWORD || "password123";

const initialUsers = [
  {
    code: "USR-001",
    username: "admin",
    email: getDemoEmail("admin"),
    password: DEMO_SUPERADMIN_PASSWORD,
    personal: {
      firstName: "System",
      lastName: "Administrator",
      nationalId: "1234567890",
      dateOfBirth: new Date("1980-01-01"),
      gender: "Male",
      nationality: "SA",
      address: {
        street: "King Fahd Road",
        city: "Riyadh",
        region: "Riyadh",
        postalCode: "11564",
        country: "SA",
      },
    },
    professional: {
      role: "SUPER_ADMIN",
      title: "System Administrator",
      department: "IT",
      skills: [],
    },
    security: {
      accessLevel: "ADMIN",
      permissions: ["*"],
      mfa: {
        enabled: false,
        type: "EMAIL",
      },
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
      maxAssignments: 100,
      currentAssignments: 0,
      available: true,
      location: {
        city: "Riyadh",
        region: "Riyadh",
        radius: 50,
      },
      workingHours: {
        start: "08:00",
        end: "17:00",
        days: ["monday", "tuesday", "wednesday", "thursday", "sunday"],
        timezone: "Asia/Riyadh",
      },
    },
    status: "ACTIVE",
    tenantId: "demo-tenant",
    createdBy: "system",
  },
  {
    code: "USR-002",
    username: "manager",
    email: getDemoEmail("manager"),
    password: DEMO_DEFAULT_PASSWORD,
    personal: {
      firstName: "Ahmed",
      lastName: "Al-Rashid",
      nationalId: "2345678901",
      dateOfBirth: new Date("1985-05-15"),
      gender: "Male",
      nationality: "SA",
      address: {
        street: "Olaya Street",
        city: "Riyadh",
        region: "Riyadh",
        postalCode: "11622",
        country: "SA",
      },
    },
    professional: {
      role: "PROPERTY_MANAGER",
      title: "Property Manager",
      department: "Operations",
      skills: [],
    },
    security: {
      accessLevel: "WRITE",
      permissions: ["properties:*", "tenants:*", "workorders:*"],
      mfa: {
        enabled: false,
        type: "EMAIL",
      },
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
      language: "ar",
      timezone: "Asia/Riyadh",
      theme: "LIGHT",
    },
    workload: {
      maxAssignments: 50,
      currentAssignments: 0,
      available: true,
      location: {
        city: "Riyadh",
        region: "Riyadh",
        radius: 30,
      },
      workingHours: {
        start: "08:00",
        end: "17:00",
        days: ["monday", "tuesday", "wednesday", "thursday", "sunday"],
        timezone: "Asia/Riyadh",
      },
    },
    status: "ACTIVE",
    tenantId: "demo-tenant",
    createdBy: "system",
  },
  {
    code: "USR-003",
    username: "technician",
    email: getDemoEmail("technician"),
    password: DEMO_DEFAULT_PASSWORD,
    personal: {
      firstName: "Mohammed",
      lastName: "Al-Harbi",
      nationalId: "3456789012",
      dateOfBirth: new Date("1990-03-20"),
      gender: "Male",
      nationality: "SA",
      address: {
        street: "King Abdullah Road",
        city: "Riyadh",
        region: "Riyadh",
        postalCode: "11693",
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
          expiry: new Date("2025-12-31"),
          experience: 10,
        },
        {
          category: "HVAC",
          skill: "AC Repair",
          level: "ADVANCED",
          certified: true,
          certification: "HVAC Technician",
          expiry: new Date("2024-06-30"),
          experience: 8,
        },
      ],
    },
    security: {
      accessLevel: "WRITE",
      permissions: ["workorders:update", "assets:read"],
      mfa: {
        enabled: false,
        type: "SMS",
      },
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
      location: {
        city: "Riyadh",
        region: "Riyadh",
        radius: 20,
      },
      workingHours: {
        start: "07:00",
        end: "16:00",
        days: ["monday", "tuesday", "wednesday", "thursday", "sunday"],
        timezone: "Asia/Riyadh",
      },
    },
    performance: {
      rating: 4.5,
      completedJobs: 156,
      ongoingJobs: 3,
      successRate: 96,
      averageResponseTime: 2,
      averageResolutionTime: 24,
      customerSatisfaction: 94,
    },
    status: "ACTIVE",
    tenantId: "demo-tenant",
    createdBy: "system",
  },
];

async function seedUsers() {
  try {
    await db;
    console.log("🌱 Seeding users...");

    for (const userData of initialUsers) {
      const existingUser = await User.findOne({ email: userData.email });

      if (!existingUser) {
        const hashedPassword = await hashPassword(userData.password);
        const userWithHashedPassword = {
          ...userData,
          password: hashedPassword,
        };

        await User.create(userWithHashedPassword);
        console.log(`✅ Created user: ${userData.email}`);
      } else {
        console.log(`⏭️  User already exists: ${userData.email}`);
      }
    }

    console.log("✅ User seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding users:", error);
  }
}

// Run if called directly
if (require.main === module) {
  seedUsers()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default seedUsers;
