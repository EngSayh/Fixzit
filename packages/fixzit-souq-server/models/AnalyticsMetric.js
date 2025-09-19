const mongoose = require('mongoose');

const AnalyticsMetricSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.models.AnalyticsMetric || mongoose.model('AnalyticsMetric', AnalyticsMetricSchema);

