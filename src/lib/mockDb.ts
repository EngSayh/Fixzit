/**
 * MockDatabase - In-memory database mock for testing
 *
 * Provides a simple in-memory store for testing database operations
 * without requiring actual MongoDB connection.
 */

type Doc = Record<string, unknown>;

export class MockDatabase {
  private static instance: MockDatabase;
  private collections = new Map<string, Doc[]>();

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance of MockDatabase
   */
  static getInstance(): MockDatabase {
    if (!MockDatabase.instance) {
      MockDatabase.instance = new MockDatabase();
    }
    return MockDatabase.instance;
  }

  /**
   * Reset all collections (useful for test cleanup)
   */
  reset(): void {
    this.collections.clear();
  }

  /**
   * Get all documents in a collection
   * Returns a shallow copy to prevent external mutations
   */
  getCollection(name: string): Doc[] {
    if (!this.collections.has(name)) {
      this.collections.set(name, []);
    }
    // Return shallow copy to simulate persistence layer reads
    return [...(this.collections.get(name) as Doc[])];
  }

  /**
   * Set/replace all documents in a collection
   * Stores copies to avoid external mutation
   */
  setCollection(name: string, data: Doc[]): void {
    // Store copies to avoid external mutation
    this.collections.set(
      name,
      data.map((d) => ({ ...d })),
    );
  }

  /**
   * Get all collection names
   */
  getCollectionNames(): string[] {
    return Array.from(this.collections.keys());
  }

  /**
   * Check if a collection exists
   */
  hasCollection(name: string): boolean {
    return this.collections.has(name);
  }

  /**
   * Delete a collection
   */
  dropCollection(name: string): boolean {
    return this.collections.delete(name);
  }
}

// Export singleton instance getter
export const getInstance = () => MockDatabase.getInstance();

// Default export for compatibility
export default MockDatabase;
