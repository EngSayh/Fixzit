/*
  Seed a realistic dataset into a real MongoDB for FM smoke/E2E.
  Usage (PowerShell):
    $env:MONGODB_URI="mongodb://localhost:27017/fixzit"; npm run seed:realdb
*/

import { db } from '@/lib/mongo';
import { Property } from '@/server/models/Property';
import { WorkOrder } from '@/server/models/WorkOrder';
import { computeDueAt, computeSlaMinutes } from '@/lib/sla';
import { Invoice } from '@/server/models/Invoice';
import type { WorkOrderPriority } from '@/server/models/WorkOrder';

async function main() {
  const tenantId = 'demo-tenant';
  const actorId = 'seed-realdb';
  await db;

  // 1) Properties
  const props = [
    { code: 'PROP-REAL-001', name: 'Fixzit HQ Tower', type: 'COMMERCIAL', city: 'Riyadh', region: 'Riyadh', lat: 24.7136, lng: 46.6753, area: 48000, floors: 22, occ: 84 },
    { code: 'PROP-REAL-002', name: 'Al Olaya Residential C', type: 'RESIDENTIAL', city: 'Riyadh', region: 'Riyadh', lat: 24.6937, lng: 46.7221, area: 26000, floors: 12, occ: 92 },
    { code: 'PROP-REAL-003', name: 'Dammam Logistics Park', type: 'INDUSTRIAL', city: 'Dammam', region: 'Eastern', lat: 26.4207, lng: 50.0888, area: 78000, floors: 3, occ: 73 },
  ];

  type CreatedProp = { _id?: { toString(): string }; id?: string };
  const createdProps: CreatedProp[] = [];
  for (const p of props) {
    const doc = await Property.findOneAndUpdate(
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
    await Property.findOneAndUpdate(
      { tenantId, code: a.code },
      { $set: { tenantId, code: a.code, name: a.name, type: a.type, category: 'SEED', propertyId: propId, status: a.status, criticality: a.criticality, createdBy: actorId } },
      { upsert: true, new: true }
    );
  }

  // 3) Work Orders (varied priorities/status, with SLA dueAt)
  const woSeeds = [
    { title: 'AC not cooling – Lvl 12', priority: 'CRITICAL', status: 'SUBMITTED', prop: 0 },
    { title: 'Water leak – Lobby', priority: 'HIGH', status: 'DISPATCHED', prop: 0 },
    { title: 'Lighting replacement – Car Park', priority: 'MEDIUM', status: 'IN_PROGRESS', prop: 0 },
    { title: 'Gate sensor calibration', priority: 'LOW', status: 'COMPLETED', prop: 2 },
  ];
  for (const w of woSeeds) {
    const seq = Math.floor((Date.now() / 1000) % 100000);
    const code = `WO-REAL-${seq}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    const createdAt = new Date();
    const priority = w.priority as WorkOrderPriority;
    const slaMinutes = computeSlaMinutes(priority);
    const dueAt = computeDueAt(createdAt, slaMinutes);
    const propId = createdProps[w.prop]?._id?.toString() || createdProps[w.prop]?.id;
    await WorkOrder.create({
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
  await Invoice.findOneAndUpdate(
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
