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
  try {
    // Try requiring the TypeScript file (will work in Node with proper transpilation)
    const mod = require('../lib/mockDb');
    if (mod && typeof mod.MockModel === 'function') {
      return mod.MockModel;
    }
    // Fallback to try other possible exports
    if (typeof mod === 'function') {
      return mod;
    }
    throw new Error('MockModel not found in mockDb module');
  } catch (error) {
    // If TypeScript module fails, create a simple mock
    console.warn('MockDb module not available, using simple mock for SearchSynonym');
    return class SimpleMock {
      constructor(collectionName) {
        this.collectionName = collectionName;
        this.data = [];
      }
      async find() { return this.data; }
      async findOne() { return null; }
      async create(doc) { return doc; }
      async findOneAndUpdate() { return null; }
      async deleteOne() { return { deletedCount: 0 }; }
    };
  }
}

const SearchSynonymModel = shouldUseMockModel()
  ? new (loadMockModel())('searchsynonyms')
  : (models.SearchSynonym || model('SearchSynonym', SearchSynonymSchema));

module.exports = SearchSynonymModel;
module.exports.SearchSynonym = SearchSynonymModel;
module.exports.SearchSynonymSchema = SearchSynonymSchema;
