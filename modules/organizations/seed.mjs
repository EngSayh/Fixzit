#!/usr/bin/env node
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Organization from './schema.ts';

dotenv.config();

const organizations = [
  {
    name: 'Fixzit Platform',
    nameAr: 'منصة فيكسيت',
    subscriptionPlan: 'Enterprise',
    status: 'active',
    email: 'platform@fixzit.sa',
    phone: '+966-11-123-4567',
    website: 'https://fixzit.sa',
    address: {
      street: 'King Fahd Road',
      city: 'Riyadh',
      state: 'Riyadh Province',
      postalCode: '11564',
      country: 'Saudi Arabia'
    },
    billingEmail: 'billing@fixzit.sa',
    taxId: 'SA-300000000000003',
    settings: { timezone: 'Asia/Riyadh', language: 'en', currency: 'SAR' }
  },
  {
    name: 'ACME Corporation',
    nameAr: 'شركة أكمي',
    subscriptionPlan: 'Premium',
    status: 'active',
    email: 'contact@acme.local',
    phone: '+966-11-765-4321',
    website: 'https://acme.local',
    address: {
      street: 'Olaya Street',
      city: 'Riyadh',
      state: 'Riyadh Province',
      postalCode: '12345',
      country: 'Saudi Arabia'
    },
    billingEmail: 'finance@acme.local',
    taxId: 'SA-123456789000001',
    settings: { timezone: 'Asia/Riyadh', language: 'ar', currency: 'SAR' }
  }
];

async function seedOrganizations() {
  try {
    console.log('🌱 Starting organization seed...\n');
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) throw new Error('MONGODB_URI not found');
    
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected\n');
    
    let created = 0, updated = 0;
    for (const orgData of organizations) {
      console.log(`📋 Processing: ${orgData.name}`);
      const result = await Organization.updateOne(
        { name: orgData.name },
        { $set: orgData },
        { upsert: true }
      );
      if (result.upsertedCount > 0) { created++; console.log('   ✅ Created'); }
      else if (result.modifiedCount > 0) { updated++; console.log('   ♻️  Updated'); }
      else console.log('   ⏭️  No changes');
    }
    
    console.log(`\n📊 Created: ${created}, Updated: ${updated}, Total: ${organizations.length}`);
    const count = await Organization.countDocuments();
    console.log(`✅ Total organizations in database: ${count}`);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected');
  }
}

seedOrganizations();
