/*
  Seed a realistic dataset into a real MongoDB for FM smoke/E2E.
  Usage (PowerShell):
    $env:MONGODB_URI="mongodb://localhost:27017/fixzit"; npm run seed:realdb
*/

import { db as connect } from '@/src/lib/mongo';
import { Property } from '@/src/server/models/Property';
import { WorkOrder } from '@/src/server/models/WorkOrder';
import { computeDueAt, computeSlaMinutes } from '@/src/lib/sla';
import Invoice from '@/src/server/models/Invoice';
import Asset from '@/src/server/models/Asset';

async function main() {
  const tenantId = 'demo-tenant';
  const actorId = 'seed-realdb';
  await connect();

  // 1) Properties
  const props = [
    { code: 'PROP-REAL-001', name: 'Fixzit HQ Tower', type: 'COMMERCIAL', city: 'Riyadh', region: 'Riyadh', lat: 24.7136, lng: 46.6753, area: 48000, floors: 22, occ: 84 },
    { code: 'PROP-REAL-002', name: 'Al Olaya Residential C', type: 'RESIDENTIAL', city: 'Riyadh', region: 'Riyadh', lat: 24.6937, lng: 46.7221, area: 26000, floors: 12, occ: 92 },
    { code: 'PROP-REAL-003', name: 'Dammam Logistics Park', type: 'INDUSTRIAL', city: 'Dammam', region: 'Eastern', lat: 26.4207, lng: 50.0888, area: 78000, floors: 3, occ: 73 },
  ];

  const createdProps: any[] = [];
  for (const p of props) {
    const doc = await (Property as any).findOneAndUpdate(
      { tenantId, code: p.code },
      {
        $set: {
          tenantId,
          code: p.code,
          name: p.name,
          type: p.type,
          address: { street: 'Seeded', city: p.city, region: p.region, coordinates: { lat: p.lat, lng: p.lng } },
          details: { totalArea: p.area, builtArea: Math.round(p.area * 0.9), floors: p.floors, occupancyRate: p.occ },
          createdBy: actorId,
        },
      },
      { upsert: true, new: true }
    );
    createdProps.push(doc);
  }

  // 2) Assets (maintenance list tile)
  const assetSeeds = [
    { code: 'AST-REAL-001', name: 'Chiller A1', type: 'HVAC', propertyIndex: 0, status: 'MAINTENANCE', criticality: 'HIGH' },
    { code: 'AST-REAL-002', name: 'Elevator #3', type: 'ELEVATOR', propertyIndex: 0, status: 'MAINTENANCE', criticality: 'MEDIUM' },
    { code: 'AST-REAL-003', name: 'Fire Pump F2', type: 'FIRE_SYSTEM', propertyIndex: 2, status: 'MAINTENANCE', criticality: 'CRITICAL' },
  ];
  for (const a of assetSeeds) {
    const propId = createdProps[a.propertyIndex]?._id?.toString() || createdProps[a.propertyIndex]?.id;
    await (Asset as any).findOneAndUpdate(
      { tenantId, code: a.code },
      { $set: { tenantId, code: a.code, name: a.name, type: a.type, category: 'SEED', propertyId: propId, status: a.status, criticality: a.criticality, createdBy: actorId } },
      { upsert: true, new: true }
    );
  }

  // 3) Work Orders (varied priorities/status, with SLA dueAt)
  const woSeeds = [
    { title: 'AC not cooling – Lvl 12', priority: 'URGENT', status: 'SUBMITTED', prop: 0 },
    { title: 'Water leak – Lobby', priority: 'HIGH', status: 'DISPATCHED', prop: 0 },
    { title: 'Lighting replacement – Car Park', priority: 'MEDIUM', status: 'IN_PROGRESS', prop: 0 },
    { title: 'Gate sensor calibration', priority: 'LOW', status: 'COMPLETED', prop: 2 },
  ];
  for (const w of woSeeds) {
    const seq = Math.floor((Date.now() / 1000) % 100000);
    const code = `WO-REAL-${seq}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    const createdAt = new Date();
    const slaMinutes = computeSlaMinutes(w.priority as any);
    const dueAt = computeDueAt(createdAt, slaMinutes);
    const propId = createdProps[w.prop]?._id?.toString() || createdProps[w.prop]?.id;
    await (WorkOrder as any).create({
      tenantId,
      code,
      title: w.title,
      description: '',
      priority: w.priority,
      category: 'GENERAL',
      propertyId: propId,
      status: w.status,
      statusHistory: [{ from: 'DRAFT', to: w.status, byUserId: actorId, at: createdAt }],
      slaMinutes,
      dueAt,
      createdBy: actorId,
      createdAt,
    });
  }

  // 4) Overdue invoice to light up finance tile
  const issueDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const dueDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const invNumber = `INV-REAL-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 89999)}`;
  await (Invoice as any).findOneAndUpdate(
    { tenantId, number: invNumber },
    {
      $set: {
        tenantId,
        number: invNumber,
        type: 'SERVICE',
        issuer: { name: 'Fixzit FM', taxId: '3000000000', address: 'Riyadh' },
        recipient: { name: 'Demo Tenant', address: 'Riyadh' },
        issueDate,
        dueDate,
        items: [ { description: 'Emergency AC repair', quantity: 1, unitPrice: 1500, total: 1500, tax: { type: 'VAT', rate: 15, amount: 225 } } ],
        subtotal: 1500,
        taxes: [ { type: 'VAT', rate: 15, amount: 225 } ],
        total: 1725,
        currency: 'SAR',
        status: 'OVERDUE',
        createdBy: actorId,
      },
    },
    { upsert: true, new: true }
  );

  console.log('✅ Real DB seed complete (FM):', {
    tenantId,
    properties: createdProps.map(p => ({ id: p._id?.toString?.() || p.id, code: p.code, name: p.name })),
  });
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('❌ Real DB seed failed:', err);
  process.exit(1);
});

// scripts/seed-realdb.ts - Minimal real DB dataset for end-to-end testing
import 'dotenv/config';
import db from '@/src/lib/mongo';
import {
  WorkOrder,
  Property,
  Tenant,
  Vendor,
  Invoice,
  Product,
  RFQ,
  Order,
  Project,
} from '@/src/server/models';
import Listing from '@/src/server/models/Listing';

async function ensureIndexes() {
  // Create indexes explicitly to avoid reliance on autoIndex in prod
  await Promise.allSettled([
    (WorkOrder as any).syncIndexes?.(),
    (Property as any).syncIndexes?.(),
    (Tenant as any).syncIndexes?.(),
    (Vendor as any).syncIndexes?.(),
    (Invoice as any).syncIndexes?.(),
    (Product as any).syncIndexes?.(),
    (RFQ as any).syncIndexes?.(),
    (Order as any).syncIndexes?.(),
    (Project as any).syncIndexes?.(),
    (Listing as any).syncIndexes?.(),
  ]);
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set. Aborting.');
    process.exit(1);
  }

  const tenantId = process.env.SEED_TENANT_ID || 'demo-tenant';
  const orgId = process.env.SEED_ORG_ID || tenantId;

  await db();
  await ensureIndexes();

  // Common tag to allow clean removal later
  const seedTag = 'seed-demo';

  // Upserts
  await Promise.all([
    // Tenant
    (Tenant as any).updateOne(
      { tenantId, code: 'TNT-001' },
      {
        $set: {
          tenantId,
          code: 'TNT-001',
          name: 'Demo Tenant',
          type: 'COMPANY',
          'contact.primary.email': 'tenant@fixzit.co',
          createdBy: 'seed',
          tags: [seedTag],
        },
      },
      { upsert: true }
    ),

    // Vendor
    (Vendor as any).updateOne(
      { tenantId, code: 'VND-COOL-001' },
      {
        $set: {
          tenantId,
          code: 'VND-COOL-001',
          name: 'CoolAir Trading',
          type: 'SUPPLIER',
          createdBy: 'seed',
          tags: [seedTag],
        },
      },
      { upsert: true }
    ),

    // Property
    (Property as any).updateOne(
      { tenantId, code: 'PROP-001' },
      {
        $set: {
          tenantId,
          code: 'PROP-001',
          name: 'Olaya Tower',
          description: 'Mixed-use tower in Riyadh',
          type: 'COMMERCIAL',
          address: { city: 'Riyadh', region: 'Riyadh', coordinates: { lat: 24.7136, lng: 46.6753 } },
          createdBy: 'seed',
          tags: [seedTag],
        },
      },
      { upsert: true }
    ),

    // Work Order
    (WorkOrder as any).updateOne(
      { tenantId, code: 'WO-2025-001' },
      {
        $set: {
          tenantId,
          code: 'WO-2025-001',
          title: 'AC not cooling in Tower A',
          description: '4th floor unit 402',
          category: 'HVAC',
          priority: 'HIGH',
          status: 'SUBMITTED',
          createdBy: 'seed',
          tags: [seedTag],
        },
      },
      { upsert: true }
    ),

    // Invoice
    (Invoice as any).updateOne(
      { tenantId, number: 'INV-2025-001' },
      {
        $set: {
          tenantId,
          number: 'INV-2025-001',
          type: 'SERVICE',
          status: 'SENT',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 7 * 86400000),
          description: 'FM Services - January',
          recipient: { name: 'Demo Tenant' },
          createdBy: 'seed',
          tags: [seedTag],
        },
      },
      { upsert: true }
    ),

    // Product (material)
    (Product as any).updateOne(
      { sku: 'ACF-14x20' },
      {
        $set: {
          name: 'HVAC Filter 14x20',
          nameAr: 'فلتر تكييف 14x20',
          description: 'MERV 11 filter',
          descriptionAr: 'فلتر درجة 11',
          category: 'HVAC',
          type: 'material',
          vendorId: 'VND-COOL-001',
          sku: 'ACF-14x20',
          images: { primary: '/placeholder-material.jpg', gallery: [] },
          stock: { quantity: 50, unit: 'piece', minOrder: 1 },
          price: { amount: 45, currency: 'SAR', vat: 15 },
          tags: [seedTag],
        },
      },
      { upsert: true }
    ),

    // RFQ
    (RFQ as any).updateOne(
      { tenantId, code: 'RFQ-2025-001' },
      {
        $set: {
          tenantId,
          code: 'RFQ-2025-001',
          title: 'HVAC Annual Filters',
          description: 'Supply of HVAC filters for Olaya Tower',
          category: 'Maintenance',
          createdBy: 'seed',
          tags: [seedTag],
        },
      },
      { upsert: true }
    ),

    // Order
    (Order as any).updateOne(
      { orgId, _id: 'ORDER-SEED-001' },
      {
        $set: {
          _id: 'ORDER-SEED-001',
          orgId,
          userId: 'seed-user',
          items: [{ productId: 'ACF-14x20', quantity: 5, price: 45, currency: 'SAR' }],
          totals: { subtotal: 225, vat: 33.75, shipping: 0, discount: 0, total: 258.75 },
          currency: 'SAR',
          status: 'pending',
        },
      },
      { upsert: true }
    ),

    // Project (Aqar)
    (Project as any).updateOne(
      { tenantId, code: 'PRJ-OLAYA-001' },
      {
        $set: {
          tenantId,
          code: 'PRJ-OLAYA-001',
          name: 'Olaya Heights',
          description: 'Mixed-use development',
          type: 'RENOVATION',
          createdBy: 'seed',
          tags: [seedTag],
        },
      },
      { upsert: true }
    ),

    // Listing (property)
    (Listing as any).updateOne(
      { orgId, tenantId, title: 'Modern Apartment in Riyadh' },
      {
        $set: {
          type: 'property',
          status: 'active',
          tenantId,
          orgId,
          title: 'Modern Apartment in Riyadh',
          description: '2BR in Al Olaya',
          price: 85000,
          currency: 'SAR',
          property: {
            category: 'residential',
            purpose: 'rent',
            area: 120,
            bedrooms: 2,
            bathrooms: 2,
            location: { city: 'Riyadh', district: 'Al Olaya' },
          },
          seller: { userId: 'seed-owner', type: 'owner', name: 'Owner Demo', contact: { whatsapp: true } },
          visibility: { public: true },
        },
      },
      { upsert: true }
    ),
  ]);

  console.log('✅ Seeded demo data to real DB for tenant:', tenantId);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});


