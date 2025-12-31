/**
 * FEATURE-001: Server-Sent Events (SSE) Notification Stream
 * 
 * @route GET /api/notifications/stream
 * @access Private - Requires authenticated session
 * 
 * Provides real-time notifications via SSE.
 * Tenant-scoped: only receives notifications for user's org.
 */

import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { 
  formatSSEMessage, 
  createHeartbeat, 
  SSE_CONFIG, 
  subscribeToNotifications,
  type NotificationPayload 
} from '@/lib/sse';
import { logger } from '@/lib/logger';
import { Types } from 'mongoose';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * SSE endpoint for real-time notifications
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;
  const orgId = session.user.orgId;

  // Validate we have required IDs
  if (!orgId) {
    return new Response('Missing organization context', { status: 403 });
  }

  // Prevent timeout on Vercel
  const encoder = new TextEncoder();
  
  // Create readable stream
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const connectMessage = formatSSEMessage<{ connected: boolean; userId: string }>({
        id: `connect-${Date.now()}`,
        event: 'notification',
        data: { connected: true, userId },
        retry: SSE_CONFIG.RECONNECT_RETRY_MS,
      });
      controller.enqueue(encoder.encode(connectMessage));

      // Subscribe to notifications for this user's org
      const unsubscribe = subscribeToNotifications(
        new Types.ObjectId(orgId),
        new Types.ObjectId(userId),
        (notification: NotificationPayload) => {
          try {
            const message = formatSSEMessage({
              id: notification.id,
              event: notification.type,
              data: notification,
            });
            controller.enqueue(encoder.encode(message));
          } catch (_err) {
            // Controller closed, unsubscribe will be called via abort handler
          }
        }
      );

      // Heartbeat interval to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(createHeartbeat()));
        } catch (_err) {
          // Controller closed
          clearInterval(heartbeatInterval);
        }
      }, SSE_CONFIG.HEARTBEAT_INTERVAL_MS);

      logger.info('[SSE] Connection established', { userId, orgId });

      // Cleanup on client disconnect
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        clearInterval(heartbeatInterval);
        logger.info('[SSE] Connection closed', { userId, orgId });
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

/**
 * Broadcast notification to SSE stream
 * Called by other API routes to push notifications
 * 
 * @todo Connect to Redis pub/sub for multi-instance support
 */
export function broadcastNotification(
  _notification: NotificationPayload,
  _targetOrgId: string,
  _targetUserIds?: string[]
): void {
  // TODO: Publish to Redis channel for horizontal scaling
  // This is a placeholder for the Q1 2026 implementation
}
