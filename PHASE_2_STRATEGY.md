# Phase 2: Fix 'any' Types - Execution Strategy

**Goal**: 338 warnings → ~100 warnings (fix ~238 any types)
**Estimated Time**: 15-20 hours
**Current Status**: STARTING NOW

## Prioritized Attack Plan

### Batch 1: Critical API Routes (High Priority)
**Target**: Auth, Payment, User Management APIs
- app/api/auth/login/route.ts (1 any)
- app/api/auth/signup/route.ts
- app/api/payments/
- app/api/tenants/route.ts (2 any)

### Batch 2: Marketplace APIs (High Value)
- app/api/marketplace/
- lib/marketplace/cart.ts
- lib/marketplace/search.ts
- lib/marketplace/serializers.ts

### Batch 3: Core Libraries (Foundation)
- lib/mongodb-unified.ts
- lib/db/*.ts
- lib/auth.ts
- lib/utils/*.ts

### Batch 4: Business Logic APIs
- app/api/work-orders/
- app/api/assets/
- app/api/invoices/
- app/api/vendors/

### Batch 5: Support & Secondary APIs
- app/api/help/
- app/api/support/
- app/api/copilot/
- app/api/feeds/

### Batch 6: Components & UI
- components/*.tsx
- app/*/page.tsx

## Type Patterns to Use

1. **API Responses**: `Response<T>` or `ApiResponse<T>`
2. **Database Queries**: Proper Mongoose types
3. **Error Handling**: `unknown` with type guards
4. **Component Props**: Explicit interfaces
5. **Event Handlers**: Typed event objects

## Starting NOW...
