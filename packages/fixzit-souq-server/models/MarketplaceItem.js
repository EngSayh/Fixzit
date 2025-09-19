const mongoose = require('mongoose');

const MarketplaceItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    priceSar: { type: Number, default: 0 },
    vendor: { type: String, trim: true },
    category: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.MarketplaceItem || mongoose.model('MarketplaceItem', MarketplaceItemSchema);

