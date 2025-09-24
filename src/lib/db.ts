// Database connection module
export { db as default, dbConnect, isMockDB } from './mongo';

// Named export for compatibility
export { db as connectDB } from './mongo';
export { db } from './mongo';

// Helper function to get database instance
export async function getDb() {
  const { db } = await import('./mongo');
  return db();
}
