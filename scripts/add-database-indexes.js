const mongoose = require("mongoose");
require("dotenv").config();

/**
 * Script to add database indexes for performance optimization
 * Addresses 15 performance issues from audit
 */

async function addDatabaseIndexes() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;

    console.log("\n📊 Adding database indexes...");
    console.log("=====================================");

    // User indexes (STRICT v4.1): all uniques/org-scoped to prevent cross-tenant collisions
    console.log("👤 Adding User indexes...");
    await db
      .collection("users")
      .createIndex({ orgId: 1, email: 1 }, { unique: true, name: "users_orgId_email_unique" });
    await db
      .collection("users")
      .createIndex({ orgId: 1, phone: 1 }, { name: "users_orgId_phone" });
    await db
      .collection("users")
      .createIndex({ orgId: 1, role: 1 }, { name: "users_orgId_role" });
    await db
      .collection("users")
      .createIndex({ orgId: 1, status: 1 }, { name: "users_orgId_status" });
    await db.collection("users").createIndex({ orgId: 1, lastLogin: -1 }, { name: "users_orgId_lastLogin_desc" });
    await db.collection("users").createIndex({ orgId: 1, createdAt: -1 }, { name: "users_orgId_createdAt_desc" });
    await db
      .collection("users")
      .createIndex({ orgId: 1, "deputy.user": 1, "deputy.isActive": 1 }, { name: "users_orgId_deputy_user_active" });
    console.log("✅ User indexes created");

    // Property indexes
    console.log("🏢 Adding Property indexes...");
    await db
      .collection("properties")
      .createIndex({ orgId: 1, ownerId: 1 }, { name: "properties_orgId_ownerId" });
    await db
      .collection("properties")
      .createIndex({ orgId: 1, propertyCode: 1 }, { unique: true, name: "properties_orgId_code_unique" });
    await db
      .collection("properties")
      .createIndex({ orgId: 1, status: 1 }, { name: "properties_orgId_status" });
    await db.collection("properties").createIndex({ orgId: 1, type: 1 }, { name: "properties_orgId_type" });
    await db
      .collection("properties")
      .createIndex({ orgId: 1, "address.city": 1, "address.district": 1 }, { name: "properties_orgId_city_district" });
    await db.collection("properties").createIndex({ coordinates: "2dsphere" });
    await db.collection("properties").createIndex({ orgId: 1, createdAt: -1 }, { name: "properties_orgId_createdAt_desc" });
    await db
      .collection("properties")
      .createIndex({ orgId: 1, "deputies.user": 1, "deputies.isActive": 1 }, { name: "properties_orgId_deputies_user_active" });
    console.log("✅ Property indexes created");

    // WorkOrder indexes
    console.log("🔧 Adding WorkOrder indexes...");
    await db
      .collection("workorders")
      .createIndex({ orgId: 1, status: 1 }, { name: "workorders_orgId_status" });
    await db
      .collection("workorders")
      .createIndex({ orgId: 1, workOrderNumber: 1 }, { unique: true, name: "workorders_orgId_number_unique" });
    await db
      .collection("workorders")
      .createIndex({ orgId: 1, propertyId: 1 }, { name: "workorders_orgId_propertyId" });
    await db
      .collection("workorders")
      .createIndex({ orgId: 1, technicianId: 1, status: 1 }, { name: "workorders_orgId_technician_status" });
    await db
      .collection("workorders")
      .createIndex({ orgId: 1, priority: 1, status: 1 }, { name: "workorders_orgId_priority_status" });
    await db.collection("workorders").createIndex({ orgId: 1, createdAt: -1 }, { name: "workorders_orgId_createdAt_desc" });
    await db.collection("workorders").createIndex({ orgId: 1, dueDate: 1 }, { name: "workorders_orgId_dueDate" });
    await db
      .collection("workorders")
      .createIndex({ orgId: 1, "sla.deadline": 1, status: 1 }, { name: "workorders_orgId_sla_deadline_status" });
    await db.collection("workorders").createIndex({ orgId: 1, category: 1, status: 1 }, { name: "workorders_orgId_category_status" });
    console.log("✅ WorkOrder indexes created");

    // Contract indexes
    console.log("📄 Adding Contract indexes...");
    await db
      .collection("contracts")
      .createIndex({ orgId: 1, propertyId: 1 }, { name: "contracts_orgId_propertyId" });
    await db
      .collection("contracts")
      .createIndex({ orgId: 1 }, { name: "contracts_orgId" });
    await db
      .collection("contracts")
      .createIndex({ orgId: 1, contractNumber: 1 }, { unique: true, name: "contracts_orgId_number_unique" });
    await db
      .collection("contracts")
      .createIndex({ orgId: 1, status: 1 }, { name: "contracts_orgId_status" });
    await db.collection("contracts").createIndex({ orgId: 1, startDate: 1, endDate: 1 }, { name: "contracts_orgId_start_end" });
    await db.collection("contracts").createIndex({ orgId: 1, createdAt: -1 }, { name: "contracts_orgId_createdAt_desc" });
    console.log("✅ Contract indexes created");

    // Invoice indexes
    console.log("💰 Adding Invoice indexes...");
    await db.collection("invoices").createIndex({ orgId: 1, status: 1 }, { name: "invoices_orgId_status" });
    await db
      .collection("invoices")
      .createIndex({ orgId: 1, invoiceNumber: 1 }, { unique: true, name: "invoices_orgId_number_unique" });
    await db
      .collection("invoices")
      .createIndex({ orgId: 1, propertyId: 1 }, { name: "invoices_orgId_propertyId" });
    await db
      .collection("invoices")
      .createIndex({ orgId: 1 }, { name: "invoices_orgId" });
    await db.collection("invoices").createIndex({ orgId: 1, dueDate: 1, status: 1 }, { name: "invoices_orgId_dueDate_status" });
    await db.collection("invoices").createIndex({ orgId: 1, createdAt: -1 }, { name: "invoices_orgId_createdAt_desc" });
    await db
      .collection("invoices")
      .createIndex({ orgId: 1, "payment.status": 1, "payment.method": 1 }, { name: "invoices_orgId_payment_status_method" });
    console.log("✅ Invoice indexes created");

    // Payment indexes
    console.log("💳 Adding Payment indexes...");
    await db.collection("payments").createIndex({ orgId: 1, status: 1 }, { name: "payments_orgId_status" });
    await db
      .collection("payments")
      .createIndex({ orgId: 1, propertyId: 1 }, { name: "payments_orgId_propertyId" });
    await db
      .collection("payments")
      .createIndex({ orgId: 1, invoiceId: 1 }, { name: "payments_orgId_invoiceId" });
    await db.collection("payments").createIndex({ orgId: 1, paymentDate: -1 }, { name: "payments_orgId_paymentDate_desc" });
    await db.collection("payments").createIndex({ orgId: 1, method: 1, status: 1 }, { name: "payments_orgId_method_status" });
    await db.collection("payments").createIndex({ orgId: 1, createdAt: -1 }, { name: "payments_orgId_createdAt_desc" });
    console.log("✅ Payment indexes created");

    // Vendor indexes (for marketplace)
    console.log("🏪 Adding Vendor indexes...");
    await db.collection("vendors").createIndex({ orgId: 1, status: 1 }, { name: "vendors_orgId_status" });
    await db
      .collection("vendors")
      .createIndex({ orgId: 1, vendorCode: 1 }, { unique: true, name: "vendors_orgId_code_unique" });
    await db
      .collection("vendors")
      .createIndex({ orgId: 1, category: 1 }, { name: "vendors_orgId_category" });
    await db
      .collection("vendors")
      .createIndex({ orgId: 1, "location.city": 1, "location.district": 1 }, { name: "vendors_orgId_city_district" });
    await db.collection("vendors").createIndex({ orgId: 1, rating: -1, status: 1 }, { name: "vendors_orgId_rating_status" });
    await db.collection("vendors").createIndex({ orgId: 1, createdAt: -1 }, { name: "vendors_orgId_createdAt_desc" });
    console.log("✅ Vendor indexes created");

    // RFQ indexes
    console.log("📋 Adding RFQ indexes...");
    await db.collection("rfqs").createIndex({ orgId: 1, status: 1 }, { name: "rfqs_orgId_status" });
    await db.collection("rfqs").createIndex({ orgId: 1, rfqNumber: 1 }, { unique: true, name: "rfqs_orgId_number_unique" });
    await db.collection("rfqs").createIndex({ orgId: 1, category: 1 }, { name: "rfqs_orgId_category" });
    await db.collection("rfqs").createIndex({ orgId: 1, propertyId: 1 }, { name: "rfqs_orgId_propertyId" });
    await db.collection("rfqs").createIndex({ orgId: 1, deadline: 1, status: 1 }, { name: "rfqs_orgId_deadline_status" });
    await db.collection("rfqs").createIndex({ orgId: 1, createdAt: -1 }, { name: "rfqs_orgId_createdAt_desc" });
    console.log("✅ RFQ indexes created");

    // Organization indexes
    console.log("🏛️ Adding Organization indexes...");
    await db
      .collection("organizations")
      .createIndex({ organizationCode: 1 }, { unique: true });
    await db.collection("organizations").createIndex({ status: 1, type: 1 });
    await db.collection("organizations").createIndex({ createdAt: -1 });
    console.log("✅ Organization indexes created");

    // Notification indexes
    console.log("🔔 Adding Notification indexes...");
    await db
      .collection("notifications")
      .createIndex({ orgId: 1, userId: 1, read: 1 }, { name: "notifications_orgId_userId_read" });
    await db
      .collection("notifications")
      .createIndex({ orgId: 1, type: 1, status: 1 }, { name: "notifications_orgId_type_status" });
    await db.collection("notifications").createIndex({ orgId: 1, createdAt: -1 }, { name: "notifications_orgId_createdAt_desc" });
    await db
      .collection("notifications")
      .createIndex({ orgId: 1, scheduledFor: 1, status: 1 }, { name: "notifications_orgId_scheduled_status" });
    console.log("✅ Notification indexes created");

    // Audit log indexes
    console.log("📝 Adding Audit log indexes...");
    await db
      .collection("auditlogs")
      .createIndex({ orgId: 1, action: 1 }, { name: "auditlogs_orgId_action" });
    await db
      .collection("auditlogs")
      .createIndex({ orgId: 1, userId: 1 }, { name: "auditlogs_orgId_userId" });
    await db.collection("auditlogs").createIndex({ orgId: 1, timestamp: -1 }, { name: "auditlogs_orgId_timestamp_desc" });
    await db
      .collection("auditlogs")
      .createIndex({ orgId: 1, resourceType: 1, resourceId: 1 }, { name: "auditlogs_orgId_resource" });
    console.log("✅ Audit log indexes created");

    // Help/Knowledge Center indexes
    console.log("📚 Adding Help/Knowledge Center indexes...");
    await db
      .collection("helparticles")
      .createIndex({ orgId: 1, slug: 1 }, { unique: true, name: "helparticles_orgId_slug_unique" });
    await db
      .collection("helparticles")
      .createIndex({ status: 1, updatedAt: -1 });
    await db
      .collection("helparticles")
      .createIndex({ title: "text", content: "text", tags: "text" });
    await db.collection("helparticles").createIndex({ orgId: 1, status: 1 }, { name: "helparticles_orgId_status" });
    await db
      .collection("helparticles")
      .createIndex({ orgId: 1, category: 1, status: 1 }, { name: "helparticles_orgId_category_status" });
    console.log("✅ Help/Knowledge Center indexes created");

    // KB Embeddings indexes
    console.log("🧠 Adding KB embeddings indexes...");
    try {
      // Prefer tenant-scoped uniqueness to allow same articleId/chunkId across tenants
      await db
        .collection("kb_embeddings")
        .createIndex(
          { orgId: 1, articleId: 1, chunkId: 1 },
          { unique: true, name: "org_article_chunk_unique" },
        );
    } catch (e) {
      console.warn(
        "Index create warning (tenant_article_chunk_unique):",
        e?.message || e,
      );
    }
    await db.collection("kb_embeddings").createIndex({ route: 1, lang: 1 });
    await db.collection("kb_embeddings").createIndex({ roleScopes: 1 });
    console.log("✅ KB embeddings indexes created");

    console.log("\n=====================================");
    console.log("✅ ALL DATABASE INDEXES CREATED SUCCESSFULLY!");
    console.log("=====================================");
    console.log("📈 Performance improvements applied:");
    console.log("   • Faster user lookups and authentication");
    console.log("   • Optimized property and work order queries");
    console.log("   • Improved financial record performance");
    console.log("   • Enhanced marketplace search capabilities");
    console.log("   • Better audit trail performance");
  } catch (error) {
    console.error("❌ Error creating database indexes:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔚 Disconnected from MongoDB");
    process.exit(0);
  }
}

// Execute the script
addDatabaseIndexes();
