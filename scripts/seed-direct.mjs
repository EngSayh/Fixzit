import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// 🔐 Use configurable email domain for Business.sa rebrand compatibility
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "fixzit.co";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable not set");
  process.exit(1);
}

const SEED_PASSWORD = process.env.SEED_PASSWORD;
if (!SEED_PASSWORD) {
  console.error("❌ SEED_PASSWORD environment variable not set");
  process.exit(1);
}

const UserSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    personal: {
      firstName: String,
      lastName: String,
      nationalId: String,
      dateOfBirth: Date,
      gender: String,
      nationality: String,
      address: {
        street: String,
        city: String,
        region: String,
        postalCode: String,
        country: String,
      },
    },
    professional: {
      role: String,
      title: String,
      department: String,
      skills: [
        {
          category: String,
          skill: String,
          level: String,
          certified: Boolean,
          certification: String,
          expiry: Date,
          experience: Number,
        },
      ],
    },
    security: {
      accessLevel: String,
      permissions: [String],
      mfa: {
        enabled: Boolean,
        type: String,
      },
    },
    preferences: {
      notifications: {
        email: Boolean,
        sms: Boolean,
        app: Boolean,
        workOrders: Boolean,
        maintenance: Boolean,
        reports: Boolean,
      },
      language: String,
      timezone: String,
      theme: String,
    },
    workload: {
      maxAssignments: Number,
      currentAssignments: Number,
      available: Boolean,
      location: {
        city: String,
        region: String,
        radius: Number,
      },
      workingHours: {
        start: String,
        end: String,
        days: [String],
        timezone: String,
      },
    },
    performance: {
      rating: Number,
      completedJobs: Number,
      ongoingJobs: Number,
      successRate: Number,
      averageResponseTime: Number,
      averageResolutionTime: Number,
      customerSatisfaction: Number,
    },
    status: String,
    tenantId: String,
    createdBy: String,
  },
  {
    timestamps: true,
  },
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

const users = [
  {
    code: "USR-001",
    username: "admin",
    email: `admin@${EMAIL_DOMAIN}`,
    password: SEED_PASSWORD,
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
    username: "tenant",
    email: `tenant@${EMAIL_DOMAIN}`,
    password: SEED_PASSWORD,
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
      role: "TENANT",
      title: "Tenant",
      department: "Customer",
      skills: [],
    },
    security: {
      accessLevel: "READ",
      permissions: ["properties:read", "workorders:create", "workorders:read"],
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
      location: {
        city: "Riyadh",
        region: "Riyadh",
        radius: 0,
      },
      workingHours: {
        start: "08:00",
        end: "17:00",
        days: [],
        timezone: "Asia/Riyadh",
      },
    },
    status: "ACTIVE",
    tenantId: "demo-tenant",
    createdBy: "system",
  },
  {
    code: "USR-003",
    username: "vendor",
    email: `vendor@${EMAIL_DOMAIN}`,
    password: SEED_PASSWORD,
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
      role: "VENDOR",
      title: "Service Provider",
      department: "External",
      skills: [],
    },
    security: {
      accessLevel: "WRITE",
      permissions: ["souq:*", "souq:rfq.read", "bids:*"],
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
        workOrders: false,
        maintenance: false,
        reports: true,
      },
      language: "ar",
      timezone: "Asia/Riyadh",
      theme: "LIGHT",
    },
    workload: {
      maxAssignments: 0,
      currentAssignments: 0,
      available: true,
      location: {
        city: "Riyadh",
        region: "Riyadh",
        radius: 50,
      },
      workingHours: {
        start: "08:00",
        end: "18:00",
        days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
        timezone: "Asia/Riyadh",
      },
    },
    status: "ACTIVE",
    tenantId: "demo-tenant",
    createdBy: "system",
  },
];

async function seedUsers() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    console.log("🌱 Seeding users...");

    for (const userData of users) {
      try {
        const existingUser = await User.findOne({ email: userData.email });

        if (!existingUser) {
          const hashedPassword = await bcrypt.hash(userData.password, 10);
          const userWithHashedPassword = {
            ...userData,
            password: hashedPassword,
          };

          await User.create(userWithHashedPassword);
          console.log(
            `✅ Created user: ${userData.email} (Role: ${userData.professional?.role || "N/A"})`,
          );
        } else {
          console.log(`⏭️  User already exists: ${userData.email}`);
        }
      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error);
      }
    }

    console.log("✅ User seeding completed!");
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    process.exit(1);
  }
}

seedUsers().then(() => process.exit(0));
