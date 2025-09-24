import 'dotenv/config';
import { db } from '@/src/lib/mongo';
import User from '@/src/server/models/User';
import { Property } from '@/src/server/models/Property';

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  const ORG = process.env.SEED_ORG_ID || 'demo-tenant';

  await db;

  // Seed Admin User (email unique)
  let admin = await (User as any).findOne({ email: 'admin@fixzit.co' }).select('+password');
  if (!admin) {
    admin = await (User as any).create({
      org_id: ORG,
      email: 'admin@fixzit.co',
      password: 'Admin@123',
      name: 'Admin User',
      role: 'SUPER_ADMIN',
      status: 'active',
      language: 'ar'
    });
    // Password will be hashed by pre-save hook
    console.log('✅ Created admin user: admin@fixzit.co / Admin@123');
  } else {
    console.log('⏭️  Admin user already exists');
  }

  // Seed one Property (requires tenantId and coordinates)
  const existingProp = await (Property as any).findOne({ tenantId: ORG, code: 'PROP-ACME-1' });
  if (!existingProp) {
    await (Property as any).create({
      tenantId: ORG,
      code: 'PROP-ACME-1',
      name: 'ACME Tower',
      type: 'COMMERCIAL',
      address: {
        street: 'King Fahd Road',
        city: 'Riyadh',
        region: 'Riyadh',
        postalCode: '11564',
        country: 'SA',
        coordinates: { lat: 24.7136, lng: 46.6753 }
      },
      createdBy: String(admin._id)
    });
    console.log('✅ Created property: ACME Tower (PROP-ACME-1)');
  } else {
    console.log('⏭️  Property already exists');
  }

  console.log('🌱 Seed complete. ORG:', ORG);
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });

