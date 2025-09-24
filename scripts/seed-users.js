const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit';

// User schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  personal: {
    firstName: String,
    lastName: String,
    phone: String,
    avatar: String
  },
  professional: {
    role: String,
    employeeId: String,
    department: String,
    position: String,
    skills: [String],
    certifications: [String]
  },
  tenantId: String,
  organizationId: String,
  status: { type: String, default: 'ACTIVE' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Demo users
const demoUsers = [
  {
    email: 'superadmin@fixzit.co',
    username: 'EMP001',
    password: 'password123',
    personal: {
      firstName: 'Super',
      lastName: 'Admin'
    },
    professional: {
      role: 'SUPER_ADMIN',
      employeeId: 'EMP001',
      department: 'IT',
      position: 'System Administrator'
    },
    tenantId: 'fixzit-global',
    organizationId: 'fixzit'
  },
  {
    email: 'admin@fixzit.co',
    username: 'EMP002',
    password: 'password123',
    personal: {
      firstName: 'Admin',
      lastName: 'User'
    },
    professional: {
      role: 'CORP_ADMIN',
      employeeId: 'EMP002',
      department: 'Administration',
      position: 'Corporate Administrator'
    },
    tenantId: 'tenant-001',
    organizationId: 'org-001'
  },
  {
    email: 'employee@fixzit.co',
    username: 'EMP002',
    password: 'password123',
    personal: {
      firstName: 'Employee',
      lastName: 'User'
    },
    professional: {
      role: 'CORPORATE_EMPLOYEE',
      employeeId: 'EMP002',
      department: 'Operations',
      position: 'Staff Member'
    },
    tenantId: 'tenant-001',
    organizationId: 'org-001'
  },
  {
    email: 'manager@fixzit.co',
    username: 'EMP003',
    password: 'password123',
    personal: {
      firstName: 'Property',
      lastName: 'Manager'
    },
    professional: {
      role: 'MANAGEMENT',
      employeeId: 'EMP003',
      department: 'Property Management',
      position: 'Property Manager'
    },
    tenantId: 'tenant-001',
    organizationId: 'org-001'
  },
  {
    email: 'tenant@fixzit.co',
    username: 'EMP004',
    password: 'password123',
    personal: {
      firstName: 'Tenant',
      lastName: 'User'
    },
    professional: {
      role: 'TENANT',
      employeeId: 'EMP004',
      department: 'N/A',
      position: 'Tenant'
    },
    tenantId: 'tenant-001',
    organizationId: 'org-001'
  },
  {
    email: 'vendor@fixzit.co',
    username: 'EMP005',
    password: 'password123',
    personal: {
      firstName: 'Vendor',
      lastName: 'User'
    },
    professional: {
      role: 'VENDOR',
      employeeId: 'EMP005',
      department: 'Sales',
      position: 'Vendor Representative'
    },
    tenantId: 'vendor-001',
    organizationId: 'vendor-org-001'
  }
];

async function seedUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('🌱 Seeding users...');
    
    for (const userData of demoUsers) {
      try {
        // Check if user exists
        const existingUser = await User.findOne({ 
          $or: [
            { email: userData.email },
            { username: userData.username }
          ]
        });

        if (existingUser) {
          console.log(`⚠️  User already exists: ${userData.email}`);
          continue;
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        // Create user
        const user = new User({
          ...userData,
          password: hashedPassword
        });

        await user.save();
        console.log(`✅ Created user: ${userData.email} (${userData.username})`);
      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }

    console.log('✅ User seeding completed!');
    console.log('\n📋 Demo Credentials:');
    console.log('===================');
    demoUsers.forEach(user => {
      console.log(`${user.professional.role}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Employee #: ${user.username}`);
      console.log(`  Password: ${user.password}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the seeder
seedUsers();
