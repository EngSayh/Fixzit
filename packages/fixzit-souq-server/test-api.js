const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { loginUser, registerUser, authenticateToken } = require('../../lib/auth-server');

const app = express();
const PORT = 5000;

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Fixzit Souq Server - Test Mode',
    port: PORT,
    timestamp: new Date().toISOString(),
    database: { status: 'test_mode' }
  });
});

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email and password are required',
          code: 'MISSING_CREDENTIALS',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const result = await loginUser(email, password);
    
    res.json({
      success: true,
      data: result,
      message: 'Login successful'
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        message: error.message,
        code: 'LOGIN_FAILED',
        timestamp: new Date().toISOString()
      }
    });
  }
});

app.get('/api/auth/session', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      user: req.user,
      authenticated: true
    }
  });
});

// Test endpoint with authentication
app.get('/api/test', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'API is working',
      user: req.user,
      timestamp: new Date().toISOString()
    }
  });
});

// Mock data endpoints
app.get('/api/properties', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        name: 'Central Business Tower',
        address: 'King Fahd Road, Riyadh',
        type: 'commercial',
        units: 50,
        occupancyRate: 85,
        monthlyRevenueSar: 250000,
        city: 'Riyadh',
        country: 'Saudi Arabia'
      },
      {
        id: '2',
        name: 'Al-Nakheel Residential Complex',
        address: 'Prince Mohammed bin Salman Road, Jeddah',
        type: 'residential',
        units: 120,
        occupancyRate: 92,
        monthlyRevenueSar: 180000,
        city: 'Jeddah',
        country: 'Saudi Arabia'
      }
    ]
  });
});

app.get('/api/work-orders', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        code: 'WO-2025-001',
        title: 'HVAC Maintenance - Floor 15',
        description: 'Regular maintenance of HVAC system on floor 15',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        assignedTo: 'Ahmed Al-Rashid'
      },
      {
        id: '2',
        code: 'WO-2025-002',
        title: 'Elevator Repair - Building A',
        description: 'Elevator not working properly, needs inspection',
        priority: 'HIGH',
        status: 'NEW',
        assignedTo: 'Mohammed Al-Sayed'
      }
    ]
  });
});

app.get('/api/dashboard', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      totalProperties: 3,
      totalUnits: 195,
      avgOccupancy: 85,
      totalRevenue: 525000,
      pendingWorkOrders: 5,
      activeTickets: 12,
      monthlyGrowth: 12.5
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 FIXZIT SOUQ Server running on port ${PORT}`);
  console.log(`📊 Test mode - No database required`);
  console.log(`🔐 Authentication enabled`);
  console.log(`🌐 CORS enabled for localhost:3000`);
});