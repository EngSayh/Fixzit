import Journal from '@/server/models/finance/Journal';

describe('inspect Journal module', () => {
  it('logs shape', () => {
     
    console.log('Journal is', typeof Journal);
     
    const journalExport = Journal as Record<string, unknown>;
    console.log('Journal keys', Object.keys(journalExport));
     
    const defaultExport = (journalExport as { default?: unknown }).default;
    console.log('Journal.default type', typeof defaultExport);
     
    const defaultKeys = defaultExport && typeof defaultExport === 'object'
      ? Object.keys(defaultExport as Record<string, unknown>)
      : [];
    console.log('Journal.default keys', defaultKeys);
  });
});
