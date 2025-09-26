const path = require('path');

function shouldUseMarketplaceMockModel() {
  const env = process.env.NODE_ENV ?? 'development';

  if (typeof globalThis !== 'undefined' && '__FIXZIT_MARKETPLACE_DB_MOCK__' in globalThis) {
    return true;
  }

  if (process.env.USE_REAL_DB === '1') {
    return false;
  }

  if (env === 'production') {
    return false;
  }

  if (process.env.USE_MOCK_DB === '1') {
    return true;
  }

  return false;
}

function resolveMockDbModule() {
  const mockDbPath = path.resolve(__dirname, '../../lib/mockDb');
  return require(mockDbPath);
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
