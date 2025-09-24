/**
 * Tests for POST bulk notifications handler.
 *
 * Testing library/framework: Vitest (Jest-like) with TS support.
 * - Uses describe/it/expect with mocks for external dependencies.
 * - Mocks next/server NextResponse and getDatabase from "@/lib/mongodb".
 *
 * These tests focus on:
 * - Zod validation behavior (invalid action, invalid body).
 * - DB unavailable returned as 503.
 * - Each action branch: mark-read, mark-unread, archive, delete.
 * - Edge cases: empty/falsey IDs filtered out; partial successes; operation throws.
 * - Invalid ObjectId causing constructor error propagating.
 */
 
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// We import the module under test after setting up mocks to ensure they take effect.
import type { NextRequest } from 'next/server';

// Mock next/server's NextResponse.json to capture status and body payload.
vi.mock('next/server', async () => {
  const actual = await vi.importActual<any>('next/server');
  return {
    ...actual,
    NextResponse: {
      json: vi.fn((data: any, init?: { status?: number }) => ({
        data,
        status: init?.status ?? 200,
      })),
    },
  };
});

// Mock mongodb ObjectId to validate constructor calls but retain throwing semantics for invalid ids
// We'll import the real module and wrap ObjectId to throw like mongodb does.
import { NextResponse } from 'next/server';

// Create a lightweight faux ObjectId that throws on invalid input while allowing tracking
class FakeObjectId {
  static created: string[] = [];
  id: string;
  constructor(s: any) {
    if (typeof s !== 'string' || !/^[0-9a-fA-F]{24}$/.test(s)) {
      // Simulate mongodb's BSONTypeError behavior
      throw new Error('BSONTypeError: Argument passed in must be a string of 12 bytes or a string of 24 hex characters');
    }
    this.id = s;
    FakeObjectId.created.push(s);
  }
}
vi.mock('mongodb', () => {
  return {
    ObjectId: FakeObjectId as any,
  };
});

// Mock DB getDatabase and collection methods
const updateMany = vi.fn();
const deleteMany = vi.fn();

const collection = vi.fn(() => ({
  updateMany,
  deleteMany,
}));

const fakeDb = {
  collection,
};

vi.mock('@/lib/mongodb', () => ({
  getDatabase: vi.fn(),
}));

// Import under test AFTER mocks
import { POST } from '../../src/app/api/notifications/bulk/route'; // Adjust if route path differs

// Helper to build a NextRequest-like object with just .json()
const makeReq = (body: any): NextRequest => {
  return {
    // @ts-expect-error - minimal implementation for tests
    json: vi.fn().mockResolvedValue(body),
  };
};

const { getDatabase } = await import('@/lib/mongodb');

