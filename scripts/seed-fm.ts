/*
  Seed FM data into a real MongoDB database.
  Usage:
    $env:MONGODB_URI="mongodb://localhost:27017/fixzit"; npm run seed:fm
*/

import { db as connect } from '@/src/lib/mongo';
import { Property } from '@/src/server/models/Property';
import { WorkOrder } from '@/src/server/models/WorkOrder';
import { computeDueAt, computeSlaMinutes } from '@/src/lib/sla';

async function main() {
  const tenantId = 'demo-tenant';
  const actorId = 'seed-script';
  await connect();

  // Create a few properties (upsert by code)
  const properties = [
    {
      code: 'PROP-SEED-001',
      name: 'Riyadh Business Tower',
      type: 'COMMERCIAL',
      address: { street: 'King Fahd Rd', city: 'Riyadh', region: 'Riyadh', coordinates: { lat: 24.7136, lng: 46.6753 } },
      details: { totalArea: 50000, builtArea: 45000, floors: 20, occupancyRate: 82 },
    },
    {
      code: 'PROP-SEED-002',
      name: 'Residential Complex C',
      type: 'RESIDENTIAL',
      address: { street: 'Prince Sultan Rd', city: 'Jeddah', region: 'Makkah', coordinates: { lat: 21.4858, lng: 39.1925 } },
      details: { totalArea: 25000, builtArea: 22000, bedrooms: 150, bathrooms: 150, floors: 12, occupancyRate: 91 },
    },
    {
      code: 'PROP-SEED-003',
      name: 'Dammam Logistics Yard',
      type: 'INDUSTRIAL',
      address: { street: 'Industrial Area', city: 'Dammam', region: 'Eastern', coordinates: { lat: 26.4207, lng: 50.0888 } },
      details: { totalArea: 80000, builtArea: 60000, occupancyRate: 76 },
    },
  ];

  const createdProps: any[] = [];
  for (const p of properties) {
    const doc = await (Property as any).findOneAndUpdate(
      { tenantId, code: p.code },
      { $set: { tenantId, ...p, createdBy: actorId } },
      { upsert: true, new: true }
    );
    createdProps.push(doc);
  }

  // Create some work orders with different priorities/statuses
  const now = new Date();
  const workOrdersInput = [
    { title: 'AC not cooling – Tower', priority: 'URGENT', status: 'SUBMITTED', propertyId: createdProps[0]?.id || createdProps[0]?._id },
    { title: 'Water leak – Residential', priority: 'HIGH', status: 'DISPATCHED', propertyId: createdProps[1]?.id || createdProps[1]?._id },
    { title: 'Lighting replacement – Tower', priority: 'MEDIUM', status: 'IN_PROGRESS', propertyId: createdProps[0]?.id || createdProps[0]?._id },
    { title: 'Gate sensor calibration – Logistics', priority: 'LOW', status: 'COMPLETED', propertyId: createdProps[2]?.id || createdProps[2]?._id },
  ] as const;

  for (const wo of workOrdersInput) {
    const seq = Math.floor((Date.now() / 1000) % 100000);
    const code = `WO-SEED-${seq}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    const slaMinutes = computeSlaMinutes(wo.priority as any);
    const dueAt = computeDueAt(now, slaMinutes);
    await (WorkOrder as any).create({
      tenantId,
      code,
      title: wo.title,
      description: '',
      priority: wo.priority,
      category: 'GENERAL',
      propertyId: wo.propertyId?.toString(),
      status: wo.status,
      statusHistory: [{ from: 'DRAFT', to: wo.status, byUserId: actorId, at: new Date() }],
      slaMinutes,
      dueAt,
      createdBy: actorId,
      createdAt: new Date(),
    });
  }

  console.log('✅ FM seed complete:', {
    tenantId,
    properties: createdProps.map(p => ({ id: p._id?.toString?.() || p.id, code: p.code, name: p.name })),
  });
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});


