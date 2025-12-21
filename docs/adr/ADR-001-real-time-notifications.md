# ADR-001: Real-Time Notifications Architecture

**Status:** Proposed → Scaffolding Ready  
**Date:** 2025-12-20 (Updated: 2025-12-21)  
**Decision Makers:** Eng. Sultan Al Hassni  
**Context:** FEATURE-001 from Production Readiness backlog
**Implementation:** lib/sse/index.ts (scaffolding)

## Context

Fixzit currently uses polling-based notification retrieval via `/api/notifications` endpoint. Users must refresh or wait for periodic polling to see new notifications. This creates suboptimal UX for:

- Work order status changes
- Vendor bid submissions  
- Payment confirmations
- Maintenance alerts
- System announcements

## Decision Drivers

1. **Latency**: Users need immediate notification (<500ms) for time-sensitive events
2. **Mobile**: Must work reliably on mobile devices with intermittent connectivity
3. **Scale**: Support 10K+ concurrent connections per region
4. **Cost**: Minimize infrastructure costs on Vercel/serverless
5. **Tenancy**: Notifications must respect org_id isolation

## Options Considered

### Option 1: Server-Sent Events (SSE) ✅ RECOMMENDED

**Implementation:**
```typescript
// app/api/notifications/stream/route.ts
export async function GET(req: NextRequest) {
  const session = await getSessionUser(req);
  if (!session) return new Response('Unauthorized', { status: 401 });
  
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to tenant-scoped notifications
      const unsubscribe = subscribeToNotifications(session.orgId, session.userId, (notification) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(notification)}\n\n`));
      });
      
      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      }, 30000);
      
      req.signal.addEventListener('abort', () => {
        unsubscribe();
        clearInterval(heartbeat);
        controller.close();
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
```

**Pros:**
- Native browser support (EventSource API)
- Works on Vercel Edge Runtime
- Unidirectional (simpler than WebSockets)
- Auto-reconnect built into browsers
- HTTP/2 compatible

**Cons:**
- One-way only (server → client)
- 6 connection limit per domain in HTTP/1.1 (mitigated with HTTP/2)
- No binary data support

**Effort:** 24 hours

### Option 2: WebSockets (Socket.io)

**Implementation:**
- Requires separate WebSocket server (not supported on Vercel serverless)
- Options: Vercel Edge Functions, Railway, Fly.io, or self-hosted

**Pros:**
- Bidirectional communication
- Binary data support
- Mature ecosystem

**Cons:**
- Cannot run on Vercel serverless (requires persistent connection)
- Needs separate infrastructure
- More complex connection management

**Effort:** 48 hours (includes infrastructure setup)

### Option 3: Long Polling

**Implementation:**
```typescript
// app/api/notifications/poll/route.ts
export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get('since');
  const timeout = 30000; // 30 second timeout
  
  // Wait for new notifications or timeout
  const notifications = await waitForNotifications(session.orgId, since, timeout);
  return NextResponse.json({ notifications, timestamp: Date.now() });
}
```

**Pros:**
- Works everywhere
- No special infrastructure
- Simple fallback

**Cons:**
- Higher latency (up to 30s)
- More requests (higher costs)
- Connection overhead

**Effort:** 16 hours

### Option 4: Push Notifications (Web Push + FCM)

**Pros:**
- Works when app is closed
- Native mobile integration
- Battery efficient

**Cons:**
- Requires user permission
- Doesn't replace in-app notifications
- Additional complexity

**Effort:** 32 hours (complementary, not replacement)

## Decision

**Selected: Option 1 - Server-Sent Events (SSE)**

### Rationale:

1. **Vercel Compatibility**: SSE works on Vercel Edge Runtime with streaming responses
2. **Simplicity**: Unidirectional is sufficient for notifications (server → client)
3. **Browser Support**: Native EventSource API with auto-reconnect
4. **Tenant Isolation**: Easy to scope subscriptions by org_id
5. **Cost**: No additional infrastructure required

### Implementation Plan

#### Phase 1: Core SSE Infrastructure (8h)
1. Create `/api/notifications/stream/route.ts` with Edge Runtime
2. Implement in-memory pub/sub for single-instance dev
3. Add session validation and org_id scoping

#### Phase 2: Redis Pub/Sub for Production (8h)
1. Add Upstash Redis for cross-instance pub/sub
2. Implement notification publisher service
3. Add connection tracking and limits

#### Phase 3: Client Integration (8h)
1. Create `useNotificationStream` hook
2. Add reconnection logic with exponential backoff
3. Integrate with existing notification UI components

### File Structure

```
app/api/notifications/
├── route.ts                    # Existing REST API
├── [id]/route.ts               # Existing individual notification
├── stream/route.ts             # NEW: SSE endpoint
└── _lib/
    ├── pub-sub.ts              # NEW: Redis pub/sub abstraction
    └── notification-publisher.ts # NEW: Publish notifications

hooks/
└── useNotificationStream.ts    # NEW: Client-side SSE hook

services/notifications/
└── real-time-service.ts        # NEW: Publish to SSE from domain events
```

### Migration Strategy

1. **Week 1**: Deploy SSE endpoint, client hook (opt-in via feature flag)
2. **Week 2**: Integrate with work order status changes
3. **Week 3**: Integrate with vendor/payment events
4. **Week 4**: Full rollout, deprecate polling-only mode

## Consequences

### Positive
- Near-instant notification delivery (<500ms)
- Better UX for time-sensitive events
- Reduced polling load on API

### Negative
- New infrastructure dependency (Redis for prod)
- Additional monitoring needed for connection health
- Edge Runtime limitations (no fs, limited APIs)

### Risks
- Vercel Edge timeout limits (may need streaming keepalive)
- Connection limits per user need enforcement

## References

- [Vercel Streaming Responses](https://vercel.com/docs/functions/streaming)
- [MDN EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
- [Upstash Redis Pub/Sub](https://upstash.com/docs/redis/features/pubsub)
