import clientPromise from '@/lib/mongodb';

async function run() {
  const client = await clientPromise;
  const db = client.db();
  const col = db.collection('properties');

  const docs = [
    {
      tenantId: 'demo-tenant',
      code: 'PROP-AQ-001',
      name: 'Luxury Villa - Al Olaya',
      type: 'RESIDENTIAL',
      subtype: 'Villa',
      address: {
        street: 'Olaya St', city: 'Riyadh', region: 'Riyadh', postalCode: '11564', district: 'Al Olaya',
        coordinates: { lat: 24.690, lng: 46.685 }
      },
      details: { totalArea: 450, bedrooms: 5, bathrooms: 6 },
      market: { listingPrice: 3500000 },
      photos: ['/images/sample/villa1.jpg'],
      createdBy: 'system', createdAt: new Date(), updatedAt: new Date()
    },
    {
      tenantId: 'demo-tenant',
      code: 'PROP-AQ-002',
      name: 'Modern Apartment - King Fahd Rd',
      type: 'RESIDENTIAL',
      subtype: 'Apartment',
      address: {
        street: 'King Fahd Rd', city: 'Riyadh', region: 'Riyadh', postalCode: '11564', district: 'Al Wurud',
        coordinates: { lat: 24.730, lng: 46.670 }
      },
      details: { totalArea: 120, bedrooms: 2, bathrooms: 2 },
      market: { listingPrice: 8500 },
      photos: ['/images/sample/apt1.jpg'],
      createdBy: 'system', createdAt: new Date(), updatedAt: new Date()
    }
  ];

  for (const d of docs) {
    await col.updateOne({ code: d.code }, { $set: d }, { upsert: true });
  }
  console.log('Seeded Aqar sample properties');
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });

