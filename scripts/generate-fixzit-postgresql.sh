#!/bin/bash
# FIXZIT SOUQ - PostgreSQL Integration
echo "🚀 Setting up FIXZIT SOUQ with PostgreSQL backend..."

# Create clean backend structure
mkdir -p fixzit-postgres/{backend,frontend}
cd fixzit-postgres

# Backend package.json (clean dependencies)
cat > backend/package.json << 'EOF'
{
  "name": "fixzit-backend-postgres",
  "version": "2.0.26",
  "type": "module",
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js",
    "seed": "node seed.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.3.1",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "winston": "^3.11.0",
    "socket.io": "^4.5.4",
    "pg": "^8.11.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
EOF

# Simple PostgreSQL backend
cat > backend/server.js << 'EOF'
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import winston from 'winston';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pkg from 'pg';
const { Pool } = pkg;
import { v4 as uuidv4 } from 'uuid';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
pool.connect()
  .then(() => {
    console.log('✅ PostgreSQL connected');
    logger.info('PostgreSQL connected successfully');
  })
  .catch(err => {
    console.error('❌ PostgreSQL connection error:', err);
    logger.error('PostgreSQL connection error:', err);
  });

// Auth middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new Error('No token');
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fixzit-secret-key');
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    
    if (result.rows.length === 0) throw new Error('User not found');
    
    req.user = result.rows[0];
    req.orgId = req.user.org_id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// ==================== AUTH ROUTES ====================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query(`
      SELECT u.*, o.name as org_name 
      FROM users u 
      LEFT JOIN organizations o ON u.org_id = o.id 
      WHERE u.email = $1
    `, [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user.id, orgId: user.org_id, role: user.role }, 
      process.env.JWT_SECRET || 'fixzit-secret-key'
    );
    
    // Update last login
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
    
    res.json({ 
      token, 
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organization: user.org_name
      }
    });
    
    logger.info(`User ${email} logged in successfully`);
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, orgName } = req.body;
    
    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    let orgId;
    if (orgName) {
      // Create or find organization
      const orgResult = await pool.query(`
        INSERT INTO organizations (id, name, subdomain, plan, is_active) 
        VALUES ($1, $2, $3, $4, $5) 
        ON CONFLICT (subdomain) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `, [uuidv4(), orgName, orgName.toLowerCase().replace(/\s+/g, '-'), 'basic', true]);
      
      orgId = orgResult.rows[0].id;
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = uuidv4();
    
    await pool.query(`
      INSERT INTO users (id, email, password, first_name, last_name, role, org_id, is_active) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [userId, email, hashedPassword, firstName, lastName, role || 'TENANT', orgId, true]);
    
    res.status(201).json({ message: 'User created successfully', userId });
    logger.info(`New user registered: ${email}`);
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== DASHBOARD ====================
app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM properties WHERE org_id = $1) as properties,
        (SELECT COUNT(*) FROM units WHERE org_id = $1) as units,
        (SELECT COUNT(*) FROM work_orders WHERE org_id = $1 AND status IN ('OPEN', 'IN_PROGRESS')) as active_work_orders,
        (SELECT COUNT(*) FROM work_orders WHERE org_id = $1 AND status = 'COMPLETED') as completed_work_orders
    `, [req.orgId]);
    
    res.json(stats.rows[0]);
  } catch (error) {
    logger.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== WORK ORDERS ====================
app.get('/api/work-orders', authMiddleware, async (req, res) => {
  try {
    const { status, priority, limit = 50 } = req.query;
    let query = `
      SELECT wo.*, p.name as property_name, p.address as property_address,
             u_assigned.first_name || ' ' || u_assigned.last_name as assigned_to_name,
             u_created.first_name || ' ' || u_created.last_name as created_by_name
      FROM work_orders wo
      LEFT JOIN properties p ON wo.property_id = p.id
      LEFT JOIN users u_assigned ON wo.assigned_to = u_assigned.id
      LEFT JOIN users u_created ON wo.created_by = u_created.id
      WHERE wo.org_id = $1
    `;
    
    const queryParams = [req.orgId];
    let paramCount = 1;
    
    if (status) {
      paramCount++;
      query += ` AND wo.status = $${paramCount}`;
      queryParams.push(status);
    }
    
    if (priority) {
      paramCount++;
      query += ` AND wo.priority = $${paramCount}`;
      queryParams.push(priority);
    }
    
    query += ` ORDER BY wo.created_at DESC LIMIT $${paramCount + 1}`;
    queryParams.push(parseInt(limit, 10));
    
    const result = await pool.query(query, queryParams);
    res.json(result.rows);
  } catch (error) {
    logger.error('Fetch work orders error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/work-orders', authMiddleware, async (req, res) => {
  try {
    const { title, description, category, priority, propertyId, unitId, assignedTo } = req.body;
    const woNumber = `WO-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
    const workOrderId = uuidv4();
    
    await pool.query(`
      INSERT INTO work_orders (
        id, wo_number, title, description, category, priority, status,
        property_id, unit_id, assigned_to, created_by, org_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      workOrderId, woNumber, title, description || '', category || 'general',
      priority || 'MEDIUM', 'OPEN', propertyId, unitId, assignedTo, 
      req.user.id, req.orgId
    ]);
    
    // Get the created work order with joins
    const result = await pool.query(`
      SELECT wo.*, p.name as property_name,
             u_assigned.first_name || ' ' || u_assigned.last_name as assigned_to_name,
             u_created.first_name || ' ' || u_created.last_name as created_by_name
      FROM work_orders wo
      LEFT JOIN properties p ON wo.property_id = p.id
      LEFT JOIN users u_assigned ON wo.assigned_to = u_assigned.id
      LEFT JOIN users u_created ON wo.created_by = u_created.id
      WHERE wo.id = $1
    `, [workOrderId]);
    
    const workOrder = result.rows[0];
    
    // Emit real-time notification
    io.to(`org-${req.orgId}`).emit('workOrderCreated', workOrder);
    
    res.status(201).json(workOrder);
    logger.info(`Work order created: ${woNumber}`);
  } catch (error) {
    logger.error('Create work order error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== PROPERTIES ====================
app.get('/api/properties', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, 
             (SELECT COUNT(*) FROM units WHERE property_id = p.id) as total_units,
             (SELECT COUNT(*) FROM units WHERE property_id = p.id AND status = 'occupied') as occupied_units
      FROM properties p 
      WHERE p.org_id = $1 
      ORDER BY p.created_at DESC
    `, [req.orgId]);
    
    res.json(result.rows);
  } catch (error) {
    logger.error('Fetch properties error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/properties', authMiddleware, async (req, res) => {
  try {
    const { name, address, type, totalUnits } = req.body;
    const propertyId = uuidv4();
    
    await pool.query(`
      INSERT INTO properties (id, name, address, type, total_units, org_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [propertyId, name, address, type || 'residential', totalUnits || 0, req.orgId, req.user.id]);
    
    const result = await pool.query('SELECT * FROM properties WHERE id = $1', [propertyId]);
    res.status(201).json(result.rows[0]);
    logger.info(`Property created: ${name}`);
  } catch (error) {
    logger.error('Create property error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '2.0.26',
    database: 'PostgreSQL',
    modules: ['Dashboard', 'WorkOrders', 'Properties', 'Finance', 'HR', 'Marketplace', 'CRM', 'Support', 'Compliance', 'Admin', 'Reports', 'IoT', 'System', 'Souq', 'Aqar']
  });
});

// ==================== SOCKET.IO ====================
io.on('connection', (socket) => {
  console.log('Client connected');
  
  socket.on('join-org', (orgId) => {
    socket.join(`org-${orgId}`);
    console.log(`Client joined org-${orgId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`✅ FIXZIT SOUQ Backend running on port ${PORT}`);
  console.log(`🔗 Database: PostgreSQL`);
  console.log(`🔌 Socket.IO enabled`);
  logger.info(`Server started on port ${PORT}`);
});
EOF

# Create database schema
cat > backend/init-db.sql << 'EOF'
-- FIXZIT SOUQ PostgreSQL Schema

-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) DEFAULT 'basic',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users with 14 roles
CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN', 'ADMIN', 'PROPERTY_MANAGER', 'MAINTENANCE_MANAGER',
  'TECHNICIAN', 'TENANT', 'OWNER', 'FINANCE_OFFICER', 'HR_OFFICER',
  'LEGAL_COMPLIANCE', 'CRM_SALES', 'SUPPORT_AGENT', 'VENDOR', 'VIEWER'
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role user_role NOT NULL,
  org_id UUID REFERENCES organizations(id),
  phone VARCHAR(20),
  avatar VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Properties
CREATE TYPE property_type AS ENUM ('residential', 'commercial', 'mixed');

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  type property_type DEFAULT 'residential',
  org_id UUID REFERENCES organizations(id) NOT NULL,
  created_by UUID REFERENCES users(id),
  total_units INTEGER DEFAULT 0,
  area_sqm DECIMAL,
  year_built INTEGER,
  monthly_revenue DECIMAL,
  monthly_expenses DECIMAL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Units
CREATE TYPE unit_status AS ENUM ('vacant', 'occupied', 'maintenance', 'reserved');

CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) NOT NULL,
  unit_number VARCHAR(50) NOT NULL,
  type VARCHAR(50),
  bedrooms INTEGER,
  bathrooms INTEGER,
  area_sqm DECIMAL,
  floor_number INTEGER,
  rent_amount DECIMAL,
  status unit_status DEFAULT 'vacant',
  tenant_id UUID REFERENCES users(id),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(property_id, unit_number)
);

