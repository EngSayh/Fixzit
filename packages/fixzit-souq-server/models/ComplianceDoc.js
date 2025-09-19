const mongoose = require('mongoose');

const ComplianceDocSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['license', 'permit', 'certificate', 'insurance', 'inspection', 'audit'],
      required: true 
    },
    category: { type: String, required: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    propertyName: { type: String, trim: true },
    issueDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    status: { 
      type: String, 
      enum: ['valid', 'expiring', 'expired', 'pending'],
      default: 'valid'
    },
    documentUrl: { type: String },
    issuingAuthority: { type: String },
    referenceNumber: { type: String },
    permitNumber: { type: String }, // Keep for backward compatibility
    lastInspectionDate: { type: Date },
    nextInspectionDate: { type: Date },
    complianceScore: { type: Number, default: 100 },
    violations: { type: Number, default: 0 },
    notes: { type: String },
    attachments: [String],
    reminders: [{
      days: Number,
      sent: { type: Boolean, default: false },
      sentDate: Date
    }],
    auditTrail: [{
      action: String,
      user: String,
      date: { type: Date, default: Date.now },
      details: String
    }],
    renewalDate: { type: Date },
    expiry: { type: Date } // Keep for backward compatibility
  },
  { timestamps: true }
);

// Update status based on expiry date
ComplianceDocSchema.pre('save', function(next) {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  // Use expiryDate or fall back to expiry for backward compatibility
  const expirationDate = this.expiryDate || this.expiry;
  
  if (expirationDate) {
    if (expirationDate < now) {
      this.status = 'expired';
    } else if (expirationDate < thirtyDaysFromNow) {
      this.status = 'expiring';
    } else {
      this.status = 'valid';
    }
  }
  
  // Sync expiry fields for backward compatibility
  if (this.expiryDate && !this.expiry) {
    this.expiry = this.expiryDate;
  } else if (this.expiry && !this.expiryDate) {
    this.expiryDate = this.expiry;
  }
  
  next();
});

module.exports = mongoose.models.ComplianceDoc || mongoose.model('ComplianceDoc', ComplianceDocSchema);

