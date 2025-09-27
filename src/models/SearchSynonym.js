const { Schema, model, models } = require('mongoose');
const {
  getMarketplaceMockModelFactory,
  shouldUseMarketplaceMockModel,
} = require('./utils/mockModel');

const SearchSynonymSchema = new Schema(
  {
    locale: { type: String, enum: ['en', 'ar'], required: true, index: true },
    term: { type: String, required: true },
    synonyms: [String],
  },
  { timestamps: true }
);

SearchSynonymSchema.index({ locale: 1, term: 1 }, { unique: true });

const SearchSynonymModel = shouldUseMarketplaceMockModel()
  ? new (getMarketplaceMockModelFactory())('searchsynonyms')
  : (models.SearchSynonym || model('SearchSynonym', SearchSynonymSchema));

module.exports = SearchSynonymModel;
module.exports.SearchSynonym = SearchSynonymModel;
module.exports.SearchSynonymSchema = SearchSynonymSchema;
