# FIXZIT SOUQ Enterprise - API Documentation

**Version:** 2.0.26  
**Base URL:** `http://localhost:5000`  
**Authentication:** JWT Bearer Token  
**Last Updated:** September 20, 2025  

---

## 🚀 Quick Start

### Authentication
All API endpoints (except health check and login) require authentication via JWT Bearer token.

```bash
# Login to get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fixzit.com","password":"password"}'

# Use token in subsequent requests
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/properties
```

### Test Credentials
| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Super Admin | admin@fixzit.com | password | All |
| Admin | manager@fixzit.com | password | Properties, Work Orders, Finance, HR, CRM, Marketplace, Support, Compliance, Reports, Settings |
| Property Manager | property@fixzit.com | password | Properties, Work Orders, Finance, Reports |
| Employee | employee@fixzit.com | password | Work Orders, Support |
| Vendor | vendor@fixzit.com | password | Marketplace, Support |

---

## 📋 API Endpoints

### 🔐 Authentication Endpoints

#### POST `/api/auth/login`
Login to get authentication token.

**Request Body:**
```json
{
  "email": "admin@fixzit.com",
  "password": "password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "1",
      "email": "admin@fixzit.com",
      "role": "super_admin",
      "name": "System Administrator",
      "company": "FIXZIT SOUQ",
      "permissions": ["all"]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful"
}
```

#### GET `/api/auth/session`
Get current user session information.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "1",
      "email": "admin@fixzit.com",
      "role": "super_admin",
      "name": "System Administrator",
      "company": "FIXZIT SOUQ",
      "permissions": ["all"]
    },
    "authenticated": true
  }
}
```

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "email": "newuser@fixzit.com",
  "password": "password123",
  "name": "New User",
  "role": "employee",
  "company": "FIXZIT SOUQ"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "5",
      "email": "newuser@fixzit.com",
      "role": "employee",
      "name": "New User",
      "company": "FIXZIT SOUQ",
      "permissions": ["work_orders", "support"]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Registration successful"
}
```

#### POST `/api/auth/logout`
Logout current user.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### 🏢 Properties Management

#### GET `/api/properties`
Get all properties.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "Central Business Tower",
      "address": "King Fahd Road, Riyadh",
      "type": "commercial",
      "units": 50,
      "occupancyRate": 85,
      "monthlyRevenueSar": 250000,
      "city": "Riyadh",
      "country": "Saudi Arabia"
    },
    {
      "id": "2",
      "name": "Al-Nakheel Residential Complex",
      "address": "Prince Mohammed bin Salman Road, Jeddah",
      "type": "residential",
      "units": 120,
      "occupancyRate": 92,
      "monthlyRevenueSar": 180000,
      "city": "Jeddah",
      "country": "Saudi Arabia"
    }
  ]
}
```

#### POST `/api/properties`
Create a new property.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

**Request Body:**
```json
{
  "name": "New Property",
  "address": "123 Main Street, Riyadh",
  "type": "commercial",
  "units": 25,
  "occupancyRate": 0,
  "monthlyRevenueSar": 0,
  "city": "Riyadh",
  "country": "Saudi Arabia"
}
```

#### GET `/api/properties/:id`
Get property by ID.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

#### PUT `/api/properties/:id`
Update property by ID.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

#### DELETE `/api/properties/:id`
Delete property by ID.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

---

### 🔧 Work Orders Management

#### GET `/api/work-orders`
Get all work orders.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "code": "WO-2025-001",
      "title": "HVAC Maintenance - Floor 15",
      "description": "Regular maintenance of HVAC system on floor 15",
      "priority": "MEDIUM",
      "status": "IN_PROGRESS",
      "assignedTo": "Ahmed Al-Rashid"
    },
    {
      "id": "2",
      "code": "WO-2025-002",
      "title": "Elevator Repair - Building A",
      "description": "Elevator not working properly, needs inspection",
      "priority": "HIGH",
      "status": "NEW",
      "assignedTo": "Mohammed Al-Sayed"
    }
  ]
}
```

#### POST `/api/work-orders`
Create a new work order.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

**Request Body:**
```json
{
  "code": "WO-2025-003",
  "title": "New Work Order",
  "description": "Description of the work order",
  "priority": "HIGH",
  "status": "NEW",
  "assignedTo": "Technician Name"
}
```

#### GET `/api/work-orders/:id`
Get work order by ID.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

#### PUT `/api/work-orders/:id`
Update work order by ID.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

#### DELETE `/api/work-orders/:id`
Delete work order by ID.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

---

### 📊 Dashboard & Analytics

