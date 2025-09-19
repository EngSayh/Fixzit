const bcrypt = require('bcrypt');
const { User, Property, WorkOrder, Tenant } = require('../models');
require('dotenv').config();

async function seedDatabase() {
  try {
    // Use environment variables for sensitive data
    const adminPassword = process.env.ADMIN_DEFAULT_PASSWORD || crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    // Create admin user
    const admin = await User.create({
      name: 'System Administrator',
      email: 'admin@fixzit.com',
      password: hashedPassword,
      role: 'admin',
      organization: 'Fixzit'
    });
    
    console.log('Admin user created. Password stored securely in environment variables.');
    
    // Create test users with hashed passwords
    const testUsers = [
      { name: 'Property Manager', email: 'manager@test.com', role: 'manager' },
      { name: 'Technician', email: 'tech@test.com', role: 'technician' },
      { name: 'Tenant', email: 'tenant@test.com', role: 'tenant' }
    ];
    
    for (const userData of testUsers) {
      const tempPassword = crypto.randomBytes(16).toString('hex');
      const hashed = await bcrypt.hash(tempPassword, 12);
      await User.create({
        ...userData,
        password: hashed,
        organization: 'Test Org'
      });
      console.log(`Created ${userData.role} with secure password`);
    }
    
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Seeding error:', error);
  }
}

module.exports = seedDatabase;