const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Script to add database indexes for performance optimization
 * Addresses 15 performance issues from audit
 */

async function addDatabaseIndexes() {
  try {

    await mongoose.connect(process.env.MONGODB_URI);

    const db = mongoose.connection.db;

    // User indexes

    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ phone: 1 });
    await db.collection('users').createIndex({ organization: 1, role: 1 });
    await db.collection('users').createIndex({ organization: 1, status: 1 });
    await db.collection('users').createIndex({ lastLogin: -1 });
    await db.collection('users').createIndex({ createdAt: -1 });
    await db.collection('users').createIndex({ 'deputy.user': 1, 'deputy.isActive': 1 });

    // Property indexes

    await db.collection('properties').createIndex({ organization: 1, ownerId: 1 });
    await db.collection('properties').createIndex({ propertyCode: 1 }, { unique: true });
    await db.collection('properties').createIndex({ organization: 1, status: 1 });
    await db.collection('properties').createIndex({ organization: 1, type: 1 });
    await db.collection('properties').createIndex({ 'address.city': 1, 'address.district': 1 });
    await db.collection('properties').createIndex({ 'coordinates': '2dsphere' });
    await db.collection('properties').createIndex({ createdAt: -1 });
    await db.collection('properties').createIndex({ 'deputies.user': 1, 'deputies.isActive': 1 });

    // WorkOrder indexes

    await db.collection('workorders').createIndex({ organization: 1, status: 1 });
    await db.collection('workorders').createIndex({ workOrderNumber: 1 }, { unique: true });
    await db.collection('workorders').createIndex({ organization: 1, propertyId: 1 });
    await db.collection('workorders').createIndex({ organization: 1, technicianId: 1, status: 1 });
    await db.collection('workorders').createIndex({ organization: 1, priority: 1, status: 1 });
    await db.collection('workorders').createIndex({ createdAt: -1 });
    await db.collection('workorders').createIndex({ dueDate: 1 });
    await db.collection('workorders').createIndex({ 'sla.deadline': 1, status: 1 });
    await db.collection('workorders').createIndex({ category: 1, status: 1 });

    // Contract indexes

    await db.collection('contracts').createIndex({ organization: 1, propertyId: 1 });
    await db.collection('contracts').createIndex({ organization: 1, tenantId: 1 });
    await db.collection('contracts').createIndex({ contractNumber: 1 }, { unique: true });
    await db.collection('contracts').createIndex({ organization: 1, status: 1 });
    await db.collection('contracts').createIndex({ startDate: 1, endDate: 1 });
    await db.collection('contracts').createIndex({ createdAt: -1 });

    // Invoice indexes

    await db.collection('invoices').createIndex({ organization: 1, status: 1 });
    await db.collection('invoices').createIndex({ invoiceNumber: 1 }, { unique: true });
    await db.collection('invoices').createIndex({ organization: 1, propertyId: 1 });
    await db.collection('invoices').createIndex({ organization: 1, tenantId: 1 });
    await db.collection('invoices').createIndex({ dueDate: 1, status: 1 });
    await db.collection('invoices').createIndex({ createdAt: -1 });
    await db.collection('invoices').createIndex({ 'payment.status': 1, 'payment.method': 1 });

    // Payment indexes

    await db.collection('payments').createIndex({ organization: 1, status: 1 });
    await db.collection('payments').createIndex({ organization: 1, propertyId: 1 });
    await db.collection('payments').createIndex({ organization: 1, invoiceId: 1 });
    await db.collection('payments').createIndex({ paymentDate: -1 });
    await db.collection('payments').createIndex({ method: 1, status: 1 });
    await db.collection('payments').createIndex({ createdAt: -1 });

    // Vendor indexes (for marketplace)

    await db.collection('vendors').createIndex({ organization: 1, status: 1 });
    await db.collection('vendors').createIndex({ vendorCode: 1 }, { unique: true });
    await db.collection('vendors').createIndex({ organization: 1, category: 1 });
    await db.collection('vendors').createIndex({ 'location.city': 1, 'location.district': 1 });
    await db.collection('vendors').createIndex({ rating: -1, status: 1 });
    await db.collection('vendors').createIndex({ createdAt: -1 });

    // RFQ indexes

    await db.collection('rfqs').createIndex({ organization: 1, status: 1 });
    await db.collection('rfqs').createIndex({ rfqNumber: 1 }, { unique: true });
    await db.collection('rfqs').createIndex({ organization: 1, category: 1 });
    await db.collection('rfqs').createIndex({ organization: 1, propertyId: 1 });
    await db.collection('rfqs').createIndex({ deadline: 1, status: 1 });
    await db.collection('rfqs').createIndex({ createdAt: -1 });

    // Organization indexes

    await db.collection('organizations').createIndex({ organizationCode: 1 }, { unique: true });
    await db.collection('organizations').createIndex({ status: 1, type: 1 });
    await db.collection('organizations').createIndex({ createdAt: -1 });

    // Notification indexes

    await db.collection('notifications').createIndex({ organization: 1, userId: 1, read: 1 });
    await db.collection('notifications').createIndex({ organization: 1, type: 1, status: 1 });
    await db.collection('notifications').createIndex({ createdAt: -1 });
    await db.collection('notifications').createIndex({ scheduledFor: 1, status: 1 });

    // Audit log indexes

    await db.collection('auditlogs').createIndex({ organization: 1, action: 1 });
    await db.collection('auditlogs').createIndex({ organization: 1, userId: 1 });
    await db.collection('auditlogs').createIndex({ timestamp: -1 });
    await db.collection('auditlogs').createIndex({ resourceType: 1, resourceId: 1 });

    // Help/Knowledge Center indexes

    await db.collection('helparticles').createIndex({ slug: 1 }, { unique: true });
    await db.collection('helparticles').createIndex({ status: 1, updatedAt: -1 });
    await db.collection('helparticles').createIndex({ title: 'text', content: 'text', tags: 'text' });
    await db.collection('helparticles').createIndex({ tenantId: 1, status: 1 });
    await db.collection('helparticles').createIndex({ tenantId: 1, category: 1, status: 1 });

    // KB Embeddings indexes

    try {
      // Prefer tenant-scoped uniqueness to allow same articleId/chunkId across tenants
      await db.collection('kb_embeddings').createIndex({ tenantId: 1, articleId: 1, chunkId: 1 }, { unique: true, name: 'tenant_article_chunk_unique' });
    } catch (e) {:', e?.message || e);
    }
    await db.collection('kb_embeddings').createIndex({ route: 1, lang: 1 });
    await db.collection('kb_embeddings').createIndex({ roleScopes: 1 });

  } catch (error) {
    console.error('❌ Error creating database indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();

    process.exit(0);
  }
}

// Execute the script
addDatabaseIndexes();