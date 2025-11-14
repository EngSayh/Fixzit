#!/usr/bin/env node
import { db } from '../lib/mongo';
import { User } from '../server/models/User';

const demoEmails = [
  'superadmin@fixzit.co',
  'admin@fixzit.co',
  'manager@fixzit.co',
  'tenant@fixzit.co',
  'vendor@fixzit.co'
];

async function checkUsers() {
  try {
    await db;
    console.log('🔍 Checking demo users in database...\n');
    
    for (const email of demoEmails) {
      const user = await User.findOne({ email }).select('email professional.role status isActive passwordHash');
      
      if (user) {
        console.log(`✅ ${email}`);
        console.log(`   Role: ${user.professional?.role || 'N/A'}`);
        console.log(`   Status: ${user.status || 'N/A'}`);
        console.log(`   isActive: ${user.isActive !== undefined ? user.isActive : 'N/A'}`);
        console.log(`   Has password: ${!!user.passwordHash || !!user.password}`);
      } else {
        console.log(`❌ ${email} - NOT FOUND`);
      }
      console.log('');
    }
    
    // Check corporate users
    console.log('🏢 Checking corporate users...\n');
    const corpUsers = await User.find({ 
      employeeNumber: { $in: ['EMP001', 'EMP002'] } 
    }).select('employeeNumber email professional.role status');
    
    if (corpUsers.length > 0) {
      corpUsers.forEach((user: any) => {
        console.log(`✅ ${user.employeeNumber} (${user.email})`);
        console.log(`   Role: ${user.professional?.role || 'N/A'}`);
      });
    } else {
      console.log('❌ No corporate users found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkUsers();
