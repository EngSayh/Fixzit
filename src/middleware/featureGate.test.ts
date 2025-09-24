/**
 * Tests for feature gating middleware and utilities.
 *
 * Assumed test framework: Jest (ts-jest) with standard mocking APIs.
 * If using Vitest, replace jest.fn/jest.mock with vi.fn/vi.mock and update config accordingly.
 */

import { NextRequest, NextResponse } from 'next/server';

// We will import the module under test after setting up mocks so the mocked modules are applied.
jest.mock('../db/mongoose', () => ({
  dbConnect: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../models/Subscription', () => {
  const findOne = jest.fn();
  const sort = jest.fn();
  const populate = jest.fn();

  // Chainable mocks: Subscription.findOne(...).populate(...), Subscription.findOne(...).sort(...)
  findOne.mockReturnValue({
    populate,
    sort,
  });

  populate.mockReturnValue({
    populate, // in case of repeated populate
    sort,
  });

  sort.mockReturnValue({
    // terminal object; actual values to be set per-test via mock implementation
  });

  const Subscription = { findOne };
  // Allow tests to access/override mocks
  // @ts-ignore
  Subscription.__mocks = { findOne, sort, populate };
  // Default export shape similar to Mongoose model
  return {
    __esModule: true,
    default: Subscription,
  };
});

jest.mock('../models/Customer', () => ({
  __esModule: true,
  default: {},
}));

// Mock global fetch for useFeatureGate tests
const originalFetch = global.fetch;
beforeAll(() => {
  // @ts-ignore
  global.fetch = jest.fn();
});
afterAll(() => {
  // @ts-ignore
  global.fetch = originalFetch;
});

// Create controlled NextResponse behaviors
const jsonSpy = jest.spyOn(NextResponse, 'json');
const redirectSpy = jest.spyOn(NextResponse, 'redirect');

afterEach(() => {
  jest.clearAllMocks();
});

describe('featureGate middleware and utilities', () => {
  // Import after mocks
  const { dbConnect } = require('../db/mongoose');
  const Subscription = require('../models/Subscription').default;
  const { findOne } = Subscription.__mocks;

  const {
    FeatureGateError,
    checkModuleAccess,
    createFeatureGate,
    isModuleEnabled,
    getEnabledModules,
    getSubscriptionStatus,
    useFeatureGate,
  } = require('./featureGate');

  function makeReq(url = 'https://example.com/path?x=1'): NextRequest {
    // NextRequest constructor is not straightforward in tests; use a minimal shim:
    // We only need req.url for redirect base resolution.
    return { url } as unknown as NextRequest;
  }

  describe('FeatureGateError', () => {
    test('constructs with defaults', () => {
      const e = new FeatureGateError('msg');
      expect(e).toBeInstanceOf(Error);
      expect(e.name).toBe('FeatureGateError');
      expect(e.message).toBe('msg');
      expect(e.statusCode).toBe(402);
      expect(e.requiredModules).toEqual([]);
    });

    test('constructs with explicit values', () => {
      const e = new FeatureGateError('nope', 499, ['A', 'B']);
      expect(e.statusCode).toBe(499);
      expect(e.requiredModules).toEqual(['A', 'B']);
    });
  });

  describe('checkModuleAccess', () => {
    test('returns false with all required as missing when no active subscription', async () => {
      // Subscription.findOne returns null
      findOne.mockResolvedValueOnce(null);

      const out = await checkModuleAccess('cust-1', ['A', 'B']);
      expect(dbConnect).toHaveBeenCalled();
      expect(out).toEqual({ hasAccess: false, missingModules: ['A', 'B'] });
    });

    test('returns true when all required modules are enabled', async () => {
      findOne.mockResolvedValueOnce({
        items: [{ moduleCode: 'A' }, { moduleCode: 'B' }, { moduleCode: 'C' }],
        status: 'active',
        populate: jest.fn().mockReturnThis(),
      });

      const out = await checkModuleAccess('cust-2', ['A', 'B']);
      expect(out).toEqual({ hasAccess: true, missingModules: [] });
    });

    test('returns false with only missing required modules', async () => {
      findOne.mockResolvedValueOnce({
        items: [{ moduleCode: 'A' }],
        status: 'active',
        populate: jest.fn().mockReturnThis(),
      });

      const out = await checkModuleAccess('cust-3', ['A', 'B', 'C']);
      expect(out).toEqual({ hasAccess: false, missingModules: ['B', 'C'] });
    });

    test('gracefully handles exceptions and returns false with all required as missing', async () => {
      findOne.mockRejectedValueOnce(new Error('db down'));
      const out = await checkModuleAccess('cust-err', ['X']);
      expect(out).toEqual({ hasAccess: false, missingModules: ['X'] });
    });
  });

  describe('createFeatureGate middleware', () => {
    test('returns null (allow) when access is granted', async () => {
      // checkModuleAccess is called internally; mock via Subscription data path
      findOne.mockResolvedValueOnce({
        items: [{ moduleCode: 'A' }, { moduleCode: 'B' }],
        status: 'active',
        populate: jest.fn().mockReturnThis(),
      });

      const gate = createFeatureGate({ requiredModules: ['A'] });
      const res = await gate(makeReq(), 'cust-allow');
      expect(res).toBeNull();
    });

    test('returns 402 JSON when access denied without redirectTo', async () => {
      findOne.mockResolvedValueOnce({
        items: [{ moduleCode: 'A' }],
        status: 'active',
        populate: jest.fn().mockReturnThis(),
      });

      const gate = createFeatureGate({ requiredModules: ['A', 'B'] });
      const res = await gate(makeReq(), 'cust-deny');
      expect(jsonSpy).toHaveBeenCalled();
      // First arg is body, second is init with status 402
      const [body, init] = jsonSpy.mock.calls[jsonSpy.mock.calls.length - 1];
      expect(init).toMatchObject({ status: 402 });
      expect(body).toMatchObject({
        error: 'Module not enabled on your subscription',
        missingModules: ['B'],
        requiredModules: ['A', 'B'],
      });
      expect(res).toBeDefined();
    });

    test('redirects when access denied and redirectTo specified', async () => {
      findOne.mockResolvedValueOnce({
        items: [{ moduleCode: 'A' }],
        status: 'active',
        populate: jest.fn().mockReturnThis(),
      });

      const gate = createFeatureGate({
        requiredModules: ['B'],
        redirectTo: '/upgrade',
      });
      const req = makeReq('https://app.example.com/dashboard');
      const res = await gate(req, 'cust-redirect');
      expect(redirectSpy).toHaveBeenCalled();
      const [target] = redirectSpy.mock.calls[redirectSpy.mock.calls.length - 1];
      expect(String(target)).toContain('/upgrade');
      expect(res).toBeDefined();
    });

    test('returns 500 JSON on unexpected exceptions', async () => {
      findOne.mockRejectedValueOnce(new Error('boom'));
      const gate = createFeatureGate({ requiredModules: ['A'] });
      const res = await gate(makeReq(), 'cust-error');
      expect(jsonSpy).toHaveBeenCalled();
      const [body, init] = jsonSpy.mock.calls[jsonSpy.mock.calls.length - 1];
      expect(init).toMatchObject({ status: 500 });
      expect(body).toMatchObject({ error: 'Failed to verify module access' });
      expect(res).toBeDefined();
    });
  });

  describe('isModuleEnabled', () => {
    test('returns true when module is enabled', async () => {
      findOne.mockResolvedValueOnce({
        items: [{ moduleCode: 'B' }],
        status: 'active',
        populate: jest.fn().mockReturnThis(),
      });
      const out = await isModuleEnabled('cust-4', 'B');
      expect(out).toBe(true);
    });

    test('returns false when module is not enabled', async () => {
      findOne.mockResolvedValueOnce({
        items: [{ moduleCode: 'A' }],
        status: 'active',
        populate: jest.fn().mockReturnThis(),
      });
      const out = await isModuleEnabled('cust-5', 'B');
      expect(out).toBe(false);
    });
  });

  describe('getEnabledModules', () => {
    test('returns empty array when no active subscription', async () => {
      findOne.mockResolvedValueOnce(null);
      const out = await getEnabledModules('cust-none');
      expect(out).toEqual([]);
    });

    test('returns mapped module codes', async () => {
      findOne.mockResolvedValueOnce({
        items: [{ moduleCode: 'X' }, { moduleCode: 'Y' }],
        status: 'active',
      });
      const out = await getEnabledModules('cust-list');
      expect(out).toEqual(['X', 'Y']);
    });

    test('returns empty array on exception', async () => {
      findOne.mockRejectedValueOnce(new Error('oops'));
      const out = await getEnabledModules('cust-err');
      expect(out).toEqual([]);
    });
  });

  describe('getSubscriptionStatus', () => {
    test('returns inactive when not found', async () => {
      // For getSubscriptionStatus, code uses findOne(...).sort(...). We emulate a chain result.
      // First call returns object with sort that resolves to null.
      Subscription.__mocks.findOne.mockReturnValueOnce({
        sort: jest.fn().mockResolvedValueOnce(null),
      });

      const out = await getSubscriptionStatus('cust-none');
      expect(out).toEqual({ status: 'inactive' });
    });

    test('returns subscription details when found', async () => {
      const sub = {
        status: 'active',
        planType: 'pro',
        billingCycle: 'monthly',
        nextInvoiceAt: new Date('2030-01-01T00:00:00.000Z'),
      };
      Subscription.__mocks.findOne.mockReturnValueOnce({
        sort: jest.fn().mockResolvedValueOnce(sub),
      });

      const out = await getSubscriptionStatus('cust-yes');
      expect(out).toMatchObject({
        status: 'active',
        planType: 'pro',
        billingCycle: 'monthly',
      });
      expect(new Date(out.nextInvoiceAt).toISOString()).toBe('2030-01-01T00:00:00.000Z');
    });

    test('returns inactive on exception', async () => {
      Subscription.__mocks.findOne.mockReturnValueOnce({
        sort: jest.fn().mockRejectedValueOnce(new Error('fail')),
      });
      const out = await getSubscriptionStatus('cust-err');
      expect(out).toEqual({ status: 'inactive' });
    });
  });

  describe('useFeatureGate hook - checkAccess', () => {
    test('resolves true when response.ok and not 402', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });
      const { checkAccess } = useFeatureGate();
      await expect(checkAccess(['A'])).resolves.toBe(true);

      expect(global.fetch).toHaveBeenCalledWith('/api/billing/check-access', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requiredModules: ['A'] }),
      }));
    });

    test('throws FeatureGateError with 402 and missingModules when 402 returned', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 402,
        json: async () => ({
          error: 'Module not enabled on your subscription',
          missingModules: ['B'],
        }),
      });
      const { checkAccess } = useFeatureGate();
      await expect(checkAccess(['B'])).rejects.toEqual(
        expect.objectContaining({
          name: 'FeatureGateError',
          statusCode: 402,
          requiredModules: ['B'], // NOTE: constructor receives missingModules into third param; code passes data.missingModules
        })
      );
    });

    test('wraps unexpected errors in FeatureGateError', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('network'));
      const { checkAccess } = useFeatureGate();
      await expect(checkAccess(['Z'])).rejects.toEqual(
        expect.objectContaining({
          name: 'FeatureGateError',
          message: 'Failed to check module access',
          statusCode: 402,
        })
      );
    });
  });
});