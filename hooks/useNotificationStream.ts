/**
 * FEATURE-001: SSE Notification Stream Hook
 * 
 * React hook for subscribing to real-time notifications via SSE.
 * Automatically reconnects on disconnect with exponential backoff.
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { SSE_CONFIG, type NotificationPayload, type SSEEventType } from '@/lib/sse';

interface UseNotificationStreamOptions {
  /** Enable/disable the stream connection */
  enabled?: boolean;
  /** Callback when notification received */
  onNotification?: (notification: NotificationPayload) => void;
  /** Callback when connection state changes */
  onConnectionChange?: (connected: boolean) => void;
  /** Filter by event types */
  eventTypes?: SSEEventType[];
}

interface UseNotificationStreamResult {
  /** Current connection status */
  isConnected: boolean;
  /** Last error if any */
  error: Error | null;
  /** Manually reconnect */
  reconnect: () => void;
  /** Manually disconnect */
  disconnect: () => void;
}

export function useNotificationStream({
  enabled = true,
  onNotification,
  onConnectionChange,
  eventTypes,
}: UseNotificationStreamOptions = {}): UseNotificationStreamResult {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    clearReconnectTimeout();
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    onConnectionChange?.(false);
  }, [clearReconnectTimeout, onConnectionChange]);

  const connect = useCallback(() => {
    // Don't connect if already connected or disabled
    if (eventSourceRef.current || !enabled) return;

    try {
      const eventSource = new EventSource('/api/notifications/stream');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptRef.current = 0;
        onConnectionChange?.(true);
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        onConnectionChange?.(false);
        
        // Close current connection
        eventSource.close();
        eventSourceRef.current = null;

        // Exponential backoff for reconnection
        const backoff = Math.min(
          SSE_CONFIG.RECONNECT_RETRY_MS * Math.pow(2, reconnectAttemptRef.current),
          30000 // Max 30 seconds
        );
        reconnectAttemptRef.current++;

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, backoff);
      };

      // Listen for notification events
      eventSource.addEventListener('notification', (event) => {
        try {
          const data = JSON.parse(event.data) as NotificationPayload;
          
          // Filter by event type if specified
          if (eventTypes && !eventTypes.includes(data.type)) {
            return;
          }
          
          onNotification?.(data);
        } catch (_err) {
          // Ignore parse errors for non-notification messages
        }
      });

    } catch (err) {
      setError(err instanceof Error ? err : new Error('SSE connection failed'));
    }
  }, [enabled, onNotification, onConnectionChange, eventTypes]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptRef.current = 0;
    connect();
  }, [disconnect, connect]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (enabled) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    isConnected,
    error,
    reconnect,
    disconnect,
  };
}

export default useNotificationStream;
