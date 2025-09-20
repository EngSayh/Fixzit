const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { connectDatabase, getDatabaseStatus } = require('./db');
const { loginUser, registerUser, authenticateToken, findUserById } = require('../../lib/auth-server');
const propertiesRouter = require('./routes/properties');
const workOrdersRouter = require('./routes/workorders');
const seedRouter = require('./routes/seed');
const hrRouter = require('./routes/hr');
const financeRouter = require('./routes/finance');
const supportRouter = require('./routes/support');
const marketplaceRouter = require('./routes/marketplace');
const crmRouter = require('./routes/crm');
const complianceRouter = require('./routes/compliance');
const iotRouter = require('./routes/iot');
const analyticsRouter = require('./routes/analytics');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = Number(process.env.PORT || process.env.SOUQ_PORT || 5000);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(cors());
app.use(compression());

// Body parsing - BEFORE mongo sanitize
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom sanitization (avoiding conflict)
app.use((req, res, next) => {
    // Simple sanitization without property conflicts
    const sanitize = (obj) => {
        if (!obj) return obj;
        const cleaned = {};
        for (let key in obj) {
            if (typeof obj[key] === 'string') {
                cleaned[key] = obj[key].replace(/[$]/g, '');
            } else if (typeof obj[key] === 'object') {
                cleaned[key] = sanitize(obj[key]);
            } else {
                cleaned[key] = obj[key];
            }
        }
        return cleaned;
    };
    
    req.query = sanitize(req.query);
    req.body = sanitize(req.body);
    next();
});

// Health check
app.get('/health', (req, res) => {
    const db = getDatabaseStatus();
    res.json({ 
        status: 'ok', 
        service: 'Fixzit Souq Server',
        port: PORT,
        timestamp: new Date().toISOString(),
        database: {
            status: db.connected ? 'connected' : 'disconnected',
            lastConnectedAt: db.lastConnectedAt,
            error: db.error || null,
        }
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

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name, role, company } = req.body;
        
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                error: {
                    message: 'Email, password, and name are required',
                    code: 'MISSING_FIELDS',
                    timestamp: new Date().toISOString()
                }
            });
        }
        
        const result = await registerUser({ email, password, name, role, company });
        
        res.status(201).json({
            success: true,
            data: result,
            message: 'Registration successful'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: {
                message: error.message,
                code: 'REGISTRATION_FAILED',
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

app.post('/api/auth/logout', (req, res) => {
    res.json({
        success: true,
        message: 'Logout successful'
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

// API routes (all protected with authentication)
app.use('/api/properties', authenticateToken, propertiesRouter);
app.use('/api/workorders', authenticateToken, workOrdersRouter);
app.use('/api/hr', authenticateToken, hrRouter);
app.use('/api/finance', authenticateToken, financeRouter);
app.use('/api/support', authenticateToken, supportRouter);
app.use('/api/marketplace', authenticateToken, marketplaceRouter);
app.use('/api/crm', authenticateToken, crmRouter);
app.use('/api/compliance', authenticateToken, complianceRouter);
app.use('/api/iot', authenticateToken, iotRouter);
app.use('/api/analytics', authenticateToken, analyticsRouter);
app.use('/api/admin', authenticateToken, adminRouter);
if (process.env.NODE_ENV !== 'production') {
    app.use('/api/seed', seedRouter);
}

// Dashboard summary API
app.get('/api/dashboard', async (req, res) => {
    try {
        const Property = require('./models/Property');
        const WorkOrder = require('./models/WorkOrder');
        const [propertiesCount, workOrdersCount] = await Promise.all([
            Property.countDocuments(),
            WorkOrder.countDocuments(),
        ]);
        return res.json({ success: true, data: { propertiesCount, workOrdersCount } });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Optionally serve static theme for demo
app.use('/theme', express.static(path.join(__dirname, '../../public/public')));

// Marketplace endpoints moved to dedicated router when implemented

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server immediately; connect to DB in background
connectDatabase().catch(() => {});

app.listen(PORT, () => {
    console.log(`✅ Fixzit Souq Server running on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    const db = getDatabaseStatus();
    console.log(`   DB: ${db.connected ? 'connected' : 'disconnected'}${db.error ? ' — ' + db.error : ''}`);
});