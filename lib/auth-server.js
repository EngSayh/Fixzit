const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'fixzit_souq_jwt_secret_key_2025_enterprise';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Mock users database - in production, this would be in MongoDB
const users = [
  {
    id: '1',
    email: 'admin@fixzit.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'super_admin',
    name: 'System Administrator',
    company: 'FIXZIT SOUQ',
    permissions: ['all'],
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    email: 'manager@fixzit.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'admin',
    name: 'Property Manager',
    company: 'FIXZIT SOUQ',
    permissions: ['properties', 'work_orders', 'finance', 'hr', 'crm', 'marketplace', 'support', 'compliance', 'reports', 'settings'],
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    email: 'employee@fixzit.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'employee',
    name: 'John Employee',
    company: 'FIXZIT SOUQ',
    permissions: ['work_orders', 'support'],
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: '4',
    email: 'vendor@fixzit.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'vendor',
    name: 'Vendor Company',
    company: 'ABC Services',
    permissions: ['marketplace', 'support'],
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

// Hash password helper
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// Verify password helper
async function verifyPassword(password, hashedPassword) {
  return await bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    company: user.company,
    permissions: user.permissions
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Find user by email
function findUserByEmail(email) {
  return users.find(user => user.email === email && user.isActive);
}

// Find user by ID
function findUserById(id) {
  return users.find(user => user.id === id && user.isActive);
}

// Login user
async function loginUser(email, password) {
  const user = findUserByEmail(email);
  
  if (!user) {
    throw new Error('Invalid email or password');
  }
  
  const isValidPassword = await verifyPassword(password, user.password);
  
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }
  
  const token = generateToken(user);
  
  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      company: user.company,
      permissions: user.permissions
    },
    token
  };
}

// Register user
async function registerUser(userData) {
  const { email, password, name, role = 'employee', company } = userData;
  
  // Check if user already exists
  if (findUserByEmail(email)) {
    throw new Error('User already exists');
  }
  
  const hashedPassword = await hashPassword(password);
  const newUser = {
    id: (users.length + 1).toString(),
    email,
    password: hashedPassword,
    role,
    name,
    company: company || 'FIXZIT SOUQ',
    permissions: getDefaultPermissions(role),
    isActive: true,
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  
  const token = generateToken(newUser);
  
  return {
    user: {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name,
      company: newUser.company,
      permissions: newUser.permissions
    },
    token
  };
}

// Get default permissions for role
function getDefaultPermissions(role) {
  switch (role) {
    case 'super_admin':
      return ['all'];
    case 'admin':
      return ['properties', 'work_orders', 'finance', 'hr', 'crm', 'marketplace', 'support', 'compliance', 'reports', 'settings'];
    case 'property_manager':
      return ['properties', 'work_orders', 'finance', 'reports'];
    case 'employee':
      return ['work_orders', 'support'];
    case 'vendor':
      return ['marketplace', 'support'];
    default:
      return ['support'];
  }
}

// Check if user has permission
function hasPermission(user, permission) {
  if (!user || !user.permissions) return false;
  if (user.permissions.includes('all')) return true;
  return user.permissions.includes(permission);
}

// Middleware to authenticate requests
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required. Please login to access this resource.',
        code: 'UNAUTHORIZED',
        timestamp: new Date().toISOString()
      }
    });
  }
  
  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid or expired token. Please login again.',
        code: 'UNAUTHORIZED',
        timestamp: new Date().toISOString()
      }
    });
  }
  
  req.user = user;
  next();
}

// Middleware to check permissions
function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions to access this resource.',
          code: 'FORBIDDEN',
          timestamp: new Date().toISOString()
        }
      });
    }
    next();
  };
}

module.exports = {
  loginUser,
  registerUser,
  findUserById,
  verifyToken,
  authenticateToken,
  requirePermission,
  hasPermission,
  generateToken
};