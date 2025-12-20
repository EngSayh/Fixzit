# API Response Status Codes Reference

This document defines the standard HTTP status codes used across Fixzit API routes.

## Authentication & Authorization

| Status | Name | When to Use | Response Body |
|--------|------|-------------|---------------|
| **401** | Unauthorized | No valid session/token provided | `{ "error": "Unauthorized", "code": "UNAUTHORIZED" }` |
| **403** | Forbidden | Valid session but lacks permission | `{ "error": "Forbidden", "code": "FORBIDDEN" }` |
| **404** | Not Found | Hide admin endpoints from non-admins (security) | `{ "error": "Not found" }` |

### Guard Selection

| Endpoint Pattern | Guard | On Failure |
|-----------------|-------|------------|
| `/api/admin/*` | `requireAdmin()` | 401/403 |
| `/api/superadmin/*` | `requireSuperadmin()` | 401/404 (hidden) |
| `/api/fm/*` | `requireFmAbility()` | 401/403 |
| `/api/owner/*` | `requireAuth()` + tenant scope | 401/403 |

## Rate Limiting

| Status | Name | When to Use | Response Body |
|--------|------|-------------|---------------|
| **429** | Too Many Requests | Rate limit exceeded | `{ "error": "Rate limit exceeded", "retryAfter": <seconds> }` |

## Server Errors

| Status | Name | When to Use | Response Body |
|--------|------|-------------|---------------|
| **500** | Internal Server Error | Unexpected server error | `{ "error": "Internal server error" }` |
| **503** | Service Unavailable | DB connection failed, upstream service down | `{ "error": "Service temporarily unavailable" }` |

## Client Errors

| Status | Name | When to Use | Response Body |
|--------|------|-------------|---------------|
| **400** | Bad Request | Invalid request body/params | `{ "error": "Invalid request", "details": {...} }` |
| **404** | Not Found | Resource doesn't exist | `{ "error": "Not found" }` |
| **409** | Conflict | Duplicate resource, version conflict | `{ "error": "Conflict", "details": {...} }` |
| **422** | Unprocessable Entity | Validation failed | `{ "error": "Validation failed", "errors": [...] }` |

## Success

| Status | Name | When to Use |
|--------|------|-------------|
| **200** | OK | Successful GET/PUT/PATCH |
| **201** | Created | Successful POST that creates resource |
| **204** | No Content | Successful DELETE |

## Usage Example

```typescript
import { requireAdmin, requireSuperadmin } from '@/lib/api/admin-guard';

// Admin route (visible, returns 403 on unauthorized)
export async function GET(req: NextRequest) {
  const { session, error } = await requireAdmin(req);
  if (error) return error;
  // ... handle request
}

// Superadmin route (hidden, returns 404 on unauthorized)
export async function GET(req: NextRequest) {
  const { session, error } = await requireSuperadmin(req);
  if (error) return error;
  // ... handle request
}

// If you need 403 instead of 404 for superadmin routes:
export async function GET(req: NextRequest) {
  const { session, error } = await requireSuperadmin(req, { hideEndpoint: false });
  if (error) return error;
  // ... handle request
}
```
