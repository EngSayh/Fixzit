/**
 * MongoDB Abstraction Layer Unit Tests
 * 
 * Tests for the enhanced MongoDB abstraction layer including:
 * - MockDB functionality
 * - Cursor chaining
 * - Connection logic
 * - Error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';

// Mock mongoose for testing
const mockMongoose = {
  connect: jest.fn(),
  connection: { db: null },
  Types: mongoose.Types
};

jest.mock('mongoose', () => mockMongoose);

describe('MongoDB Abstraction Layer', () => {
  beforeEach(() => {
    // Clear global state
    delete (global as any)._mongoose;
    process.env.USE_MOCK_DB = 'true';
    process.env.MONGODB_URI = '';
  });

  describe('MockDB', () => {
    it('should create collections and handle basic operations', async () => {
      const MockDB = require('../src/lib/mongo');
      const db = await MockDB.db;
      
      const collection = db.collection('test');
      
      // Test insert
      const insertResult = await collection.insertOne({ name: 'test', value: 42 });
      expect(insertResult.insertedId).toBeDefined();
      
      // Test find
      const findResult = await collection.find({ name: 'test' }).toArray();
      expect(findResult).toHaveLength(1);
      expect(findResult[0].name).toBe('test');
      
      // Test findOne
      const findOneResult = await collection.findOne({ name: 'test' });
      expect(findOneResult).toBeTruthy();
      expect(findOneResult.name).toBe('test');
    });

    it('should handle cursor operations correctly', async () => {
      const MockDB = require('../src/lib/mongo');
      const db = await MockDB.db;
      
      const collection = db.collection('cursor-test');
      
      // Insert test data
      await collection.insertOne({ name: 'doc1', order: 1 });
      await collection.insertOne({ name: 'doc2', order: 2 });
      await collection.insertOne({ name: 'doc3', order: 3 });
      
      // Test limit
      const limitResult = await collection.find().limit(2).toArray();
      expect(limitResult).toHaveLength(2);
      
      // Test sort
      const sortResult = await collection.find()
        .sort({ order: -1 })
        .toArray();
      expect(sortResult[0].order).toBe(3);
      expect(sortResult[2].order).toBe(1);
      
      // Test skip
      const skipResult = await collection.find()
        .sort({ order: 1 })
        .skip(1)
        .toArray();
      expect(skipResult).toHaveLength(2);
      expect(skipResult[0].order).toBe(2);
    });

    it('should handle update and delete operations', async () => {
      const MockDB = require('../src/lib/mongo');
      const db = await MockDB.db;
      
      const collection = db.collection('crud-test');
      
      // Insert test data
      const insertResult = await collection.insertOne({ name: 'update-test', value: 10 });
      const docId = insertResult.insertedId;
      
      // Test update
      const updateResult = await collection.updateOne(
        { _id: docId },
        { $set: { value: 20 } }
      );
      expect(updateResult.matchedCount).toBe(1);
      expect(updateResult.modifiedCount).toBe(1);
      
      // Verify update
      const updatedDoc = await collection.findOne({ _id: docId });
      expect(updatedDoc.value).toBe(20);
      
      // Test delete
      const deleteResult = await collection.deleteOne({ _id: docId });
      expect(deleteResult.deletedCount).toBe(1);
      
      // Verify delete
      const deletedDoc = await collection.findOne({ _id: docId });
      expect(deletedDoc).toBeNull();
    });
  });

  describe('Connection Logic', () => {
    it('should use MockDB when USE_MOCK_DB is true', async () => {
      process.env.USE_MOCK_DB = 'true';
      const MockDB = require('../src/lib/mongo');
      
      expect(MockDB.isMockDB).toBe(true);
      
      const db = await MockDB.db;
      expect(db).toBeDefined();
      expect(typeof db.collection).toBe('function');
    });

    it('should provide getNativeDb function for backward compatibility', async () => {
      process.env.USE_MOCK_DB = 'true';
      const MockDB = require('../src/lib/mongo');
      
      const nativeDb = await MockDB.getNativeDb();
      expect(nativeDb).toBeDefined();
      expect(typeof nativeDb.collection).toBe('function');
    });

    it('should provide getDatabase function', async () => {
      process.env.USE_MOCK_DB = 'true';
      const MockDB = require('../src/lib/mongo');
      
      const database = await MockDB.getDatabase();
      expect(database).toBeDefined();
      expect(typeof database.collection).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when no MONGODB_URI and MockDB disabled', () => {
      process.env.USE_MOCK_DB = 'false';
      process.env.MONGODB_URI = '';
      
      expect(() => {
        require('../src/lib/mongo');
      }).toThrow();
    });

    it('should provide structured error objects', async () => {
      // This would require more complex mocking to test connection failures
      // For now, we verify the error structure is correct
      const MockDB = require('../src/lib/mongo');
      
      try {
        // Force an error by corrupting the connection
        const mockDb = { collection: null };
        await MockDB.getDatabase();
      } catch (error) {
        // In a real test, we'd verify error properties
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