-- Work Orders
CREATE TYPE wo_category AS ENUM ('hvac', 'plumbing', 'electrical', 'general', 'cleaning', 'maintenance');
CREATE TYPE wo_priority AS ENUM ('emergency', 'high', 'medium', 'low');
CREATE TYPE wo_status AS ENUM ('draft', 'open', 'assigned', 'in_progress', 'on_hold', 'completed', 'closed', 'cancelled');

CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category wo_category DEFAULT 'general',
  priority wo_priority DEFAULT 'medium',
  status wo_status DEFAULT 'draft',
  property_id UUID REFERENCES properties(id),
  unit_id UUID REFERENCES units(id),
  assigned_to UUID REFERENCES users(id),
  created_by UUID REFERENCES users(id),
  org_id UUID REFERENCES organizations(id) NOT NULL,
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  estimated_hours DECIMAL,
  actual_hours DECIMAL,
  estimated_cost DECIMAL,
  actual_cost DECIMAL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_properties_org_id ON properties(org_id);
CREATE INDEX IF NOT EXISTS idx_units_property_id ON units(property_id);
CREATE INDEX IF NOT EXISTS idx_units_org_id ON units(org_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_org_id ON work_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_property_id ON work_orders(property_id);

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EOF

# Database seed script
cat > backend/seed.js << 'EOF'
import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function seed() {
  console.log('🌱 Starting FIXZIT SOUQ seed process...');
  
  try {
    await pool.connect();
    console.log('✅ Connected to PostgreSQL');
    
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await pool.query('TRUNCATE TABLE work_orders, units, properties, users, organizations CASCADE');
    
    // Create Demo Organization
    console.log('🏢 Creating organization...');
    const orgId = uuidv4();
    await pool.query(`
      INSERT INTO organizations (id, name, subdomain, plan, is_active)
      VALUES ($1, $2, $3, $4, $5)
    `, [orgId, 'FIXZIT Demo Corporation', 'demo', 'enterprise', true]);
    
    // Create Users
    console.log('👥 Creating users...');
    const users = [
      {
        id: uuidv4(),
        email: 'admin@fixzit.com',
        password: 'Admin@123',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'SUPER_ADMIN'
      },
      {
        id: uuidv4(),
        email: 'manager@fixzit.com',
        password: 'Manager@123',
        firstName: 'Property',
        lastName: 'Manager',
        role: 'PROPERTY_MANAGER'
      },
      {
        id: uuidv4(),
        email: 'tech@fixzit.com',
        password: 'Tech@123',
        firstName: 'Lead',
        lastName: 'Technician',
        role: 'TECHNICIAN'
      }
    ];
    
    const createdUsers = [];
    for (const userData of users) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      await pool.query(`
        INSERT INTO users (id, email, password, first_name, last_name, role, org_id, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [userData.id, userData.email, hashedPassword, userData.firstName, userData.lastName, userData.role, orgId, true]);
      
      createdUsers.push(userData);
    }
    
    // Create Properties
    console.log('🏠 Creating properties...');
    const properties = [
      {
        id: uuidv4(),
        name: 'Sunset Towers',
        address: 'King Fahd Road, Riyadh 12345, Saudi Arabia',
        type: 'residential',
        totalUnits: 48
      },
      {
        id: uuidv4(),
        name: 'Business Plaza',
        address: 'Olaya Street, Riyadh 11372, Saudi Arabia',
        type: 'commercial',
        totalUnits: 24
      }
    ];
    
    const createdProperties = [];
    for (const propData of properties) {
      await pool.query(`
        INSERT INTO properties (id, name, address, type, total_units, org_id, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [propData.id, propData.name, propData.address, propData.type, propData.totalUnits, orgId, createdUsers[0].id]);
      
      createdProperties.push(propData);
    }
    
    // Create Units
    console.log('🏠 Creating units...');
    for (const property of createdProperties) {
      const unitCount = Math.min(property.totalUnits, 10); // Create 10 sample units
      for (let i = 1; i <= unitCount; i++) {
        const unitNumber = property.type === 'residential' ? `A${i.toString().padStart(3, '0')}` : `B${i.toString().padStart(3, '0')}`;
        await pool.query(`
          INSERT INTO units (id, property_id, unit_number, type, bedrooms, bathrooms, area_sqm, rent_amount, status, org_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          uuidv4(), property.id, unitNumber, 
          property.type === 'residential' ? '2BR' : 'Office',
          property.type === 'residential' ? 2 : 0,
          property.type === 'residential' ? 2 : 1,
          property.type === 'residential' ? 120 : 50,
          property.type === 'residential' ? 3500 : 5000,
          i <= unitCount * 0.8 ? 'occupied' : 'vacant',
          orgId
        ]);
      }
    }
    
    // Create Sample Work Orders
    console.log('🔧 Creating work orders...');
    const workOrders = [
      {
        title: 'Air Conditioning Repair',
        description: 'AC unit not cooling properly in unit A001. Requires immediate attention.',
        category: 'hvac',
        priority: 'high',
        status: 'open'
      },
      {
        title: 'Elevator Maintenance',
        description: 'Scheduled monthly maintenance for elevator in Business Plaza',
        category: 'maintenance',
        priority: 'medium',
        status: 'in_progress'
      },
      {
        title: 'Plumbing Issue',
        description: 'Water leak reported in bathroom of unit A025',
        category: 'plumbing',
        priority: 'high',
        status: 'completed'
      }
    ];
    
    for (const woData of workOrders) {
      const woNumber = `WO-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;
      await pool.query(`
        INSERT INTO work_orders (id, wo_number, title, description, category, priority, status, property_id, org_id, created_by, assigned_to)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        uuidv4(), woNumber, woData.title, woData.description, woData.category,
        woData.priority, woData.status, createdProperties[0].id, orgId, 
        createdUsers[0].id, woData.status === 'in_progress' ? createdUsers[2].id : null
      ]);
      
      // Small delay for unique timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    console.log('✅ FIXZIT SOUQ seed completed successfully!');
    console.log('');
    console.log('📋 Available Accounts:');
    console.log('🔑 Super Admin: admin@fixzit.com / Admin@123');
    console.log('🔑 Property Manager: manager@fixzit.com / Manager@123');
    console.log('🔑 Technician: tech@fixzit.com / Tech@123');
    console.log('');
    console.log('📊 Data Summary:');
    console.log(`🏢 Organizations: 1`);
    console.log(`👥 Users: ${createdUsers.length}`);
    console.log(`🏠 Properties: ${createdProperties.length}`);
    console.log(`🏠 Units: ${createdProperties.reduce((sum, p) => sum + Math.min(p.totalUnits, 10), 0)}`);
    console.log(`🔧 Work Orders: ${workOrders.length}`);
    
  } catch (error) {
    console.error('❌ Seed error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seed();
EOF

# Copy the complete 73-page frontend from the generated system
echo "📋 Copying complete frontend with 73 pages..."
cp -r ../fixzit-complete-docker/frontend/* frontend/

# Update frontend API configuration
cat > frontend/lib/api.ts << 'EOF'
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
EOF

echo "✅ FIXZIT SOUQ PostgreSQL setup complete!"
echo ""
echo "🚀 To run the complete system:"
echo "1. Run database init: psql \$DATABASE_URL -f backend/init-db.sql"
echo "2. Install dependencies: cd backend && npm install"
echo "3. Seed database: cd backend && npm run seed"
echo "4. Start backend: cd backend && npm run dev"
echo "5. Start frontend: cd frontend && npm run dev"
echo ""
echo "📱 Login: admin@fixzit.com / Admin@123"
echo "🌐 Frontend: http://localhost:3000 (73 pages)"
echo "🔗 Backend API: http://localhost:3001/api"