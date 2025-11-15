import { connect, NatsConnection, JSONCodec } from 'nats';

let nc: NatsConnection | null = null;
const jc = JSONCodec();

/**
 * Get or create the shared NATS connection
 * @returns NATS connection or null if not configured
 */
export async function getNatsConnection(): Promise<NatsConnection | null> {
  if (!process.env.NATS_URL) {
    return null;
  }

  if (!nc || nc.isClosed()) {
    try {
      nc = await connect({
        servers: process.env.NATS_URL,
        reconnect: true,
        maxReconnectAttempts: -1,
        reconnectTimeWait: 2000,
        name: 'fixzit-web-app',
      });

      // Log connection status
      (async () => {
        for await (const status of nc!.status()) {
          console.log(`[NATS] Status update: ${status.type}`);
        }
      })();

      console.log('[NATS] Connected successfully');
    } catch (error) {
      console.error('[NATS] Connection failed:', error);
      nc = null;
      throw error;
    }
  }

  return nc;
}

/**
 * Publish an event to NATS
 * @param subject Event subject (e.g., 'product.created', 'order.placed')
 * @param data Event data
 */
export async function publish(
  subject: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const connection = await getNatsConnection();
    if (!connection) {
      console.warn('[NATS] Not configured, skipping publish:', subject);
      return;
    }

    connection.publish(subject, jc.encode(data));
  } catch (error) {
    console.error(`[NATS] Failed to publish to ${subject}:`, error);
    // Don't throw - publishing failure shouldn't break application flow
  }
}

/**
 * Gracefully close the NATS connection
 */
export async function closeNatsConnection(): Promise<void> {
  if (nc) {
    try {
      await nc.drain();
      console.log('[NATS] Connection closed gracefully');
    } catch (error) {
      console.error('[NATS] Error closing connection:', error);
    } finally {
      nc = null;
    }
  }
}

// Graceful shutdown handlers
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    await closeNatsConnection();
  });

  process.on('SIGINT', async () => {
    await closeNatsConnection();
  });
}
