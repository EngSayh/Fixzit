// Client-safe MongoDB mock
// This file provides MongoDB-like interfaces for client-side code
// preventing build errors from MongoDB imports in client components

export interface MockCollection {
  find: (query?: any) => { toArray: () => Promise<any[]> };
  findOne: (query?: any) => Promise<any>;
  insertOne: (doc: any) => Promise<{ insertedId: string }>;
  updateOne: (filter: any, update: any) => Promise<{ matchedCount: number; modifiedCount: number }>;
  deleteOne: (filter: any) => Promise<{ deletedCount: number }>;
  countDocuments: (filter?: any) => Promise<number>;
}

export interface MockDb {
  collection: (name: string) => MockCollection;
}

// Mock database that can be safely imported on client-side
export const mockDb: MockDb = {
  collection: (name: string) => ({
    find: (query?: any) => ({ 
      toArray: async () => [] 
    }),
    findOne: async (query?: any) => null,
    insertOne: async (doc: any) => ({ 
      insertedId: 'mock-id' 
    }),
    updateOne: async (filter: any, update: any) => ({ 
      matchedCount: 1, 
      modifiedCount: 1 
    }),
    deleteOne: async (filter: any) => ({ 
      deletedCount: 1 
    }),
    countDocuments: async (filter?: any) => 0
  })
};

// Export a safe db instance
export const db = mockDb;

// Check if we're on the server
export const isServer = typeof window === 'undefined';

// Get database connection (client-safe)
export async function getDb(): Promise<MockDb> {
  if (!isServer) {
    console.warn('Database operations should only run on the server');
    return mockDb;
  }
  
  // On server, try to import real MongoDB
  try {
    const serverModule: any = await import('./mongo');
    const serverConn: any = await serverModule.db();
    const native = serverConn?.connection?.db || serverConn?.db;
    if (native && typeof native.collection === 'function') {
      return native as unknown as MockDb;
    }
    // Fallback to mock if shape mismatches
    return mockDb;
  } catch (error) {
    console.warn('Failed to load server MongoDB, using mock');
    return mockDb;
  }
}
