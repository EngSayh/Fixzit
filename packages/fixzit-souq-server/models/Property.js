const mongoose = require('mongoose');

const PropertySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    type: { type: String, enum: ['residential', 'commercial', 'industrial', 'mixed'], default: 'commercial' },
    units: { type: Number, default: 0 },
    occupancyRate: { type: Number, min: 0, max: 100, default: 0 },
    monthlyRevenueSar: { type: Number, default: 0 },
    city: { type: String, trim: true },
    country: { type: String, trim: true, default: 'Saudi Arabia' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Property || mongoose.model('Property', PropertySchema);

