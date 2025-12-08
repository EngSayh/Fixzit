const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'fixzit.co';

// Connect to MongoDB
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/fixzitsouq",
);

// Import models
const User = require("./models/User");
const Property = require("./models/Property");
const WorkOrder = require("./models/WorkOrder");
const Vendor = require("./models/Vendor");
const Invoice = require("./models/Invoice");

async function createTestData() {
  try {
    console.log("🚀 Creating test data...");

    // Create admin user
    const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD;
    if (!DEFAULT_PASSWORD) {
      console.error("❌ DEFAULT_PASSWORD environment variable is required");
      console.error(
        '💡 Set it with: export DEFAULT_PASSWORD="your-secure-password"',
      );
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const admin = await User.findOneAndUpdate(
      { email: `admin@${EMAIL_DOMAIN}` },
      {
        email: `admin@${EMAIL_DOMAIN}`,
        password: hashedPassword,
        name: "Admin User",
        role: "super_admin",
        status: "active",
        isActive: true,
        phoneNumber: "+966501234567",
      },
      { upsert: true, new: true },
    );
    console.log("✅ Admin user created:", admin.email);

    // Create test property
    const property = await Property.findOneAndUpdate(
      { name: "Riyadh Tower A" },
      {
        name: "Riyadh Tower A",
        address: "123 King Fahd Road, Riyadh",
        type: "commercial",
        size: 10000,
        units: 50,
        status: "active",
        tenantId: admin._id,
        organizationId: admin._id,
      },
      { upsert: true, new: true },
    );
    console.log("✅ Test property created:", property.name);

    // Create test work order
    const workOrder = await WorkOrder.findOneAndUpdate(
      { workOrderNumber: "WO-001" },
      {
        workOrderNumber: "WO-001",
        title: "AC Maintenance Required",
        description: "AC unit not cooling properly in Unit 301",
        property: property._id,
        tenantId: admin._id,
        assignedTo: admin._id,
        status: "open",
        priority: "high",
        category: "maintenance",
      },
      { upsert: true, new: true },
    );
    console.log("✅ Test work order created:", workOrder.workOrderNumber);

    // Create test vendor
    const vendor = await Vendor.findOneAndUpdate(
      { name: "Al-Faisal Maintenance Co." },
      {
        name: "Al-Faisal Maintenance Co.",
        contactPerson: "Ahmed Al-Faisal",
        phone: "+966501234568",
        category: "maintenance",
        rating: 4.5,
        status: "active",
        services: ["HVAC", "Plumbing", "Electrical"],
      },
      { upsert: true, new: true },
    );
    console.log("✅ Test vendor created:", vendor.name);

    // Create test invoice
    const invoice = await Invoice.findOneAndUpdate(
      { invoiceNumber: "INV-001" },
      {
        invoiceNumber: "INV-001",
        customer: admin._id,
        vendor: vendor._id,
        items: [
          {
            description: "AC Repair Service",
            quantity: 1,
            unitPrice: 500,
            total: 500,
          },
        ],
        subtotal: 500,
        tax: 75,
        total: 575,
        status: "pending",
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      { upsert: true, new: true },
    );
    console.log("✅ Test invoice created:", invoice.invoiceNumber);

    // Count all collections
    const counts = {
      users: await User.countDocuments(),
      properties: await Property.countDocuments(),
      workOrders: await WorkOrder.countDocuments(),
      vendors: await Vendor.countDocuments(),
      invoices: await Invoice.countDocuments(),
    };

    console.log("\n📊 Database Status:");
    Object.entries(counts).forEach(([collection, count]) => {
      console.log(`✅ ${collection}: ${count} documents`);
    });

    console.log("\n🎯 Test Credentials:");
    console.log(`Email: admin@${EMAIL_DOMAIN}`);
    console.log("Password: [REDACTED - check .env.local]");

    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating test data:", error);
    process.exit(1);
  }
}

createTestData();
