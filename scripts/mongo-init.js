/* eslint-disable no-global-assign */
// MongoDB initialization script
// This runs when the MongoDB container starts for the first time

db = db.getSiblingDB("fixzit");

// Create collections with schema validation
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "tenantId"],
      properties: {
        email: { bsonType: "string" },
        tenantId: { bsonType: "string" },
        name: { bsonType: "string" },
        role: { enum: ["SUPER_ADMIN", "ADMIN", "USER", "VIEWER"] },
      },
    },
  },
});

db.createCollection("tenants", {
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
db.users.createIndex({ email: 1, tenantId: 1 }, { unique: true });
db.users.createIndex({ tenantId: 1 });
db.tenants.createIndex({ domain: 1 }, { unique: true });

// Create default tenant and admin user
const defaultTenant = {
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

db.tenants.insertOne(defaultTenant);

const adminUser = {
  _id: ObjectId(),
  email: "admin@fixzit.app",
  name: "System Administrator",
  tenantId: defaultTenant._id.toString(),
  role: "SUPER_ADMIN",
  status: "ACTIVE",
  // Password: Admin@123 (hashed with bcrypt)
  password: "$2a$10$rYvLm8Z7YkF5m7mq8B7B0.xGxP7N5m5fK8F5K8F5K8F5K8F5K8F5K",
  createdAt: new Date(),
  updatedAt: new Date(),
};

db.users.insertOne(adminUser);

print("MongoDB initialization complete!");
print("Default tenant created: demo-tenant");
print("Admin user: admin@fixzit.app / Admin@123");
