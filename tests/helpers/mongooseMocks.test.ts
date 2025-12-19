/**
 * Unit tests for Mongoose mock helpers
 * Tests mock builder utilities used across the test suite
 */

import { describe, it, expect, vi } from 'vitest';
import { makeFindSortLimitSelectLean, makeFindOneSelectLean } from './mongooseMocks';
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


describe('Mongoose Mock Helpers', () => {
  describe('makeFindSortLimitSelectLean', () => {
    it('should create a complete find chain mock', () => {
      const mockResult = [{ id: '1', name: 'Test' }];
      const { chain, mocks } = makeFindSortLimitSelectLean(mockResult);

      expect(chain.sort).toBeDefined();
      expect(mocks.sort).toBeDefined();
      expect(mocks.limit).toBeDefined();
      expect(mocks.select).toBeDefined();
      expect(mocks.lean).toBeDefined();
    });

    it('should chain sort -> limit -> select -> lean', async () => {
      const mockResult = [{ id: '1', name: 'Test' }];
      const { chain } = makeFindSortLimitSelectLean(mockResult);

      const limitChain = chain.sort({ createdAt: -1 });
      const selectChain = limitChain.limit(10);
      const leanChain = selectChain.select('name email');
      const result = await leanChain.lean();

      expect(result).toEqual(mockResult);
    });

    it('should return mocks that can be verified', async () => {
      const mockResult = [{ id: '1' }];
      const { chain, mocks } = makeFindSortLimitSelectLean(mockResult);

      await chain.sort({}).limit(5).select('id').lean();

      expect(mocks.sort).toHaveBeenCalledWith({});
      expect(mocks.limit).toHaveBeenCalledWith(5);
      expect(mocks.select).toHaveBeenCalledWith('id');
      expect(mocks.lean).toHaveBeenCalled();
    });

    it('should resolve with provided result', async () => {
      const mockResult = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];
      const { chain } = makeFindSortLimitSelectLean(mockResult);

      const result = await chain.sort({}).limit(10).select('*').lean();

      expect(result).toBe(mockResult);
      expect(result).toHaveLength(2);
    });

    it('should handle empty array results', async () => {
      const mockResult: unknown[] = [];
      const { chain } = makeFindSortLimitSelectLean(mockResult);

      const result = await chain.sort({}).limit(10).select('*').lean();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('makeFindOneSelectLean', () => {
    it('should create a findOne chain mock', () => {
      const mockResult = { id: '1', name: 'Test' };
      const { chain, mocks } = makeFindOneSelectLean(mockResult);

      expect(chain.select).toBeDefined();
      expect(mocks.select).toBeDefined();
      expect(mocks.lean).toBeDefined();
    });

    it('should chain select -> lean', async () => {
      const mockResult = { id: '1', name: 'Test' };
      const { chain } = makeFindOneSelectLean(mockResult);

      const leanChain = chain.select('name email');
      const result = await leanChain.lean();

      expect(result).toEqual(mockResult);
    });

    it('should return mocks that can be verified', async () => {
      const mockResult = { id: '1' };
      const { chain, mocks } = makeFindOneSelectLean(mockResult);

      await chain.select('id name').lean();

      expect(mocks.select).toHaveBeenCalledWith('id name');
      expect(mocks.lean).toHaveBeenCalled();
    });

    it('should resolve with provided result', async () => {
      const mockResult = { id: '1', email: 'test@example.com' };
      const { chain } = makeFindOneSelectLean(mockResult);

      const result = await chain.select('*').lean();

      expect(result).toBe(mockResult);
      expect(result.id).toBe('1');
    });

    it('should handle null results', async () => {
      const mockResult = null;
      const { chain } = makeFindOneSelectLean(mockResult);

      const result = await chain.select('*').lean();

      expect(result).toBeNull();
    });

    it('should handle undefined results', async () => {
      const mockResult = undefined;
      const { chain } = makeFindOneSelectLean(mockResult);

      const result = await chain.select('*').lean();

      expect(result).toBeUndefined();
    });
  });

  describe('Integration scenarios', () => {
    it('should mock typical Mongoose find query', async () => {
      const mockUsers = [
        { _id: '1', email: 'user1@test.com', role: 'admin' },
        { _id: '2', email: 'user2@test.com', role: 'user' },
      ];

      const { chain, mocks } = makeFindSortLimitSelectLean(mockUsers);

      // Simulate typical query: Model.find().sort().limit().select().lean()
      const result = await chain
        .sort({ createdAt: -1 })
        .limit(10)
        .select('email role')
        .lean();

      expect(result).toEqual(mockUsers);
      expect(mocks.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mocks.limit).toHaveBeenCalledWith(10);
      expect(mocks.select).toHaveBeenCalledWith('email role');
    });

    it('should mock typical Mongoose findOne query', async () => {
      const mockUser = { _id: '1', email: 'admin@test.com', role: 'admin' };

      const { chain, mocks } = makeFindOneSelectLean(mockUser);

      // Simulate typical query: Model.findOne().select().lean()
      const result = await chain.select('email role').lean();

      expect(result).toEqual(mockUser);
      expect(mocks.select).toHaveBeenCalledWith('email role');
    });

    it('should allow multiple mock instances independently', async () => {
      const mock1 = makeFindSortLimitSelectLean([{ id: '1' }]);
      const mock2 = makeFindSortLimitSelectLean([{ id: '2' }]);

      const result1 = await mock1.chain.sort({}).limit(1).select('id').lean();
      const result2 = await mock2.chain.sort({}).limit(1).select('id').lean();

      expect(result1).toEqual([{ id: '1' }]);
      expect(result2).toEqual([{ id: '2' }]);
      expect(mock1.mocks.lean).toHaveBeenCalledTimes(1);
      expect(mock2.mocks.lean).toHaveBeenCalledTimes(1);
    });
  });
});
