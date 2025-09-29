// MongoDB Only Configuration
import { connectToDatabase, getDatabase, checkDatabaseHealth as mongoHealthCheck } from '@/src/lib/mongodb-unified';

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
  } catch (error) {
    errors.push(`MongoDB: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { mongodb, errors };
}

// Graceful shutdown
const cleanup = async () => {
  try {
    const { disconnectFromDatabase } = await import('@/src/lib/mongodb-unified');
    await disconnectFromDatabase();
    console.log('✅ MongoDB connection closed gracefully');
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
  }
};

process.on('SIGTERM', async () => {
  console.log('📡 Received SIGTERM, starting graceful shutdown...');
  await cleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('📡 Received SIGINT, starting graceful shutdown...');
  await cleanup();
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('💥 Uncaught exception:', error);
  await cleanup();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
  await cleanup();
  process.exit(1);
});