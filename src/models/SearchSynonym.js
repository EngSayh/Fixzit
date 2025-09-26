const { Schema, model, models } = require('mongoose');

const LOCAL_URI_PATTERNS = [/localhost/i, /127\.0\.0\.1/];

function shouldUseMockModel() {
  const env = process.env.NODE_ENV ?? 'development';
  if (process.env.USE_REAL_DB === '1') {
    return false;
  }
  if (env === 'production') {
    return false;
  }

  const uri = process.env.MONGODB_URI ?? '';
  if (!uri) {
    return true;
  }

  return LOCAL_URI_PATTERNS.some(pattern => pattern.test(uri));
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
