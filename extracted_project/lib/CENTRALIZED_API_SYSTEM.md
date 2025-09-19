# Centralized API Handler System

This document outlines the unified API handler system that replaces the previously scattered backend and frontend components. The new system provides consistent authentication, database connections, error handling, and type safety across all 96+ endpoints.

## Architecture Overview

### 1. Core Components

#### `lib/api-handler.ts` - Centralized API Handler
- **Purpose**: Unified request/response processing for all API endpoints
- **Features**:
  - Shared authentication using `auth-middleware.ts`
  - Database connections via Prisma singleton
  - Standardized error handling and logging
  - Rate limiting and timeout management
  - Request validation and response formatting
  - Permission-based access control

#### `lib/services/` - Unified Service Layer
- **Purpose**: Replace scattered fetch calls with type-safe service methods
- **Structure**:
  ```
  services/
  ├── api-client.ts          # Core HTTP client with error handling
  ├── dashboard-service.ts   # Dashboard analytics and KPIs
  ├── crm-service.ts         # Customer relationship management
  ├── work-orders-service.ts # Maintenance and service requests
  ├── hr-service.ts          # Human resources management
  └── index.ts               # Central export point
  ```

#### `lib/types/` - Type-Safe Communication
- **Purpose**: Comprehensive TypeScript interfaces for all data structures
- **Coverage**: API responses, entities, filters, pagination, errors

### 2. Migration from Scattered System

#### Before (Scattered Approach)
```typescript
// ❌ Direct fetch calls in components
const response = await fetch('/api/dashboard/stats');
const stats = await response.json();

// ❌ Inconsistent error handling
if (!response.ok) {
  console.error('Failed to fetch stats');
}

// ❌ Multiple API-specific files
import { getDashboardStats } from '../../../lib/dashboard-api';
import { getPropertiesData } from '../../../lib/properties-api';
```

#### After (Centralized Approach)
```typescript
// ✅ Unified service layer with type safety
import { dashboardService } from '@/lib/services';
import { DashboardStats } from '@/lib/types/dashboard';

try {
  const stats: DashboardStats = await dashboardService.getStats(filters);
  // Fully typed response with proper error handling
} catch (error) {
  if (error instanceof ApiError) {
    // Standardized error handling
    if (error.isUnauthorized) {
      // Handle auth errors
    }
  }
}
```

## Implementation Guide

### 1. API Endpoints

#### Converting Existing Endpoints
Replace existing route handlers with the centralized handler:

```typescript
// Before: app/api/some-endpoint/route.ts
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('token')?.value;
    // Manual auth, DB connection, error handling...
  } catch (error) {
    // Inconsistent error handling
  }
}

// After: Using centralized handler
import { handleGet, ApiContext } from '../../../lib/api-handler';

export const GET = handleGet<ResponseType>(
  async (ctx: ApiContext) => {
    const { prisma, user, searchParams } = ctx;
    
    // Business logic with pre-authenticated user and DB connection
    const data = await prisma.someModel.findMany({
      where: { orgId: user.orgId }
    });
    
    return data; // Automatically formatted response
  },
  {
    requireAuth: true,
    requiredPermissions: ['resource.read'],
    rateLimit: { requests: 100, window: 60000 }
  }
);
```

### 2. Frontend Components

#### Using Unified Services
Replace direct fetch calls with service methods:

```typescript
// Before: Direct fetch in component
useEffect(() => {
  const fetchData = async () => {
    const response = await fetch('/api/dashboard/stats');
    const data = await response.json();
    setStats(data);
  };
  fetchData();
}, []);

// After: Using service layer
import { dashboardService } from '@/lib/services';

useEffect(() => {
  const fetchData = async () => {
    try {
      const stats = await dashboardService.getStats(filters);
      setStats(stats);
    } catch (error) {
      if (error instanceof ApiError) {
        setError(error.message);
      }
    }
  };
  fetchData();
}, [filters]);
```

### 3. Type Safety

