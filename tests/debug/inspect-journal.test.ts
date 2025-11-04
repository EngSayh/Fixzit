import Journal from '@/server/models/finance/Journal';

describe('inspect Journal module', () => {
  it('logs shape', () => {
    // eslint-disable-next-line no-console
    console.log('Journal is', typeof Journal);
    // eslint-disable-next-line no-console
    console.log('Journal keys', Object.keys(Journal as any));
    // eslint-disable-next-line no-console
    console.log('Journal.default type', typeof (Journal as any).default);
    // eslint-disable-next-line no-console
    console.log('Journal.default keys', Object.keys((Journal as any).default || {}));
  });
});
