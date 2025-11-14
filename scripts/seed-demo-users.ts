#!/usr/bin/env node
/**
 * Seed demo users that match the login page credentials
 * All users have password: "password123"
 */
import { db } from '../lib/mongo';
import { User } from '../server/models/User';
import { hashPassword } from '../lib/auth';

const demoUsers = [
  {
    code: 'USR-SUPERADMIN',
    username: 'superadmin',
    email: 'superadmin@fixzit.co',
    password: 'password123',
    orgId: '68dc8955a1ba6ed80ff372dc',
    personal: {
      firstName: 'Super',
      lastName: 'Admin',
      nationality: 'SA',
      address: { country: 'SA' }
    },
    professional: {
      role: 'SUPER_ADMIN',
      title: 'Super Administrator',
      department: 'IT',
      skills: [],
      licenses: [],
      certifications: []
    },
    workload: {
      workingHours: { days: [], timezone: 'Asia/Riyadh' },
      availability: []
    },
    performance: { reviews: [] },
    security: { permissions: [] },
    employment: { benefits: [] },
    compliance: { training: [] },
    status: 'ACTIVE',
    createdBy: 'seed-script'
  },
  {
    code: 'USR-ADMIN',
    username: 'admin',
    email: 'admin@fixzit.co',
    password: 'password123',
    // Don't set orgId/createdBy for existing user - will be updated via updateOne
  },
  {
    code: 'USR-MANAGER',
    username: 'manager',
    email: 'manager@fixzit.co',
    password: 'password123',
    orgId: '68dc8955a1ba6ed80ff372dc',
    personal: {
      firstName: 'Property',
      lastName: 'Manager',
      nationality: 'SA',
      address: { country: 'SA' }
    },
    professional: {
      role: 'PROPERTY_MANAGER',
      title: 'Property Manager',
      department: 'Operations',
      skills: [],
      licenses: [],
      certifications: []
    },
    workload: {
      workingHours: { days: [], timezone: 'Asia/Riyadh' },
      availability: []
    },
    performance: { reviews: [] },
    security: { permissions: [] },
    employment: { benefits: [] },
    compliance: { training: [] },
    status: 'ACTIVE',
    createdBy: 'seed-script'
  },
  {
    code: 'USR-TENANT',
    username: 'tenant',
    email: 'tenant@fixzit.co',
    password: 'password123',
    orgId: '68dc8955a1ba6ed80ff372dc',
    personal: {
      firstName: 'Demo',
      lastName: 'Tenant',
      nationality: 'SA',
      address: { country: 'SA' }
    },
    professional: {
      role: 'TENANT',
      title: 'Tenant',
      department: 'N/A',
      skills: [],
      licenses: [],
      certifications: []
    },
    workload: {
      workingHours: { days: [], timezone: 'Asia/Riyadh' },
      availability: []
    },
    performance: { reviews: [] },
    security: { permissions: [] },
    employment: { benefits: [] },
    compliance: { training: [] },
    status: 'ACTIVE',
    createdBy: 'seed-script'
  },
  {
    code: 'USR-VENDOR',
    username: 'vendor',
    email: 'vendor@fixzit.co',
    password: 'password123',
    orgId: '68dc8955a1ba6ed80ff372dc',
    personal: {
      firstName: 'Demo',
      lastName: 'Vendor',
      nationality: 'SA',
      address: { country: 'SA' }
    },
    professional: {
      role: 'VENDOR',
      title: 'Vendor',
      department: 'N/A',
      skills: [],
      licenses: [],
      certifications: []
    },
    workload: {
      workingHours: { days: [], timezone: 'Asia/Riyadh' },
      availability: []
    },
    performance: { reviews: [] },
    security: { permissions: [] },
    employment: { benefits: [] },
    compliance: { training: [] },
    status: 'ACTIVE',
    createdBy: 'seed-script'
  },
  {
    code: 'EMP001',
    username: 'EMP001',
    email: 'emp001@fixzit.co',
    password: 'password123',
    orgId: '68dc8955a1ba6ed80ff372dc',
    personal: {
      firstName: 'Employee',
      lastName: 'One',
      nationality: 'SA',
      address: { country: 'SA' }
    },
    professional: {
      role: 'EMPLOYEE',
      title: 'Corporate Employee',
      department: 'Operations',
      skills: [],
      licenses: [],
      certifications: []
    },
    workload: {
      workingHours: { days: [], timezone: 'Asia/Riyadh' },
      availability: []
    },
    performance: { reviews: [] },
    security: { permissions: [] },
    employment: { benefits: [] },
    compliance: { training: [] },
    status: 'ACTIVE',
    createdBy: 'seed-script'
  },
  {
    code: 'EMP002',
    username: 'EMP002',
    email: 'emp002@fixzit.co',
    password: 'password123',
    orgId: '68dc8955a1ba6ed80ff372dc',
    personal: {
      firstName: 'Employee',
      lastName: 'Two',
      nationality: 'SA',
      address: { country: 'SA' }
    },
    professional: {
      role: 'EMPLOYEE',
      title: 'Corporate Employee',
      department: 'Operations',
      skills: [],
      licenses: [],
      certifications: []
    },
    workload: {
      workingHours: { days: [], timezone: 'Asia/Riyadh' },
      availability: []
    },
    performance: { reviews: [] },
    security: { permissions: [] },
    employment: { benefits: [] },
    compliance: { training: [] },
    status: 'ACTIVE',
    createdBy: 'seed-script'
  }
];

async function seedDemoUsers() {
  try {
    await db;
    console.log('🌱 Seeding demo users...\n');
    
    let created = 0;
    let updated = 0;
    let skipped = 0;
    
    for (const userData of demoUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      
      const hashedPassword = await hashPassword(userData.password);
      const userWithHashedPassword = {
        ...userData,
        password: hashedPassword
      };
      
      if (existingUser) {
        // Update existing user's password using direct MongoDB update to skip validation
        await User.updateOne(
          { _id: existingUser._id },
          {
            $set: {
              password: hashedPassword,
              status: 'ACTIVE',
              username: userData.username
            }
          }
        );
        console.log(`✅ Updated user: ${userData.email} (password updated)`);
        updated++;
      } else {
        try {
          await User.create(userWithHashedPassword);
          console.log(`✅ Created user: ${userData.email} (${userData.professional?.role || 'user'})`);
          created++;
        } catch (error: any) {
          if (error.code === 11000) {
            console.log(`⏭️  User already exists: ${userData.email}`);
            skipped++;
          } else {
            console.error(`❌ Error creating ${userData.email}:`, error.message);
          }
        }
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('   Total:   ' + (created + updated + skipped));
    console.log('\n✅ Demo user seeding completed!');
    console.log('\n📝 Login credentials:');
    console.log('   Personal:  superadmin@fixzit.co / password123');
    console.log('   Personal:  admin@fixzit.co / password123');
    console.log('   Personal:  manager@fixzit.co / password123');
    console.log('   Personal:  tenant@fixzit.co / password123');
    console.log('   Personal:  vendor@fixzit.co / password123');
    console.log('   Corporate: EMP001 / password123');
    console.log('   Corporate: EMP002 / password123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding demo users:', error);
    process.exit(1);
  }
}

seedDemoUsers();
