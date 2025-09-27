const { Schema, model, models } = require('mongoose');
const {
  getMarketplaceMockModelFactory,
  shouldUseMarketplaceMockModel,
} = require('./utils/mockModel');

const COLLECTION_NAME = 'marketplaceproducts';

const ProductSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, required: true, index: true },
    vendorId: { type: Schema.Types.ObjectId, index: true },
    categoryId: { type: Schema.Types.ObjectId, required: true, index: true },
    sku: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    title: {
      en: { type: String, required: true, trim: true },
      ar: { type: String, trim: true },
    },
    summary: { type: String, trim: true },
    brand: { type: String, trim: true },
    standards: [{ type: String, trim: true }],
    specs: { type: Schema.Types.Mixed, default: {} },
    media: [
      {
        url: { type: String, required: true, trim: true },
        role: { type: String, enum: ['GALLERY', 'MSDS', 'COA'], default: 'GALLERY' },
        title: { type: String, trim: true },
      },
    ],
    buy: {
      price: { type: Number, required: true },
      currency: { type: String, required: true, trim: true },
      uom: { type: String, required: true, trim: true },
      minQty: { type: Number },
      leadDays: { type: Number },
    },
    stock: {
      onHand: { type: Number, default: 0 },
      reserved: { type: Number, default: 0 },
      location: { type: String, trim: true },
    },
    rating: {
      avg: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    status: { type: String, enum: ['ACTIVE', 'DRAFT', 'ARCHIVED'], default: 'ACTIVE', index: true },
  },
  { timestamps: true }
);

ProductSchema.index({ orgId: 1, sku: 1 }, { unique: true });
ProductSchema.index({ orgId: 1, slug: 1 }, { unique: true });
ProductSchema.index({ orgId: 1, status: 1 });
ProductSchema.index({ 'title.en': 'text', 'title.ar': 'text', summary: 'text', brand: 'text', standards: 'text' });

const ProductModel = models.MarketplaceProduct || model('MarketplaceProduct', ProductSchema);

let cachedMockMarketplaceProduct;

const useMockModel = shouldUseMarketplaceMockModel();

if (useMockModel && !cachedMockMarketplaceProduct) {
  cachedMockMarketplaceProduct = new (getMarketplaceMockModelFactory())(COLLECTION_NAME);
  if (models && typeof models === 'object') {
    models.MarketplaceProduct = cachedMockMarketplaceProduct;
  }
}

const MarketplaceProduct = useMockModel ? cachedMockMarketplaceProduct : ProductModel;

module.exports = MarketplaceProduct;
module.exports.MarketplaceProduct = MarketplaceProduct;
module.exports.MarketplaceProductSchema = ProductSchema;
