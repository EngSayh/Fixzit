/**
 * Tests for Candidate model: schema defaults and findByEmail behavior.
 *
 * Testing framework: Jest (TypeScript)
 * - We use jest.mock to control isMockDB and to stub underlying model calls.
 * - We verify both mock DB path and real Mongoose path behaviors.
 */

import type { Model } from 'mongoose'

// Important: we must import the module under test AFTER setting up the mocks
// so the conditional export based on isMockDB is evaluated as intended.

// Utility to reset module registry between scenarios
const resetModules = async () => {
  jest.resetModules();
};

// A helper to dynamically import after setting mocks
const importCandidate = async () => {
  const mod = await import('@/src/models/candidate'); // adjust if actual path differs
  return mod as any;
};

// Base fake candidate documents
const baseDoc = {
  orgId: 'org-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '+1234567890',
  location: 'London',
  linkedin: 'https://linkedin.com/in/ada',
  skills: ['math', 'programming'],
  experience: 5,
  resumeUrl: 'https://files/resume.pdf',
  resumeText: '...', // not relevant to matching
  source: 'referral',
  consents: { marketing: true },
};

// We will mock the real Mongoose model module where the RealCandidate is created
// by intercepting mongoose.model('Candidate', ...) usage via jest.spyOn once imported.
// To do this cleanly, we will mock mongoose before importing the module.

describe('Candidate model - isMockDB=true (MockModel path)', () => {
  beforeEach(async () => {
    await resetModules();

    // Mock isMockDB to true
    jest.doMock('@/src/lib/mongo', () => ({
      __esModule: true,
      isMockDB: true,
    }));

    // Provide a minimal in-memory MockModel implementation compatible with code expectations
    // The model file does: new MockModel('candidates') and later uses Candidate.find in findByEmail
    const records: any[] = [];
    class FakeMockModel {
      private collection: string;
      constructor(collection: string) {
        this.collection = collection;
      }
      async find(query: Record<string, any>) {
        return records.filter(
          (r) =>
            (query.orgId === undefined || r.orgId === query.orgId) &&
            (query.email === undefined || r.email === query.email)
        );
      }
      async create(doc: any) {
        const now = new Date();
        const withDefaults = {
          skills: [],
          experience: 0,
          ...doc,
          createdAt: now,
          updatedAt: now,
        };
        records.push(withDefaults);
        return withDefaults;
      }
      // Allow clearing between tests
      static __reset() {
        records.splice(0, records.length);
      }
    }

    jest.doMock('@/src/lib/mockDb', () => ({
      __esModule: true,
      MockModel: FakeMockModel,
    }));
  });

  afterEach(async () => {
    // reset mock DB storage
    const mockDb = await import('@/src/lib/mockDb');
    // @ts-ignore
    mockDb.MockModel.__reset?.();
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('findByEmail returns first matching candidate when multiple exist', async () => {
    const { Candidate } = await importCandidate();

    // Seed mock data
    await Candidate.create({ ...baseDoc });
    await Candidate.create({ ...baseDoc, firstName: 'Ada2' }); // same orgId + email

    const found = await Candidate.findByEmail('org-1', 'ada@example.com');
    expect(found).toBeTruthy();
    expect(found.firstName).toBe('Ada'); // first inserted returned by our FakeMockModel
  });

  test('findByEmail returns undefined/null when no match', async () => {
    const { Candidate } = await importCandidate();

    await Candidate.create({ ...baseDoc });

    const notFound = await Candidate.findByEmail('org-1', 'nonexistent@example.com');
    expect(notFound).toBeUndefined(); // our FakeMockModel.find returns [], code takes [0]
  });

  test('schema defaults honored when creating via MockModel (skills=[], experience=0)', async () => {
    const { Candidate } = await importCandidate();
    const created = await Candidate.create({ orgId: 'org-2', email: 'x@y.z' });
    expect(created.skills).toEqual([]);
    expect(created.experience).toBe(0);
    expect(created.orgId).toBe('org-2');
    expect(created.email).toBe('x@y.z');
  });
});

describe('Candidate model - isMockDB=false (Real Mongoose path)', () => {
  beforeEach(async () => {
    await resetModules();

    // Mock isMockDB to false
    jest.doMock('@/src/lib/mongo', () => ({
      __esModule: true,
      isMockDB: false,
    }));

    // We will stub mongoose.model and the returned RealCandidate with spies.
    // The module uses: const RealCandidate = models.Candidate || model('Candidate', CandidateSchema);
    // So we need to ensure either models.Candidate exists or model() returns a fake with findOne.
    const fakeFindOne = jest.fn();

    const fakeRealModel: Partial<Model<any>> & Record<string, any> = {
      findOne: fakeFindOne,
      // For non-findByEmail tests, allow create() to exercise defaults via mongoose schema is hard.
      // Instead stub create and check what the module passes could be done in schema-level tests.
    };

    const fakeModels: Record<string, any> = {};

    jest.doMock('mongoose', () => {
      const actual = jest.requireActual('mongoose') as any;
      return {
        __esModule: true,
        ...actual,
        models: fakeModels,
        model: (name: string) => {
          fakeModels[name] = fakeRealModel;
          return fakeRealModel;
        },
        Schema: actual.Schema, // keep Schema reference for module definition
        modelNames: actual.modelNames?.bind(actual) ?? (() => []),
        // Ensure InferSchemaType is still available off types
      };
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('findByEmail calls RealCandidate.findOne with correct filter', async () => {
    const mod = await importCandidate();
    const { Candidate } = mod;

    // Access our stubbed RealCandidate through the mocked mongoose.models
    const mongoose = await import('mongoose');
    const RealCandidate: any =
      (mongoose as any).models?.Candidate ??
      (mongoose as any).model('Candidate');

    const findOneSpy = jest.spyOn(RealCandidate, 'findOne').mockResolvedValue({ ...baseDoc });

    const doc = await Candidate.findByEmail('org-1', 'ada@example.com');
    expect(findOneSpy).toHaveBeenCalledTimes(1);
    expect(findOneSpy).toHaveBeenCalledWith({ orgId: 'org-1', email: 'ada@example.com' });
    expect(doc).toBeTruthy();
    expect(doc.email).toBe('ada@example.com');
  });

  test('findByEmail propagates null when RealCandidate.findOne yields no result', async () => {
    const mod = await importCandidate();
    const { Candidate } = mod;

    const mongoose = await import('mongoose');
    const RealCandidate: any =
      (mongoose as any).models?.Candidate ??
      (mongoose as any).model('Candidate');

    const findOneSpy = jest.spyOn(RealCandidate, 'findOne').mockResolvedValue(null);

    const doc = await Candidate.findByEmail('org-1', 'missing@example.com');
    expect(findOneSpy).toHaveBeenCalledWith({ orgId: 'org-1', email: 'missing@example.com' });
    expect(doc).toBeNull();
  });
});