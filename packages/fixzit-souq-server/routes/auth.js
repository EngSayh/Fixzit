const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');

// MongoDB connection
let db;
const connectDB = async () => {
  if (db) return db;
  try {
    const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit');
    await client.connect();
    db = client.db();
    console.log('Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
};

// Initialize demo users in MongoDB
const initializeUsers = async () => {
  try {
    const database = await connectDB();
    const usersCollection = database.collection('users');
    
    // Check if users already exist
    const existingUser = await usersCollection.findOne({ email: 'admin@fixzit.co' });
    if (existingUser) return;
    
    // Create demo users
    const demoPassword = bcrypt.hashSync('password123', 10);
    const demoUsers = [
      {
        email: 'admin@fixzit.co',
        password: demoPassword,
        name: 'Admin User',
        role: 'SUPER_ADMIN',
        tenantId: 'default',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'vendor@fixzit.co',
        password: demoPassword,
        name: 'Vendor User',
        role: 'VENDOR',
        tenantId: 'default',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        email: 'customer@fixzit.co',
        password: demoPassword,
        name: 'Customer User',
        role: 'CUSTOMER',
        tenantId: 'default',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    await usersCollection.insertMany(demoUsers);
    console.log('Demo users created in MongoDB');
  } catch (error) {
    console.error('Error initializing users:', error);
  }
};

// Initialize users on startup
initializeUsers();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Connect to MongoDB
    const database = await connectDB();
    const usersCollection = database.collection('users');
    
    // Find user in MongoDB
    const user = await usersCollection.findOne({ email });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        tenantId: user.tenantId
      },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      ok: true,
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      
      // Connect to MongoDB
      const database = await connectDB();
      const usersCollection = database.collection('users');
      
      // Find user in MongoDB
      const user = await usersCollection.findOne({ _id: new require('mongodb').ObjectId(decoded.id) });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json({
        ok: true,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId
        }
      });
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Auth check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  // Since we're using JWT, logout is handled client-side by removing the token
  res.json({ ok: true, message: 'Logged out successfully' });
});

module.exports = router;
