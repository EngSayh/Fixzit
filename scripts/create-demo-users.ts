#!/usr/bin/env node
/**
 * Create missing demo users
 */
import { db } from '../lib/mongo';
import { User } from '../server/models/User';
import { hashPassword } from '../lib/auth';

const newUsers = [
  {
    code: 'USR-SUPERADMIN',
    username: 'superadmin',
    email: 'superadmin@fixzit.co',
    employeeId: 'SUPER-001',
    orgId: '68dc8955a1ba6ed80ff372dc',
    personal: {
      firstName: 'Super',
      lastName: 'Admin',
      address: { country: 'SA' }
    },
    professional: {
      role: 'SUPER_ADMIN',
      title: 'Super Administrator',
      department: 'IT'
    },
    status: 'ACTIVE'
  },
  {
    code: 'USR-MANAGER',
    username: 'manager',
    email: 'manager@fixzit.co',
    employeeId: 'MGR-001',
    orgId: '68dc8955a1ba6ed80ff372dc',
    personal: {
      firstName: 'Property',
      lastName: 'Manager',
      address: { country: 'SA' }
    },
    professional: {
      role: 'PROPERTY_MANAGER',
      title: 'Property Manager',
      department: 'Operations'
    },
    status: 'ACTIVE'
  },
  {
    code: 'USR-TENANT',
    username: 'tenant',
    email: 'tenant@fixzit.co',
    employeeId: 'TENANT-001',
    orgId: '68dc8955a1ba6ed80ff372dc',
    personal: {
      firstName: 'Demo',
      lastName: 'Tenant',
      address: { country: 'SA' }
    },
    professional: {
      role: 'TENANT',
      title: 'Tenant',
      department: 'N/A'
    },
    status: 'ACTIVE'
  },
  {
    code: 'USR-VENDOR',
    username: 'vendor',
    email: 'vendor@fixzit.co',
    employeeId: 'VENDOR-001',
    orgId: '68dc8955a1ba6ed80ff372dc',
    personal: {
      firstName: 'Demo',
      lastName: 'Vendor',
      address: { country: 'SA' }
    },
    professional: {
      role: 'VENDOR',
      title: 'Vendor',
      department: 'N/A'
    },
    status: 'ACTIVE'
  },
  {
    code: 'EMP001',
    username: 'EMP001',
    email: 'emp001@fixzit.co',
    employeeId: 'EMP001',
    orgId: '68dc8955a1ba6ed80ff372dc',
    personal: {
      firstName: 'Employee',
      lastName: 'One',
      address: { country: 'SA' }
    },
    professional: {
      role: 'EMPLOYEE',
      title: 'Corporate Employee',
      department: 'Operations'
    },
    status: 'ACTIVE'
  },
  {
    code: 'EMP002',
    username: 'EMP002',
    email: 'emp002@fixzit.co',
    employeeId: 'EMP002',
    orgId: '68dc8955a1ba6ed80ff372dc',
    personal: {
      firstName: 'Employee',
      lastName: 'Two',
      address: { country: 'SA' }
    },
    professional: {
      role: 'EMPLOYEE',
      title: 'Corporate Employee',
      department: 'Operations'
    },
    status: 'ACTIVE'
  }
];

async function createUsers() {
  try {
    await db;
    console.log('🌱 Creating missing demo users...\n');
    
    const hashedPassword = await hashPassword('password123');
    let created = 0;
    
    for (const userData of newUsers) {
      const exists = await User.findOne({ email: userData.email });
      if (exists) {
        console.log(`⏭️  Skip: ${userData.email} (already exists)`);
        continue;
      }
      
      try {
        // Use insertOne to bypass validation plugins
        const result = await User.collection.insertOne({
          ...userData,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
          changeHistory: [],
          tags: []
        });
        
        if (result.acknowledged) {
          console.log(`✅ Created: ${userData.email} (${userData.professional.role})`);
          created++;
        }
      } catch (error: any) {
        console.error(`❌ Error creating ${userData.email}:`, error.message);
      }
    }
    
    console.log(`\n📊 Created ${created} new users`);
    console.log('\n📝 All demo users should now be available:');
    console.log('   superadmin@fixzit.co / password123');
    console.log('   admin@fixzit.co / password123');
    console.log('   manager@fixzit.co / password123');
    console.log('   tenant@fixzit.co / password123');
    console.log('   vendor@fixzit.co / password123');
    console.log('   EMP001 / password123 (corporate)');
    console.log('   EMP002 / password123 (corporate)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createUsers();
