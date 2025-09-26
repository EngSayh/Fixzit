const { Schema, model, models } = require('mongoose');

function shouldUseMockModel() {
  const env = process.env.NODE_ENV ?? 'development';
  if ('__FIXZIT_MARKETPLACE_DB_MOCK__' in globalThis) {
    return true;
  }
  if (env === 'production') {
    return false;
  }
  if (process.env.USE_MOCK_DB === '1') {
    return true;
  }
  if (process.env.USE_REAL_DB === '1') {
    return false;
  }
  return false;
}

const SearchSynonymSchema = new Schema(
  {
    locale: { type: String, enum: ['en', 'ar'], required: true, index: true },
    term: { type: String, required: true },
    synonyms: [String],
  },
  { timestamps: true }
);

SearchSynonymSchema.index({ locale: 1, term: 1 }, { unique: true });

function loadMockModel() {
  const mod = require('../lib/mockDb');
  if (mod && typeof mod.MockModel === 'function') {
    return mod.MockModel;
  }
  if (typeof mod === 'function') {
    return mod;
  }
  throw new Error('MockModel implementation not found');
}

const SearchSynonymModel = shouldUseMockModel()
  ? new (loadMockModel())('searchsynonyms')
  : (models.SearchSynonym || model('SearchSynonym', SearchSynonymSchema));

module.exports = SearchSynonymModel;
module.exports.SearchSynonym = SearchSynonymModel;
module.exports.SearchSynonymSchema = SearchSynonymSchema;
