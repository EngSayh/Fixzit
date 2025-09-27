const path = require('path');

function shouldUseMarketplaceMockModel() {
  const env = process.env.NODE_ENV ?? 'development';

  const injectedMock =
    typeof globalThis !== 'undefined'
      ? (globalThis.__FIXZIT_MARKETPLACE_DB_MOCK__)
      : undefined;

  if (injectedMock) {
    return true;
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
