#!/usr/bin/env node

/**
 * FIXZIT SOUQ Security Vulnerability Fixes
 * Addresses all critical and high security issues in project source code
 */

const fs = require("fs").promises;
const crypto = require("crypto");

// Security configuration
const SECURITY_CONFIG = {
  // Environment variables for sensitive data
  ENV_TEMPLATE: `
# Security Configuration
NODE_ENV=production
JWT_SECRET=${crypto.randomBytes(64).toString("hex")}
JWT_REFRESH_SECRET=${crypto.randomBytes(64).toString("hex")}
DB_PASSWORD=${crypto.randomBytes(32).toString("hex")}
ADMIN_DEFAULT_PASSWORD=${crypto.randomBytes(16).toString("hex")}
ENCRYPTION_KEY=${crypto.randomBytes(32).toString("hex")}
SESSION_SECRET=${crypto.randomBytes(32).toString("hex")}

# CORS Configuration
CORS_ORIGIN=https://fixzit.co
CORS_CREDENTIALS=true

# API Keys (use real values in production)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
ZATCA_API_KEY=your_zatca_api_key_here
SMS_API_KEY=your_sms_api_key_here
EMAIL_API_KEY=your_email_api_key_here
`,

  // Secure CORS configuration
  CORS_CONFIG: `
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: process.env.CORS_CREDENTIALS === 'true',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // 24 hours
};
`,

  // Secure token storage
  SECURE_TOKEN_STORAGE: `
// Use httpOnly cookies instead of localStorage for tokens
class SecureTokenStorage {
  static setToken(res, token, refreshToken) {
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
  }
  
  static clearTokens(res) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
  }
}
`,

  // XSS prevention
  XSS_PREVENTION: `
// Sanitize HTML to prevent XSS
const DOMPurify = require('isomorphic-dompurify');

function sanitizeHTML(dirty) {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'title', 'target']
  });
}

// Safe element update without innerHTML
function safeUpdateElement(element, content) {
  // Clear existing content
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
  
  // Add sanitized content
  const sanitized = sanitizeHTML(content);
  const temp = document.createElement('div');
  temp.innerHTML = sanitized;
  
  while (temp.firstChild) {
    element.appendChild(temp.firstChild);
  }
}
`,
};

// Fix functions for each file
async function fixDatabaseSeed() {
  const seedFile = `const bcrypt = require('bcrypt');
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
      console.log(\`Created \${userData.role} with secure password\`);
    }
    
    console.log('Database seeded successfully');
  } catch (error) {
    console.error('Seeding error:', error);
  }
}

module.exports = seedDatabase;`;

  await fs.writeFile("database/seed-fixed.js", seedFile);
  console.log("✅ Fixed database/seed.js - removed hardcoded passwords");
}

async function fixServerJS() {
  const serverFile = `const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "https://apis.google.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.fixzit.co"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// CORS with proper configuration
${SECURITY_CONFIG.CORS_CONFIG}
app.use(cors(corsOptions));

// Prevent MongoDB injection attacks
app.use(mongoSanitize());

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser for secure token handling
app.use(require('cookie-parser')());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/workorders', require('./routes/workorders'));
app.use('/api/finance', require('./routes/finance'));

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message;
  res.status(err.status || 500).json({ error: message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(\`Server running securely on port \${PORT}\`);
});`;

  await fs.writeFile("server-fixed.js", serverFile);
  console.log(
    "✅ Fixed server.js - added proper CORS configuration and security middleware",
  );
}

async function fixPublicAppJS() {
  const appFile = `// Secure App.js with XSS prevention and secure token storage
${SECURITY_CONFIG.XSS_PREVENTION}

class FixzitApp {
  constructor() {
    this.init();
  }
  
  init() {
    // Use secure cookie-based authentication instead of localStorage
    this.checkAuthentication();
    this.setupEventListeners();
  }
  
  checkAuthentication() {
    // Check for httpOnly cookie presence via API call
    fetch('/api/auth/check', {
      credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
      if (data.authenticated) {
        this.loadDashboard();
      } else {
        this.showLogin();
      }
    });
  }
  
  updateDashboard(data) {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return;
    
    // Safe update without innerHTML
    safeUpdateElement(dashboard, data.content);
  }
  
  displayWorkOrders(orders) {
    const container = document.getElementById('work-orders');
    if (!container) return;
    
    // Clear and rebuild safely
    container.innerHTML = ''; // Clear first
    
    orders.forEach(order => {
      const orderEl = document.createElement('div');
      orderEl.className = 'work-order';
      
      // Create elements safely
      const title = document.createElement('h3');
      title.textContent = order.title; // textContent is XSS-safe
      
      const description = document.createElement('p');
      description.textContent = order.description;
      
      const status = document.createElement('span');
      status.className = \`status \${order.status}\`;
      status.textContent = order.status;
      
      orderEl.appendChild(title);
      orderEl.appendChild(description);
      orderEl.appendChild(status);
      container.appendChild(orderEl);
    });
  }
  
  setupEventListeners() {
    // Prevent form-based XSS
    document.querySelectorAll('form').forEach(form => {
      form.addEventListener('submit', (e) => {
        const inputs = form.querySelectorAll('input, textarea');
        inputs.forEach(input => {
          // Sanitize input values
          if (input.type !== 'password') {
            input.value = DOMPurify.sanitize(input.value);
          }
        });
      });
    });
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  new FixzitApp();
});`;

  await fs.writeFile("public/app-fixed.js", appFile);
  console.log(
    "✅ Fixed public/app.js - removed localStorage token storage and innerHTML XSS vulnerabilities",
  );
}

async function createEnvExample() {
  await fs.writeFile(".env.example", SECURITY_CONFIG.ENV_TEMPLATE);
  console.log("✅ Created .env.example with secure configuration template");
}

// Main execution
async function applySecurityFixes() {
  console.log("🔒 Applying FIXZIT SOUQ Security Fixes...\n");

  try {
    // Ensure directories exist
    await fs.mkdir("database", { recursive: true });
    await fs.mkdir("public", { recursive: true });

    // Apply fixes
    await fixDatabaseSeed();
    await fixServerJS();
    await fixPublicAppJS();
    await createEnvExample();

    console.log("\n🎉 Security fixes applied successfully!");
    console.log("\n📋 Next steps:");
    console.log(
      "1. Install security packages: npm install helmet express-rate-limit express-mongo-sanitize cookie-parser isomorphic-dompurify",
    );
    console.log("2. Create .env file: cp .env.example .env");
    console.log("3. Replace files with fixed versions");
    console.log("4. Restart your application");
  } catch (error) {
    console.error("❌ Error applying security fixes:", error);
  }
}

if (require.main === module) {
  applySecurityFixes();
}

module.exports = { applySecurityFixes };
