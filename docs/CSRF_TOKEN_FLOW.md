# CSRF Token Flow - Frontend Developer Guide

> **Version:** 1.0.1  
> **Last Updated:** November 27, 2025  
> **Status:** Production Ready

---

## Overview

Fixzit implements Double Submit Cookie CSRF protection for all state-changing API requests. This document explains how frontend developers should obtain, store, and send CSRF tokens using the server-issued token from NextAuth.

---

## Quick Start (Server-Issued Token)

```typescript
import { getCsrfToken } from 'next-auth/react';

// 1. Ask the backend (/api/auth/csrf via NextAuth) so cookie + header stay in sync
const csrfToken = await getCsrfToken();
if (!csrfToken) throw new Error('CSRF token unavailable');

// 2. Include token in all state-changing requests
fetch('/api/work-orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,  // ← Required for POST/PUT/DELETE/PATCH
  },
  body: JSON.stringify(data),
});
```

---

## How It Works

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CSRF Protection Flow                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Initial Page Load / Auth (same-site)                        │
│     ┌──────────┐                                                │
│     │ Browser  │ ─── getCsrfToken() ──► Server sets cookie      │
│     └──────────┘                                                │
│                                                                 │
│  2. API Request (POST/PUT/DELETE/PATCH)                         │
│     ┌──────────┐          ┌──────────────┐      ┌────────────┐ │
│     │ Browser  │ ──────►  │  Middleware  │ ───► │ API Route  │ │
│     └──────────┘          └──────────────┘      └────────────┘ │
│          │                       │                              │
│          │   X-CSRF-Token        │   Validate:                  │
│          │   (Header)            │   Header Token === Cookie    │
│          │                       │                              │
│          │   csrf-token          │   ✓ Pass → Continue          │
│          │   (Cookie)            │   ✗ Fail → 403 Forbidden     │
│          │                       │                              │
└─────────────────────────────────────────────────────────────────┘
```

### Why Double Submit Cookie?

1. **Stateless**: No server-side token storage required  
2. **Scalable**: Works across multiple servers/instances  
3. **Simple**: Easy to implement in any frontend framework

---

## Implementation Guide

### Step 1: Obtain CSRF Token on App Initialization (Server-Issued)

**React/Next.js Example:**

```typescript
// hooks/useCSRFToken.ts
import { useEffect, useState } from 'react';
import { getCsrfToken } from 'next-auth/react';

export function useCSRFToken() {
  const [csrfToken, setCsrfToken] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const ensureToken = async () => {
      try {
        const token = await getCsrfToken();
        if (!cancelled && token) setCsrfToken(token);
      } catch {
        // handled by consumer
      }
    };
    void ensureToken();
    return () => {
      cancelled = true;
    };
  }, []);

  return csrfToken;
}
```

**App-Level Provider:**

```typescript
// providers/CSRFProvider.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useCSRFToken } from '@/hooks/useCSRFToken';

const CSRFContext = createContext<string>('');

export function CSRFProvider({ children }: { children: ReactNode }) {
  const csrfToken = useCSRFToken();
  return (
    <CSRFContext.Provider value={csrfToken}>
      {children}
    </CSRFContext.Provider>
  );
}

export const useCSRF = () => useContext(CSRFContext);
```

### Step 2: Create API Client with CSRF Headers

**Fetch Wrapper:**

```typescript
// lib/api-client.ts
import { getCookie } from '@/lib/cookies';

interface FetchOptions extends RequestInit {
  skipCSRF?: boolean;
}

export async function apiClient<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipCSRF = false, ...fetchOptions } = options;
  
  const headers = new Headers(fetchOptions.headers);
  
  // Add CSRF token for state-changing methods
  const method = (fetchOptions.method || 'GET').toUpperCase();
  const requiresCSRF = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
  
  if (requiresCSRF && !skipCSRF) {
    const csrfToken = getCookie('csrf-token');
    if (!csrfToken) {
      // Fetch a fresh token from the server (ensures cookie + header match)
      const regenerated = await fetch('/api/auth/csrf', { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(json => json?.csrfToken as string | undefined)
        .catch(() => undefined);
      if (!regenerated) {
        throw new Error('CSRF token not found. Please refresh the page.');
      }
      headers.set('X-CSRF-Token', regenerated);
    } else {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }
  
  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include', // Important: include cookies
  });
  
  if (!response.ok) {
    if (response.status === 403) {
      const body = await response.json().catch(() => ({}));
      if (String(body.error || '').toLowerCase().includes('csrf')) {
        // Token expired or invalid - re-fetch from server so cookie + header stay aligned
        await fetch('/api/auth/csrf', { credentials: 'include' }).catch(() => undefined);
        throw new Error('CSRF token expired. Please try again.');
      }
    }
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
}
```

**Axios Interceptor:**

```typescript
// lib/axios-client.ts
import axios from 'axios';
import { getCookie } from '@/lib/cookies';

const axiosClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Add CSRF token to all state-changing requests
axiosClient.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase();
  const requiresCSRF = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
  
  if (requiresCSRF) {
    const csrfToken = getCookie('csrf-token');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  
  return config;
});

