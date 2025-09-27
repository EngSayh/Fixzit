const { Schema, model, models } = require('mongoose');
const {
  getMarketplaceMockModelFactory,
  shouldUseMarketplaceMockModel,
} = require('./utils/mockModel');

const COLLECTION_NAME = 'searchsynonyms';

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

const SearchSynonymModel = useMockModel
  ? cachedMockSearchSynonym
  : (models.SearchSynonym || model('SearchSynonym', SearchSynonymSchema));

module.exports = SearchSynonymModel;
module.exports.SearchSynonym = SearchSynonymModel;
module.exports.SearchSynonymSchema = SearchSynonymSchema;
