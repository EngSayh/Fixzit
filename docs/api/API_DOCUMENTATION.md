# Fixzit API Documentation

## Overview

The Fixzit API provides programmatic access to property management, work orders, finance, and HR functionality. All endpoints are RESTful and return JSON.

## Base URL

```
Production: https://api.fixzit.com/v1
Staging: https://staging-api.fixzit.com/v1
Development: http://localhost:3000/api
```

## Authentication

All API requests require authentication via session cookies or Bearer tokens.

### Session Authentication
```bash
# Login to obtain session cookie
curl -X POST https://api.fixzit.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "secret"}'

# Subsequent requests use the session cookie automatically
```

### CSRF Protection
State-changing requests (POST, PUT, DELETE, PATCH) require a CSRF token:
```bash
curl -X POST https://api.fixzit.com/api/work-orders \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <token_from_cookie>" \
  -d '{"title": "Fix AC", "priority": "high"}'
```

## Rate Limiting

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Login | 5 requests | 1 minute |
| General API | 100 requests | 1 minute |
| Bulk Operations | 10 requests | 1 minute |

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## Work Orders API

### List Work Orders
```http
GET /api/work-orders
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status (open, assigned, completed) |
| priority | string | Filter by priority (low, medium, high, emergency) |
| propertyId | string | Filter by property |
| page | number | Page number (default: 1) |
| limit | number | Items per page (default: 20, max: 100) |

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "wo-123",
        "title": "AC not cooling",
        "description": "Unit 101 AC stopped working",
        "status": "open",
        "priority": "high",
        "property": {
          "id": "prop-456",
          "name": "Al Mouj Residences"
        },
        "unit": {
          "id": "unit-789",
          "number": "101"
        },
        "createdAt": "2024-01-15T10:30:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

### Create Work Order
```http
POST /api/work-orders
```

**Request Body:**
```json
{
  "title": "Leaking pipe in bathroom",
  "description": "Water leaking from under the sink",
  "priority": "high",
  "category": "plumbing",
  "propertyId": "prop-456",
  "unitId": "unit-789",
  "scheduledDate": "2024-01-16T09:00:00Z",
  "attachments": ["https://storage.example.com/image1.jpg"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "wo-124",
    "title": "Leaking pipe in bathroom",
    "status": "submitted",
    "priority": "high",
    "createdAt": "2024-01-15T11:00:00Z"
  }
}
```

### Update Work Order Status
```http
PATCH /api/work-orders/:id/status
```

**Request Body:**
```json
{
  "status": "assigned",
  "assigneeId": "vendor-123",
  "notes": "Assigned to ABC Plumbing"
}
```

---

## Properties API

### List Properties
```http
GET /api/properties
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Filter by type (residential, commercial, mixed) |
| city | string | Filter by city |
| status | string | Filter by status (active, inactive) |

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "prop-456",
        "name": "Al Mouj Residences",
        "type": "residential",
        "address": {
          "street": "Al Mouj Street",
          "city": "Muscat",
          "country": "Oman"
        },
        "units": {
          "total": 100,
          "occupied": 85,
          "vacant": 15
        },
        "createdAt": "2023-06-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 25
    }
  }
}
```

### Get Property Details
```http
GET /api/properties/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "prop-456",
    "name": "Al Mouj Residences",
    "type": "residential",
    "address": {
      "street": "Al Mouj Street",
      "city": "Muscat",
      "country": "Oman",
      "coordinates": {
        "lat": 23.5880,
        "lng": 58.4129
      }
    },
    "buildings": [
      {
        "id": "bldg-001",
        "name": "Tower A",
        "floors": 15,
        "units": 60
      }
    ],
    "occupancy": {
      "rate": 85,
      "occupied": 85,
      "vacant": 15,
      "maintenance": 0
    },
    "financials": {
      "monthlyRent": 50000,
      "currency": "OMR"
    }
  }
}
```

---

## Finance API

### List Invoices
```http
GET /api/finance/invoices
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | draft, sent, paid, overdue, cancelled |
| dateFrom | string | ISO date (filter by issue date) |
| dateTo | string | ISO date (filter by issue date) |
| tenantId | string | Filter by tenant |

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "inv-001",
        "number": "INV-2024-0001",
        "tenant": {
          "id": "tenant-123",
          "name": "Ahmed Al-Said"
        },
        "amount": 500,
        "currency": "OMR",
        "status": "sent",
        "issueDate": "2024-01-01",
        "dueDate": "2024-01-15",
        "items": [
          {
            "description": "January Rent - Unit 101",
            "amount": 450
          },
          {
            "description": "Utilities",
            "amount": 50
          }
        ]
      }
    ]
  }
}
```

### Record Payment
```http
POST /api/finance/payments
```

**Request Body:**
```json
{
  "invoiceId": "inv-001",
  "amount": 500,
  "method": "bank_transfer",
  "reference": "TXN123456",
  "paidAt": "2024-01-10T14:30:00Z",
  "notes": "Payment received via bank transfer"
}
```

---

## Tenants API

### List Tenants
```http
GET /api/tenants
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "tenant-123",
        "name": "Ahmed Al-Said",
        "email": "ahmed@example.com",
        "phone": "+968 9123 4567",
        "unit": {
          "id": "unit-789",
          "number": "101",
          "property": "Al Mouj Residences"
        },
        "lease": {
          "startDate": "2024-01-01",
          "endDate": "2024-12-31",
          "monthlyRent": 500
        },
        "status": "active"
      }
    ]
  }
}
```

### Create Tenant
```http
POST /api/tenants
```

**Request Body:**
```json
{
  "firstName": "Ahmed",
  "lastName": "Al-Said",
  "email": "ahmed@example.com",
  "phone": "+968 9123 4567",
  "nationalId": "12345678",
  "unitId": "unit-789",
  "lease": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "monthlyRent": 500,
    "securityDeposit": 1000
  }
}
```

---

## Vendors API

### List Vendors
```http
GET /api/vendors
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| category | string | plumbing, electrical, hvac, etc. |
| status | string | active, pending, suspended |
| tier | string | basic, preferred, premium |

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "vendor-001",
        "name": "ABC Plumbing Services",
        "category": ["plumbing"],
        "tier": "preferred",
        "rating": 4.5,
        "completedJobs": 150,
        "contact": {
          "email": "info@abcplumbing.com",
          "phone": "+968 2412 3456"
        },
        "status": "active"
      }
    ]
  }
}
```

### Assign Vendor to Work Order
```http
POST /api/vendors/:id/assign
```

**Request Body:**
```json
{
  "workOrderId": "wo-123",
  "scheduledDate": "2024-01-16T09:00:00Z",
  "notes": "Tenant prefers morning appointment"
}
```

---

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "fields": [
        {
          "field": "email",
          "message": "Invalid email format"
        }
      ]
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req-abc123"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Request validation failed |
| UNAUTHORIZED | 401 | Authentication required |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource conflict (e.g., duplicate) |
| RATE_LIMITED | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |

---

## Webhooks

Configure webhooks to receive real-time notifications.

### Supported Events
- `work_order.created`
- `work_order.status_changed`
- `work_order.completed`
- `payment.received`
- `lease.expiring`
- `tenant.created`

### Webhook Payload
```json
{
  "event": "work_order.status_changed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "workOrderId": "wo-123",
    "previousStatus": "open",
    "newStatus": "assigned",
    "changedBy": "user-456"
  },
  "signature": "sha256=..."
}
```

### Signature Verification
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

---

## SDKs and Tools

- **TypeScript SDK**: `npm install @fixzit/sdk`
- **Postman Collection**: [Download](https://api.fixzit.com/postman)
- **OpenAPI Spec**: [openapi.yaml](https://api.fixzit.com/openapi.yaml)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-01 | Initial API release |
| 1.1.0 | 2024-02-15 | Added bulk operations |
| 1.2.0 | 2024-03-01 | Added webhook support |
