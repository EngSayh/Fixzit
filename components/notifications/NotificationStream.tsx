'use client';

/**
 * FEATURE-001: Real-Time Notification Stream Component
 * 
 * Displays toast notifications for real-time SSE events.
 * Automatically connects/reconnects to the notification stream.
 * 
 * @module components/notifications/NotificationStream
 */

import { useEffect, useCallback, useState } from 'react';
import { useNotificationStream } from '@/hooks/useNotificationStream';
import { toast } from 'sonner';
import type { NotificationPayload, SSEEventType } from '@/lib/sse';
import { useRouter } from 'next/navigation';

interface NotificationStreamProps {
  /** Whether to show connection status indicator */
  showConnectionStatus?: boolean;
  /** Event types to listen for (default: all) */
  eventTypes?: SSEEventType[];
  /** Custom toast duration in ms (default: 5000) */
  toastDuration?: number;
  /** Enable/disable the stream */
  enabled?: boolean;
}

const priorityIcons: Record<NotificationPayload['priority'], string> = {
  low: 'ℹ️',
  medium: '📢',
  high: '⚠️',
  critical: '🚨',
};

const eventTypeIcons: Record<SSEEventType, string> = {
  notification: '🔔',
  work_order_update: '🔧',
  bid_received: '💰',
  payment_confirmed: '💳',
  maintenance_alert: '🛠️',
  system_announcement: '📣',
  heartbeat: '💓',
};

export function NotificationStream({
  showConnectionStatus = false,
  eventTypes,
  toastDuration = 5000,
  enabled = true,
}: NotificationStreamProps) {
  const router = useRouter();
  const [isFirstConnect, setIsFirstConnect] = useState(true);

  const handleNotification = useCallback((notification: NotificationPayload) => {
    // Don't show heartbeat notifications
    if (notification.type === 'heartbeat') return;

    const icon = eventTypeIcons[notification.type] || priorityIcons[notification.priority];
    
    // Determine toast type based on priority
    const toastFn = notification.priority === 'critical' 
      ? toast.error 
      : notification.priority === 'high'
        ? toast.warning
        : toast.info;

    toastFn(notification.title, {
      description: notification.message,
      duration: toastDuration,
      icon,
      action: notification.link ? {
        label: 'View',
        onClick: () => router.push(notification.link!),
      } : undefined,
    });
  }, [toastDuration, router]);

  const handleConnectionChange = useCallback((connected: boolean) => {
    if (showConnectionStatus) {
      if (connected && !isFirstConnect) {
        toast.success('Notifications reconnected', { duration: 2000 });
      } else if (!connected && !isFirstConnect) {
        toast.warning('Notification connection lost, reconnecting...', { duration: 3000 });
      }
      setIsFirstConnect(false);
    }
  }, [showConnectionStatus, isFirstConnect]);

  const { isConnected, error } = useNotificationStream({
    enabled,
    onNotification: handleNotification,
    onConnectionChange: handleConnectionChange,
    eventTypes,
  });

  // Log connection errors in development
  useEffect(() => {
    if (error && process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[NotificationStream] Connection error:', error);
    }
  }, [error]);

  // This component doesn't render anything visible by default
  // It just manages the SSE connection and shows toasts
  if (!showConnectionStatus) {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 end-4 z-50 flex items-center gap-2 rounded-full bg-background/80 px-3 py-1.5 text-xs shadow-sm backdrop-blur-sm border"
      title={isConnected ? 'Real-time notifications active' : 'Connecting...'}
    >
      <span 
        className={`inline-block h-2 w-2 rounded-full ${
          isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
        }`} 
      />
      <span className="text-muted-foreground">
        {isConnected ? 'Live' : 'Connecting...'}
      </span>
    </div>
  );
}

export default NotificationStream;
