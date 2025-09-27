const path = require('path');

function shouldUseMarketplaceMockModel() {
  const env = process.env.NODE_ENV ?? 'development';

  const hasInjectedMock =
    typeof globalThis !== 'undefined' && Object.prototype.hasOwnProperty.call(globalThis, '__FIXZIT_MARKETPLACE_DB_MOCK__');

  if (hasInjectedMock) {
    const injectedMock = globalThis.__FIXZIT_MARKETPLACE_DB_MOCK__;
    // Tests can assign "false" explicitly to fall back to the real database without
    // deleting the sentinel. Treat any truthy value as "use the mock".
    return Boolean(injectedMock);
  }

  if (process.env.USE_REAL_DB === '1') {
    return false;
  }

  if (env === 'production') {
    return false;
  }

  if (env === 'test') {
    return true;
  }

  if (process.env.USE_MOCK_DB === '1') {
    return true;
  }

  return false;
}

function resolveMockDbModule() {
  const candidatePaths = [
    path.resolve(__dirname, '../../lib/mockDb.js'),
    path.resolve(__dirname, '../../lib/mockDb.ts'),
    path.resolve(__dirname, '../../lib/mockDb'),
  ];

  const errors = [];

  for (const candidate of candidatePaths) {
    try {
      return require(candidate);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${candidate}: ${message}`);
    }
  }

  throw new Error(
    `Unable to load marketplace mock DB. Tried the following paths -> ${errors.join('; ')}`,
  );
}

function getMarketplaceMockModelFactory() {
  const mod = resolveMockDbModule();
  if (mod && typeof mod.MockModel === 'function') {
    return mod.MockModel;
  }
  if (typeof mod === 'function') {
    return mod;
  }
  throw new Error('MockModel implementation not found');
}

module.exports = {
  getMarketplaceMockModelFactory,
  shouldUseMarketplaceMockModel,
};
