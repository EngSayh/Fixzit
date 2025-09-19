const mongoose = require('mongoose');

const FinanceMetricSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, default: 0 },
    unit: { type: String, default: 'SAR' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.FinanceMetric || mongoose.model('FinanceMetric', FinanceMetricSchema);

