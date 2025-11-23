import Journal from '@/server/models/finance/Journal';

describe('inspect Journal module', () => {
  it('logs shape', () => {
    const journalAny = Journal as unknown as Record<string, unknown>;
    const defaultExport = (journalAny as { default?: Record<string, unknown> }).default ?? {};

    console.log('Journal is', typeof Journal);
    console.log('Journal keys', Object.keys(journalAny));
    console.log('Journal.default type', typeof defaultExport);
    console.log('Journal.default keys', Object.keys(defaultExport));
  });
});
