const { Schema, model, models } = require('mongoose');
const {
  getMarketplaceMockModelFactory,
  shouldUseMarketplaceMockModel,
} = require('./utils/mockModel');
const { MARKETPLACE_COLLECTIONS } = require('./utils/collectionNames');

const COLLECTION_NAME = MARKETPLACE_COLLECTIONS.SYNONYMS;

const SearchSynonymSchema = new Schema(
  {
    locale: { type: String, enum: ['en', 'ar'], required: true, index: true },
    term: { type: String, required: true },
    synonyms: [String],
  },
  { timestamps: true }
);

SearchSynonymSchema.index({ locale: 1, term: 1 }, { unique: true });

let cachedMockSearchSynonym;

const useMockModel = shouldUseMarketplaceMockModel();

if (useMockModel && !cachedMockSearchSynonym) {
  cachedMockSearchSynonym = new (getMarketplaceMockModelFactory())(COLLECTION_NAME);
  if (models && typeof models === 'object') {
    models.SearchSynonym = cachedMockSearchSynonym;
  }
}

let SearchSynonymModel;

if (useMockModel) {
  SearchSynonymModel = cachedMockSearchSynonym;
} else {
  const existingModel = models.SearchSynonym;
  const isMongooseModel = Boolean(existingModel?.schema instanceof Schema);

  if (!isMongooseModel && existingModel) {
    delete models.SearchSynonym;
  }

  SearchSynonymModel = models.SearchSynonym || model('SearchSynonym', SearchSynonymSchema);
}

module.exports = SearchSynonymModel;
module.exports.SearchSynonym = SearchSynonymModel;
module.exports.SearchSynonymSchema = SearchSynonymSchema;
