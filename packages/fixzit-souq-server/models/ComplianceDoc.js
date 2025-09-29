const mongoose = require('mongoose');

const ComplianceDocSchema = new mongoose.Schema(
  {
    permitNumber: { type: String, required: true },
    type: { type: String, trim: true },
    propertyName: { type: String, trim: true },
    expiry: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.models.ComplianceDoc || mongoose.model('ComplianceDoc', ComplianceDocSchema);

