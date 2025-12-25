const mongoose = require("mongoose");
require("dotenv").config();

// 🔐 Use configurable email domain for Business.sa rebrand compatibility
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "fixzit.co";

// Import models
const User = require("../models/User");
const Organization = require("../models/Organization");
// Legacy Tenant kept only for backward compatibility; new data should use orgId
const Tenant = require("../models/Tenant");
const Property = require("../models/Property");
const WorkOrder = require("../models/WorkOrder");
const Vendor = require("../models/Vendor");
const Subscription = require("../models/Subscription");
const PropertyOwner = require("../models/PropertyOwner");

// Safety: block accidental production/CI seeding and require explicit opt-in
const isProdLike =
  process.env.NODE_ENV === "production" || process.env.CI === "true";
if (isProdLike) {
  console.log(
    "❌ SEEDING BLOCKED: seedData.js cannot run in production/CI environments",
  );
  process.exit(1);
}
if (process.env.ALLOW_SEED !== "1") {
  console.log(
    "❌ ALLOW_SEED=1 is required to run seedData.js (prevents accidental prod writes)",
  );
  process.exit(1);
}

const DEFAULT_PASSWORD =
  process.env.SEED_PASSWORD ||
  process.env.TEST_USER_PASSWORD ||
  process.env.DEMO_DEFAULT_PASSWORD;
if (!DEFAULT_PASSWORD) {
  throw new Error(
    "SEED_PASSWORD or TEST_USER_PASSWORD (or DEMO_DEFAULT_PASSWORD) is required for seedData.js",
  );
}

