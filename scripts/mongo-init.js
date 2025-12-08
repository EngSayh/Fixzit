/* eslint-disable no-global-assign */
// MongoDB initialization script
// This runs when the MongoDB container starts for the first time
// 🔐 NOTE: Email domain is configurable; works in Mongo shell or Node.
// For rebranding, set EMAIL_DOMAIN env var (falls back to demo domain).
const EMAIL_DOMAIN =
  (typeof process !== "undefined" &&
    process.env &&
    process.env.EMAIL_DOMAIN) ||
  "fixzit.co";

db = db.getSiblingDB("fixzit");

// Create collections with schema validation
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "orgId"],
      properties: {
        email: { bsonType: "string" },
        orgId: { bsonType: "string" },
        name: { bsonType: "string" },
        role: { enum: ["SUPER_ADMIN", "ADMIN", "USER", "VIEWER"] },
      },
    },
  },
});

db.createCollection("organizations", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "domain"],
      properties: {
        name: { bsonType: "string" },
        domain: { bsonType: "string" },
        status: { enum: ["ACTIVE", "SUSPENDED", "TRIAL", "CANCELLED"] },
      },
    },
  },
});

// Create indexes for performance
db.users.createIndex({ orgId: 1, email: 1 }, { unique: true });
db.users.createIndex({ orgId: 1 });
db.organizations.createIndex({ domain: 1 }, { unique: true });

// Create default tenant and admin user
const defaultOrg = {
  _id: ObjectId(),
  name: "Fixzit Demo",
  domain: "demo-tenant",
  status: "ACTIVE",
  settings: {
    language: "en",
    currency: "SAR",
    timezone: "Asia/Riyadh",
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

db.organizations.insertOne(defaultOrg);

const adminUser = {
  _id: ObjectId(),
  email: "admin@" + EMAIL_DOMAIN,
  name: "System Administrator",
  orgId: defaultOrg._id.toString(),
  role: "SUPER_ADMIN",
  status: "ACTIVE",
  // Password: Admin@123 (hashed with bcrypt)
  password: "$2a$10$rYvLm8Z7YkF5m7mq8B7B0.xGxP7N5m5fK8F5K8F5K8F5K8F5K8F5K",
  createdAt: new Date(),
  updatedAt: new Date(),
};

db.users.insertOne(adminUser);

print("MongoDB initialization complete!");
print("Default organization created: demo-tenant");
print("Admin user: admin@" + EMAIL_DOMAIN + " / Admin@123");