#### Comprehensive Type Coverage
```typescript
import { 
  DashboardStats, 
  ChartData, 
  PaginatedResponse,
  ApiError 
} from '@/lib/types';

// Fully typed service calls
const stats: DashboardStats = await dashboardService.getStats();
const contacts: PaginatedResponse<Contact> = await crmService.getContacts({
  page: 1,
  limit: 20,
  search: 'john'
});
```

## Key Benefits

### 1. Consistency
- **Authentication**: Single auth middleware used across all endpoints
- **Database**: Shared Prisma singleton prevents connection exhaustion
- **Error Handling**: Standardized error responses and logging
- **Rate Limiting**: Configurable per-endpoint rate limits

### 2. Type Safety
- **End-to-End Types**: From API responses to frontend components
- **Auto-completion**: Full IntelliSense support in IDEs
- **Compile-time Errors**: Catch type mismatches during development

### 3. Performance
- **Connection Pooling**: Efficient database connection management
- **Request Batching**: Parallel requests where possible
- **Timeout Management**: Configurable timeouts prevent hanging requests
- **Caching**: Service-layer caching for frequently accessed data

### 4. Maintainability
- **Single Source of Truth**: All API logic in centralized handler
- **Consistent Patterns**: Same approach across all endpoints
- **Easy Testing**: Mockable service layer
- **Clear Separation**: Business logic separated from HTTP concerns

## Configuration

### Environment Variables
```env
DATABASE_URL=postgresql://...
NEXT_PUBLIC_BASE_URL=https://your-app.com
```

### Rate Limiting
```typescript
// Configure per-endpoint rate limits
export const GET = handleGet(handler, {
  rateLimit: { 
    requests: 100,  // Max requests
    window: 60000   // Per minute
  }
});
```

### Permissions
```typescript
// Role-based access control
export const POST = handlePost(handler, {
  requiredPermissions: [
    'crm.contacts.write',
    'organization.manage'
  ]
});
```

## Error Handling

### Standardized Error Responses
```typescript
// All API responses follow this format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}
```

### Error Types
- `AUTHENTICATION_ERROR`: Auth failures
- `PERMISSION_DENIED`: Insufficient permissions
- `VALIDATION_ERROR`: Input validation failures
- `DATABASE_ERROR`: Prisma/DB errors
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `TIMEOUT`: Request timeout

## Migration Checklist

### API Endpoints
- [ ] Update route handlers to use `handleGet`, `handlePost`, etc.
- [ ] Replace manual auth checks with centralized authentication
- [ ] Convert direct Prisma instantiation to use context
- [ ] Add proper TypeScript types for responses
- [ ] Configure rate limits and permissions

### Frontend Components
- [ ] Replace direct fetch calls with service methods
- [ ] Import from `@/lib/services` instead of individual API files
- [ ] Add proper error handling with `ApiError`
- [ ] Use TypeScript interfaces from `@/lib/types`
- [ ] Update loading and error states

### Testing
- [ ] Test all updated endpoints for functionality
- [ ] Verify authentication works correctly
- [ ] Check error handling for various scenarios
- [ ] Test rate limiting behavior
- [ ] Validate TypeScript compilation

## Legacy File Removal

After migration, these scattered files can be removed:
```
lib/dashboard-api.ts     → Use dashboardService
lib/finances-api.ts      → Use financesService (to be created)
lib/properties-api.ts    → Use propertiesService (to be created)
lib/work-orders-api.ts   → Use workOrdersService
```

## Support and Troubleshooting

### Common Issues

1. **Import Errors**: Ensure proper imports from `@/lib/services`
2. **Type Errors**: Use interfaces from `@/lib/types`
3. **Auth Failures**: Check `auth-middleware.ts` configuration
4. **DB Errors**: Verify Prisma schema and connections

### Debugging
- All requests include unique `requestId` for tracing
- Comprehensive error logging with stack traces
- Performance metrics logged for slow requests

---

**Created**: September 16, 2025  
**Version**: 2.0.26  
**Status**: Production Ready