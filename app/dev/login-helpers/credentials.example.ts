/**
 * Example credentials configuration for dev login helpers
 * Copy this file to credentials.ts and fill in actual values
 * credentials.ts is gitignored for security
 */

export const DEMO_CREDENTIALS = [
  {
    role: 'Super Admin',
    email: 'superadmin@example.com',
    password: 'change_me',
    description: 'Full system access',
    icon: 'Shield',
    color: 'bg-red-100 text-red-800 border-red-200'
  },
  {
    role: 'Admin',
    email: 'admin@example.com',
    password: 'change_me',
    description: 'Administrative access',
    icon: 'User',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    role: 'Property Manager',
    email: 'manager@example.com',
    password: 'change_me',
    description: 'Property management',
    icon: 'Building2',
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  {
    role: 'Tenant',
    email: 'tenant@example.com',
    password: 'change_me',
    description: 'Tenant portal access',
    icon: 'Users',
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    role: 'Vendor',
    email: 'vendor@example.com',
    password: 'change_me',
    description: 'Vendor marketplace access',
    icon: 'Users',
    color: 'bg-orange-100 text-orange-800 border-orange-200'
  }
];

export const CORPORATE_CREDENTIALS = [
  {
    role: 'Property Manager (Corporate)',
    employeeNumber: 'EMP001',
    password: 'change_me',
    description: 'Corporate account access',
    icon: 'Building2',
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  {
    role: 'Admin (Corporate)',
    employeeNumber: 'EMP002',
    password: 'change_me',
    description: 'Corporate administrative access',
    icon: 'User',
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  }
];