describe('API POST /notifications/bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // @ts-ignore - reset created ids
    FakeObjectId.created = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 503 when database is unavailable', async () => {
    (getDatabase as any).mockRejectedValueOnce(new Error('connection failed'));

    const req = makeReq({ action: 'mark-read', notificationIds: [''.padEnd(24, 'a')] });
    const res: any = await POST(req);

    expect(NextResponse.json).toHaveBeenCalled();
    expect(res.status).toBe(503);
    expect(res.data).toEqual({ error: 'DB unavailable' });
  });

  it('filters out falsy IDs and succeeds when nothing to process (0 ids)', async () => {
    (getDatabase as any).mockResolvedValueOnce(fakeDb);
    updateMany.mockResolvedValueOnce({ acknowledged: true, matchedCount: 0, modifiedCount: 0 });

    const req = makeReq({ action: 'mark-read', notificationIds: ['', null, undefined, 0, false] });
    const res: any = await POST(req);

    expect(collection).toHaveBeenCalledWith('notifications');
    expect(updateMany).toHaveBeenCalledWith({ _id: { $in: [] } }, { $set: { read: true } });
    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      success: true, // 0 === 0
      total: 0,
      successful: 0,
      failed: 0,
      results: [],
    });
  });

  it('marks notifications as read (happy path full success)', async () => {
    (getDatabase as any).mockResolvedValueOnce(fakeDb);
    updateMany.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 2 });

    const ids = ['a'.repeat(24), 'b'.repeat(24)];
    const req = makeReq({ action: 'mark-read', notificationIds: ids });
    const res: any = await POST(req);

    expect(updateMany).toHaveBeenCalledWith(
      { _id: { $in: expect.any(Array) } },
      { $Set: { read: true } }
    );
    expect(res.data).toEqual({
      success: true,
      total: 2,
      successful: 2,
      failed: 0,
      results: [],
    });
  });

  it('marks notifications as unread (partial success)', async () => {
    (getDatabase as any).mockResolvedValueOnce(fakeDb);
    updateMany.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 });

    const ids = ['c'.repeat(24), 'd'.repeat(24)];
    const req = makeReq({ action: 'mark-unread', notificationIds: ids });
    const res: any = await POST(req);

    expect(updateMany).toHaveBeenCalledWith(
      { _id: { $in: expect.any(Array) } },
      { $set: { read: false } }
    );
    expect(res.data).toEqual({
      success: false,
      total: 2,
      successful: 1,
      failed: 1,
      results: [],
    });
  });

  it('archives notifications', async () => {
    (getDatabase as any).mockResolvedValueOnce(fakeDb);
    updateMany.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 3 });

    const ids = ['e'.repeat(24), 'f'.repeat(24), 'a'.repeat(24)];
    const req = makeReq({ action: 'archive', notificationIds: ids });
    const res: any = await POST(req);

    expect(updateMany).toHaveBeenCalledWith(
      { _id: { $in: expect.any(Array) } },
      { $set: { archived: true } }
    );
    expect(res.data).toEqual({
      success: true,
      total: 3,
      successful: 3,
      failed: 0,
      results: [],
    });
  });

  it('deletes notifications (partial deletion)', async () => {
    (getDatabase as any).mockResolvedValueOnce(fakeDb);
    deleteMany.mockResolvedValueOnce({ acknowledged: true, deletedCount: 1 });

    const ids = ['1'.repeat(24), '2'.repeat(24)];
    const req = makeReq({ action: 'delete', notificationIds: ids });
    const res: any = await POST(req);

    expect(deleteMany).toHaveBeenCalledWith(
      { _id: { $in: expect.any(Array) } }
    );
    expect(res.data).toEqual({
      success: false,
      total: 2,
      successful: 1,
      failed: 1,
      results: [],
    });
  });

  it('deletes notifications (full deletion success)', async () => {
    (getDatabase as any).mockResolvedValueOnce(fakeDb);
    deleteMany.mockResolvedValueOnce({ acknowledged: true, deletedCount: 2 });

    const ids = ['9'.repeat(24), '8'.repeat(24)];
    const req = makeReq({ action: 'delete', notificationIds: ids });
    const res: any = await POST(req);

    expect(deleteMany).toHaveBeenCalledWith(
      { _id: { $in: expect.any(Array) } }
    );
    expect(res.data).toEqual({
      success: true,
      total: 2,
      successful: 2,
      failed: 0,
      results: [],
    });
  });

  it('returns success: false with zero successful when collection operation throws', async () => {
    (getDatabase as any).mockResolvedValueOnce(fakeDb);
    updateMany.mockRejectedValueOnce(new Error('write error'));

    const ids = ['3'.repeat(24)];
    const req = makeReq({ action: 'mark-read', notificationIds: ids });
    const res: any = await POST(req);

    // catch block returns default status (200) with failure object
    expect(res.status).toBe(200);
    expect(res.data).toEqual({
      success: false,
      total: 1,
      successful: 0,
      failed: 1,
      results: [],
    });
  });

  it('throws when notificationIds contains an invalid ObjectId string', async () => {
    (getDatabase as any).mockResolvedValueOnce(fakeDb);

    const req = makeReq({ action: 'mark-read', notificationIds: ['invalid'] });
    await expect(POST(req)).rejects.toThrow(/BSONTypeError|24 hex/);
  });

  it('throws ZodError when action is invalid', async () => {
    (getDatabase as any).mockResolvedValueOnce(fakeDb);
    const req = makeReq({ action: 'flip', notificationIds: ['a'.repeat(24)] });
    await expect(POST(req)).rejects.toBeInstanceOf(Error);
  });

  it('handles a mixture of falsy and valid IDs (filters falsy out)', async () => {
    (getDatabase as any).mockResolvedValueOnce(fakeDb);
    updateMany.mockResolvedValueOnce({ acknowledged: true, modifiedCount: 1 });

    const req = makeReq({ action: 'mark-read', notificationIds: ['', 'a'.repeat(24), null, undefined] });
    const res: any = await POST(req);

    expect(res.data).toEqual({
      success: true,
      total: 1,
      successful: 1,
      failed: 0,
      results: [],
    });
  });
});