// Handle CSRF errors
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const message = error.response.data?.error || '';
      if (message.toLowerCase().includes('csrf')) {
        // Re-fetch token from server and notify user (retry can be added in caller)
        void axios.get('/api/auth/csrf', { withCredentials: true }).catch(() => undefined);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
```

### Step 3: Using in Components

```tsx
// components/WorkOrderForm.tsx
'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';

export function WorkOrderForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    
    try {
      await apiClient('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(formData)),
      });
      // Success handling
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create work order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form action={handleSubmit}>
      {error && <div className="error">{error}</div>}
      {/* Form fields */}
    </form>
  );
}
```

---

## Exempt Routes

The following routes are **exempt** from CSRF validation:

| Route Pattern | Reason |
|---------------|--------|
| `/api/auth/*` | NextAuth handles its own CSRF protection |
| `/api/webhooks/*` | Webhooks use signature verification |
| `/api/health` | Health checks don't change state |
| `/api/copilot/*` | AI assistant uses separate auth mechanism |

---

## Error Handling

### 403 Forbidden - Invalid CSRF Token

**Response:**
```json
{
  "error": "Invalid CSRF token"
}
```

**Causes:**
1. Missing `X-CSRF-Token` header  
2. Missing `csrf-token` cookie  
3. Token mismatch (header ≠ cookie)  
4. Token expired

**Resolution:**
1. Re-fetch CSRF token from `/api/auth/csrf`  
2. Retry the request  
3. If persistent, clear cookies and reload page

---

## Security Considerations

### Do's ✅

- Use the server-issued token endpoint (`/api/auth/csrf`) via NextAuth so cookie + header match
- Keep cookies `Secure` in production (HTTPS only) and `SameSite` aligned with auth requirements (NextAuth defaults to `Lax`)
- Regenerate token after authentication state changes (call `getCsrfToken` again)
- Include credentials in fetch (`credentials: 'include'`)

### Don'ts ❌

- Don't log CSRF tokens
- Don't store tokens in localStorage (use the cookie only)
- Don't disable CSRF for convenience
- Don't expose token generation endpoint publicly

---

## Testing CSRF Protection

### Manual Testing

```bash
# Should fail (no CSRF token)
curl -X POST http://localhost:3000/api/work-orders \
  -H "Content-Type: application/json" \
  -d '{"title": "Test"}'
# Expected: 403 Forbidden

# Should pass (with CSRF token)
TOKEN="test-csrf-token-123"
curl -X POST http://localhost:3000/api/work-orders \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -H "Cookie: csrf-token=$TOKEN" \
  -d '{"title": "Test"}'
# Expected: 200 OK (or 401 if not authenticated)
```

### Automated Testing

```typescript
// tests/csrf.test.ts
import { describe, it, expect } from 'vitest';

describe('CSRF Protection', () => {
  it('should reject POST without CSRF token', async () => {
    const response = await fetch('/api/work-orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test' }),
    });
    expect(response.status).toBe(403);
  });

  it('should accept POST with valid CSRF token', async () => {
    const token = 'test-token';
    document.cookie = `csrf-token=${token}`;
    
    const response = await fetch('/api/work-orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': token,
      },
      body: JSON.stringify({ title: 'Test' }),
      credentials: 'include',
    });
    expect(response.status).not.toBe(403);
  });
});
```

---

## Environment Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CSRF_PROTECTION` | `true` | Enable/disable CSRF protection |

**To disable in development:**
```bash
CSRF_PROTECTION=false pnpm dev
```

---

## Reference

- `/api/auth/csrf` is served by the NextAuth handler in `app/api/auth/[...nextauth]/route.ts` (GET export).
