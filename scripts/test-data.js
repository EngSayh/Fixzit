const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// 🔐 Use configurable email domain for Business.sa rebrand compatibility
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "fixzit.co";

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/fixzitsouq", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Import models
const User = require("./models/User");
const Property = require("./models/Property");
const WorkOrder = require("./models/WorkOrder");

async function createTestData() {
  try {
    // Create admin user
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const adminEmail = `admin@${EMAIL_DOMAIN}`;
    const admin = await User.findOneAndUpdate(
      { email: adminEmail },
      {
        email: adminEmail,
        password: hashedPassword,
        name: "Admin User",
        role: "super_admin",
        status: "active",
        orgId: undefined, // set below once _id exists
      },
      { upsert: true, new: true },
    );
    if (!admin.orgId) {
      admin.orgId = admin._id;
      await admin.save();
    }
    console.log("✅ Admin user created:", admin.email);

    // Create test property
    const property = await Property.findOneAndUpdate(
      { name: "Test Building A" },
      {
        name: "Test Building A",
        address: "123 Main St, Riyadh",
        type: "commercial",
        size: 5000,
        units: 20,
        orgId: admin._id,
        status: "active",
      },
      { upsert: true, new: true },
    );
    console.log("✅ Test property created:", property.name);

    // Create test work order
    const workOrder = await WorkOrder.findOneAndUpdate(
      { workOrderNumber: "WO-001" },
      {
        workOrderNumber: "WO-001",
        title: "Fix AC Unit",
        description: "AC not cooling properly",
        property: property._id,
        orgId: admin._id,
        status: "open",
        priority: "high",
        category: "maintenance",
      },
      { upsert: true, new: true },
    );
    console.log("✅ Test work order created:", workOrder.workOrderNumber);

    // Count totals
    const userCount = await User.countDocuments();
    const propertyCount = await Property.countDocuments();
    const workOrderCount = await WorkOrder.countDocuments();

    console.log("\n📊 Database Status:");
    console.log(`- Users: ${userCount}`);
    console.log(`- Properties: ${propertyCount}`);
    console.log(`- Work Orders: ${workOrderCount}`);

    process.exit(0);
  } catch (error) {
    console.error("Error creating test data:", error);
    process.exit(1);
  }
}

createTestData();
