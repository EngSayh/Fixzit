import { logger } from '@/lib/logger';
// MongoDB Only Configuration
import { connectToDatabase, getDatabase, checkDatabaseHealth as mongoHealthCheck } from '@/lib/mongodb-unified';

// Re-export unified MongoDB functions
export { connectToDatabase, getDatabase };

// Database health check (MongoDB only)
export async function checkDatabaseHealth(): Promise<{
  mongodb: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let mongodb = false;

  // Check MongoDB
  try {
    mongodb = await mongoHealthCheck();
  } catch (_error: unknown) {
    const error = _error instanceof Error ? _error : new Error(String(_error));
    void error;
    errors.push(`MongoDB: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { mongodb, errors };
}

// Graceful shutdown
const cleanup = async () => {
  try {
    const { disconnectFromDatabase } = await import('@/lib/mongodb-unified');
    await disconnectFromDatabase();
  } catch {
    // Error during database cleanup
  }
};

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await cleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await cleanup();
  process.exit(0);
});

process.on('uncaughtException', async (err) => {
  logger.error('💥 Uncaught exception:', err);
  logger.error('Stack:', err.stack);
  await cleanup();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  logger.error('💥 Unhandled rejection at:', promise);
  logger.error('Reason:', reason);
  await cleanup();
  process.exit(1);
});