const seedDatabase = async () => {
  try {
    console.log("🌱 Starting database seeding...");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // Clear existing data (for demo purposes)
    await Promise.all([
      User.deleteMany({}),
      Organization.deleteMany({}),
      Tenant.deleteMany({}),
      Property.deleteMany({}),
      WorkOrder.deleteMany({}),
      Vendor.deleteMany({}),
      Subscription.deleteMany({}),
      PropertyOwner.deleteMany({}),
    ]);
    console.log("🧹 Cleared existing data");

    // Create Organizations (TENANT model kept only for legacy compatibility)
    const organizations = [];
    for (let i = 1; i <= 3; i++) {
      const org = await Organization.create({
        name: `Organization ${i}`,
        code: `ORG${String(i).padStart(3, "0")}`,
        domain: `org${i}.fixzit.co`,
        settings: {
          language: "en",
          currency: "SAR",
          timezone: "Asia/Riyadh",
        },
      });

      // Legacy tenant record for backward compatibility; prefer orgId moving forward
      const tenant = await Tenant.create({
        name: `Tenant ${i}`,
        orgId: org._id,
        isActive: true,
      });

      organizations.push({ org, tenant });
      console.log(`📊 Created Organization ${i} (legacy tenant record kept)`);
    }

    // Create deterministic admin account first
    const adminOrg = organizations[0]; // Use first organization for admin
    const adminUser = await User.create({
      name: "System Administrator",
      email: `admin@${EMAIL_DOMAIN}`,
      password: DEFAULT_PASSWORD, // Model pre-save hook will hash it
      role: "SUPER_ADMIN",
      orgId: adminOrg.org._id,
      status: "active",
    });
    console.log(`🔑 Created deterministic admin account: admin@${EMAIL_DOMAIN}`);

    // Create Users
    const users = [
      { user: adminUser, org: adminOrg.org, tenant: adminOrg.tenant },
    ];
    const roles = ["SUPER_ADMIN", "ADMIN", "MANAGER", "TECHNICIAN", "OWNER"];

    for (let orgIndex = 0; orgIndex < organizations.length; orgIndex++) {
      const { org, tenant } = organizations[orgIndex];

      for (let i = 0; i < 5; i++) {
        // Skip super_admin for first org since we already created the deterministic admin
        if (orgIndex === 0 && i === 0) continue;

        const user = await User.create({
          name: `User ${orgIndex + 1}-${i + 1}`,
          email: `user${orgIndex + 1}${i + 1}@${EMAIL_DOMAIN}`,
          password: DEFAULT_PASSWORD, // Model pre-save hook will hash
          role: roles[i],
          orgId: org._id,
          status: "active",
        });

        users.push({ user, org, tenant });
      }
    }
    console.log(`👥 Created ${users.length} users across all organizations`);

    // Create Properties
    const properties = [];
    const propertyTypes = ["residential", "commercial", "mixed"];

    for (let orgIndex = 0; orgIndex < organizations.length; orgIndex++) {
      const { org, tenant } = organizations[orgIndex];

      for (let i = 1; i <= 10; i++) {
        // Find an owner user for this organization
        const ownerUser = users.find(
          (u) => u.org._id.equals(org._id) && u.user.role === "OWNER",
        );

        // Generate unique code manually to avoid pre-save hook conflicts
        const typePrefix = propertyTypes[i % 3].substring(0, 3).toUpperCase();
        const uniqueCode = `${typePrefix}-${orgIndex + 1}${String(i).padStart(3, "0")}`;

        const property = await Property.create({
          name: `Property ${orgIndex + 1}-${i}`,
          code: uniqueCode,
          type: propertyTypes[i % 3],
          address: {
            street: `${i * 100} King Fahd Road`,
            city: ["Riyadh", "Jeddah", "Dammam"][orgIndex],
            district: `District ${i}`,
            country: "Saudi Arabia",
            postalCode: `${11000 + i}`,
          },
          details: {
            totalArea: 1000 + i * 100,
            buildingAge: 5 + (i % 10),
            floors: 1 + (i % 5),
            units: 10 + i * 2,
          },
          owner: ownerUser
            ? ownerUser.user._id
            : users.find((u) => u.org._id.equals(org._id))?.user._id,
          orgId: org._id,
          status: "active",
        });

        properties.push({ property, org, tenant });
      }
    }
    console.log(`🏢 Created ${properties.length} properties`);

    // Create Property Owners
    for (let orgIndex = 0; orgIndex < organizations.length; orgIndex++) {
      const { org, tenant: _tenant } = organizations[orgIndex];
      const ownerUser = users.find(
        (u) => u.org._id.equals(org._id) && u.user.role === "OWNER",
      );
      const orgProperties = properties.filter((p) => p.org._id.equals(org._id));

      if (ownerUser && orgProperties.length > 0) {
        await PropertyOwner.create({
          user: ownerUser.user._id,
          properties: orgProperties.slice(0, 5).map((p) => p.property._id),
          orgId: org._id,
        });
      }
    }
    console.log("🏠 Created property owners");

    // Create Work Orders
    const workOrders = [];
    const priorities = ["low", "medium", "high", "urgent"];
    const statuses = ["pending", "in_progress", "completed", "cancelled"];
    const categories = [
      "maintenance",
      "repair",
      "inspection",
      "cleaning",
      "emergency",
    ];

    for (let i = 1; i <= 100; i++) {
      const orgIndex = i % organizations.length;
      const { org, tenant: _tenant } = organizations[orgIndex];
      const orgProperties = properties.filter((p) => p.org._id.equals(org._id));

      if (orgProperties.length > 0) {
        const workOrder = await WorkOrder.create({
          orderNumber: `WO-${new Date().getFullYear()}-${String(i).padStart(5, "0")}`,
          title: `${categories[i % 5]} Issue ${i}`,
          description: `Detailed description for work order ${i}. This requires attention.`,
          category: categories[i % 5],
          priority: priorities[i % 4],
          status: statuses[i % 4],
          property: orgProperties[i % orgProperties.length].property._id,
          requestedBy: users.find((u) => u.org._id.equals(org._id))?.user._id,
          estimatedCost: 100 + i * 50,
          actualCost: i % 4 === 3 ? 100 + i * 45 : null, // Only for completed orders
          orgId: org._id,
          createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Spread over last 100 days
        });

        workOrders.push(workOrder);
      }
    }
    console.log(`🔧 Created ${workOrders.length} work orders`);

    // Create Vendors
    const vendors = [];
    const serviceCategories = [
      ["plumbing", "water_leak_repair"],
      ["electrical", "wiring_installation"],
      ["hvac", "ac_maintenance"],
      ["cleaning", "deep_cleaning"],
      ["maintenance", "general_maintenance"],
    ];

    for (let orgIndex = 0; orgIndex < organizations.length; orgIndex++) {
      const { org, tenant: _tenant2 } = organizations[orgIndex];

      for (let i = 1; i <= 8; i++) {
        const serviceSet = serviceCategories[i % serviceCategories.length];

        const vendor = await Vendor.create({
          companyName: `${serviceSet[0].toUpperCase()} Solutions ${orgIndex + 1}-${i}`,
          contactPerson: `Contact Person ${i}`,
          email: `vendor${orgIndex + 1}${i}@example.com`,
          phone: `+966-50-${String(i).padStart(3, "0")}-${String(orgIndex + 1).padStart(4, "0")}`,
          vatNumber: `3${String(orgIndex * 10 + i).padStart(14, "0")}`,
          services: serviceSet,
          address: {
            street: `${i} Business District`,
            city: ["Riyadh", "Jeddah", "Dammam"][orgIndex],
            country: "Saudi Arabia",
          },
          rating: 3.5 + (i % 3),
          status: ["pending", "approved", "rejected"][i % 3],
          orgId: org._id,
        });

        vendors.push(vendor);
      }
    }
    console.log(`🏪 Created ${vendors.length} vendors`);

    // Create Subscriptions
    const plans = ["basic", "standard", "pro", "enterprise"];
    for (let orgIndex = 0; orgIndex < organizations.length; orgIndex++) {
      const { org } = organizations[orgIndex];
      const plan = plans[orgIndex % plans.length];

      await Subscription.create({
        orgId: org._id,
        plan,
        seats: { purchased: 10 + orgIndex * 5, used: 3 + orgIndex },
        billing: {
          cycle: orgIndex % 2 === 0 ? "monthly" : "annual",
          amount: { basic: 99, standard: 199, pro: 399, enterprise: 799 }[plan],
          currency: "SAR",
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          paymentMethod: "card",
        },
        status: "active",
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        features: {
          maxProperties:
            plan === "enterprise"
              ? -1
              : { basic: 10, standard: 50, pro: 200 }[plan],
          maxUsers:
            plan === "enterprise"
              ? -1
              : { basic: 5, standard: 15, pro: 50 }[plan],
          maxWorkOrders:
            plan === "enterprise"
              ? -1
              : { basic: 100, standard: 500, pro: 2000 }[plan],
          maxStorage:
            plan === "enterprise"
              ? -1
              : { basic: 1000, standard: 5000, pro: 20000 }[plan],
          zatcaCompliance: ["standard", "pro", "enterprise"].includes(plan),
          multiTenant: ["pro", "enterprise"].includes(plan),
          apiAccess: ["standard", "pro", "enterprise"].includes(plan),
          customBranding: ["pro", "enterprise"].includes(plan),
        },
        usage: {
          properties: properties.filter((p) => p.org._id.equals(org._id))
            .length,
          users: users.filter((u) => u.org._id.equals(org._id)).length,
          workOrders: workOrders.filter((w) => w.orgId.equals(org._id))
            .length,
          storage: Math.floor(Math.random() * 1000),
        },
      });
    }
    console.log("💳 Created subscriptions for all organizations");

    // Summary
    console.log("\n🎉 Database seeding completed successfully!");
    console.log("📊 Summary:");
    console.log(`   • ${organizations.length} Organizations & Tenants`);
    console.log(`   • ${users.length} Users (all roles)`);
    console.log(`   • ${properties.length} Properties`);
    console.log(`   • ${workOrders.length} Work Orders`);
    console.log(`   • ${vendors.length} Vendors`);
    console.log(`   • ${organizations.length} Subscriptions`);
    console.log("\n✨ System ready for testing!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  }
};

// Run seeding if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
