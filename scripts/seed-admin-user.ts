import { db } from '../src/lib/mongo';
import User from '../src/server/models/User';
import mongoose from 'mongoose';

async function seedAdminUser() {
  console.log('🌱 Seeding admin user...');
  
  try {
    await db();
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@fixzit.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      return;
    }
    
    // Create admin user
    const adminUser = await User.create({
      org_id: 1,
      email: 'admin@fixzit.com',
      password: 'Admin@123', // Will be hashed by the model
      name: 'System Administrator',
      role: 'SUPER_ADMIN',
      status: 'active',
      emailVerified: true,
      language: 'en',
      timezone: 'Asia/Riyadh',
      modules: [
        'dashboard', 'work-orders', 'properties', 'finance', 
        'hr', 'crm', 'marketplace', 'support', 'compliance', 
        'reports', 'system-management'
      ]
    });
    
    console.log('✅ Admin user created successfully:');
    console.log(`   Email: admin@fixzit.com`);
    console.log(`   Password: Admin@123`);
    console.log(`   Role: SUPER_ADMIN`);
    console.log(`   ID: ${adminUser._id}`);
    
    // Create additional test users
    const testUsers = [
      {
        org_id: 1,
        email: 'manager@fixzit.com',
        password: 'Manager@123',
        name: 'Facility Manager',
        role: 'ADMIN',
        status: 'active',
        emailVerified: true
      },
      {
        org_id: 1,
        email: 'tech@fixzit.com',
        password: 'Tech@123',
        name: 'John Technician',
        role: 'TECHNICIAN',
        status: 'active',
        emailVerified: true
      },
      {
        org_id: 1,
        email: 'tenant@fixzit.com',
        password: 'Tenant@123',
        name: 'Sarah Tenant',
        role: 'TENANT_ADMIN',
        status: 'active',
        emailVerified: true
      }
    ];
    
    for (const userData of testUsers) {
      const user = await User.create(userData);
      console.log(`✅ Created ${userData.role}: ${userData.email}`);
    }
    
    console.log('\n🎉 All users seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

seedAdminUser();
