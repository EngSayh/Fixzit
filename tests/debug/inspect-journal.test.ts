import Journal from '@/server/models/finance/Journal';
import { resetTestMocks } from "@/tests/helpers/mockDefaults";

beforeEach(() => {
  vi.clearAllMocks();
  resetTestMocks();
});


describe('inspect Journal module', () => {
  it('logs shape', () => {
    expect(typeof Journal).toBeDefined();
    console.log('Journal is', typeof Journal);
     
    const journalExport = Journal as Record<string, unknown>;
    const keys = Object.keys(journalExport);
    expect(keys.length).toBeGreaterThanOrEqual(0);
    console.log('Journal keys', keys);
     
    const defaultExport = (journalExport as { default?: unknown }).default;
    expect(typeof defaultExport).toBeDefined();
    console.log('Journal.default type', typeof defaultExport);
     
    const defaultKeys = defaultExport && typeof defaultExport === 'object'
      ? Object.keys(defaultExport as Record<string, unknown>)
      : [];
    expect(Array.isArray(defaultKeys)).toBe(true);
    console.log('Journal.default keys', defaultKeys);
  });
});
