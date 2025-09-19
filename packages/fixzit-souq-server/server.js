const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { connectDatabase, getDatabaseStatus } = require('./db');
const propertiesRouter = require('./routes/properties');
const workOrdersRouter = require('./routes/workorders');
const seedRouter = require('./routes/seed');
const hrRouter = require('./routes/hr');
const financeRouter = require('./routes/finance');
const supportRouter = require('./routes/support');

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

// API routes
app.use('/api/properties', propertiesRouter);
app.use('/api/workorders', workOrdersRouter);
app.use('/api/hr', hrRouter);
app.use('/api/finance', financeRouter);
app.use('/api/support', supportRouter);
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

// Marketplace API routes
app.get('/api/marketplace/vendors', (req, res) => {
    res.json({ vendors: [], message: 'Vendors endpoint operational' });
});

app.get('/api/marketplace/products', (req, res) => {
    res.json({ products: [], message: 'Products endpoint operational' });
});

app.get('/api/marketplace/rfqs', (req, res) => {
    res.json({ rfqs: [], message: 'RFQs endpoint operational' });
});

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