#### GET `/api/dashboard`
Get dashboard summary data.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalProperties": 3,
    "totalUnits": 195,
    "avgOccupancy": 85,
    "totalRevenue": 525000,
    "pendingWorkOrders": 5,
    "activeTickets": 12,
    "monthlyGrowth": 12.5
  }
}
```

---

### 💰 Finance Management

#### GET `/api/finance/invoices`
Get all invoices.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

#### POST `/api/finance/invoices`
Create a new invoice.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

#### GET `/api/finance/reports`
Get financial reports.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

---

### 👥 Human Resources

#### GET `/api/hr/employees`
Get all employees.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

#### POST `/api/hr/employees`
Create a new employee.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

#### GET `/api/hr/payroll`
Get payroll information.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

---

### 🤝 Customer Relationship Management

#### GET `/api/crm/contacts`
Get all contacts.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

#### POST `/api/crm/contacts`
Create a new contact.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

#### GET `/api/crm/leads`
Get all leads.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

---

### 🛒 Marketplace

#### GET `/api/marketplace/vendors`
Get all vendors.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

#### GET `/api/marketplace/products`
Get all products.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

#### POST `/api/marketplace/orders`
Create a new order.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

---

### 🎫 Support System

#### GET `/api/support/tickets`
Get all support tickets.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

#### POST `/api/support/tickets`
Create a new support ticket.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

#### PUT `/api/support/tickets/:id`
Update support ticket.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

---

### 📋 Compliance Management

#### GET `/api/compliance/documents`
Get all compliance documents.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

#### POST `/api/compliance/documents`
Upload compliance document.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

#### GET `/api/compliance/audits`
Get compliance audits.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

---

### 📈 Reports & Analytics

#### GET `/api/reports/analytics`
Get analytics data.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

#### GET `/api/reports/export`
Export reports.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

#### GET `/api/reports/custom`
Get custom reports.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

---

### ⚙️ System Administration

#### GET `/api/admin/users`
Get all users.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

#### POST `/api/admin/users`
Create a new user.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

#### GET `/api/admin/settings`
Get system settings.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

#### PUT `/api/admin/settings`
Update system settings.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

---

### 🔧 System Health

#### GET `/health`
Get system health status.

**No Authentication Required**

**Response:**
```json
{
  "status": "ok",
  "service": "Fixzit Souq Server - Test Mode",
  "port": 5000,
  "timestamp": "2025-09-20T12:07:51.173Z",
  "database": {
    "status": "test_mode"
  }
}
```

#### GET `/api/test`
Test authenticated endpoint.

**Headers:** `Authorization: Bearer YOUR_TOKEN`

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "API is working",
    "user": {
      "id": "1",
      "email": "admin@fixzit.com",
      "role": "super_admin",
      "name": "System Administrator",
      "company": "FIXZIT SOUQ",
      "permissions": ["all"]
    },
    "timestamp": "2025-09-20T12:07:51.173Z"
  }
}
```

---

## 🔒 Authentication & Authorization

### JWT Token Structure
```json
{
  "id": "1",
  "email": "admin@fixzit.com",
  "role": "super_admin",
  "name": "System Administrator",
  "company": "FIXZIT SOUQ",
  "permissions": ["all"],
  "iat": 1758370040,
  "exp": 1758974840
}
```

### Role-Based Permissions

| Role | Permissions |
|------|-------------|
| **super_admin** | All permissions |
| **admin** | Properties, Work Orders, Finance, HR, CRM, Marketplace, Support, Compliance, Reports, Settings |
| **property_manager** | Properties, Work Orders, Finance, Reports |
| **employee** | Work Orders, Support |
| **vendor** | Marketplace, Support |

### Error Responses

#### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "message": "Authentication required. Please login to access this resource.",
    "code": "UNAUTHORIZED",
    "timestamp": "2025-09-20T12:07:51.173Z"
  }
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "message": "Insufficient permissions to access this resource.",
    "code": "FORBIDDEN",
    "timestamp": "2025-09-20T12:07:51.173Z"
  }
}
```

#### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "message": "Email and password are required",
    "code": "MISSING_CREDENTIALS",
    "timestamp": "2025-09-20T12:07:51.173Z"
  }
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "message": "Internal server error",
    "code": "INTERNAL_ERROR",
    "timestamp": "2025-09-20T12:07:51.173Z"
  }
}
```

---

## 🌐 Frontend Integration

### Login Flow
1. User submits login form with email/password
2. Frontend sends POST request to `/api/auth/login`
3. Backend returns JWT token and user data
4. Frontend stores token in localStorage
5. Frontend includes token in all subsequent API requests

### Example Frontend Code
```javascript
// Login function
async function login(email, password) {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (data.success) {
    localStorage.setItem('auth_token', data.data.token);
    localStorage.setItem('user', JSON.stringify(data.data.user));
    return true;
  }
  return false;
}

// API request with authentication
async function fetchProperties() {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch('http://localhost:5000/api/properties', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  return response.json();
}
```

---

## 🚀 Deployment

### Environment Variables
```bash
# Backend (.env)
MONGODB_URI=mongodb://localhost:27017/fixzit_souq
PORT=5000
NODE_ENV=production
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://yourdomain.com

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=FIXZIT SOUQ Enterprise
NEXT_PUBLIC_VERSION=2.0.26
```

### Production Setup
1. Install dependencies: `npm install`
2. Set environment variables
3. Start backend: `npm start`
4. Start frontend: `npm run build && npm start`
5. Configure reverse proxy (nginx/Apache)
6. Set up SSL certificates
7. Configure database connection

---

## 📞 Support

For API support and questions:
- **Email:** support@fixzit.com
- **Documentation:** https://docs.fixzit.com
- **Status Page:** https://status.fixzit.com

---

*API Documentation v2.0.26 - FIXZIT SOUQ Enterprise*