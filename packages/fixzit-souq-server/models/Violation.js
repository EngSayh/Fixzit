const mongoose = require('mongoose');

const violationSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ComplianceDoc' },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  type: { type: String, required: true },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  description: { type: String, required: true },
  dateReported: { type: Date, default: Date.now },
  dueDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'overdue'],
    default: 'open'
  },
  assignedTo: { type: String },
  resolutionNotes: { type: String },
  resolvedDate: { type: Date },
  fineAmount: { type: Number, default: 0 },
  attachments: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update status to overdue if past due date
violationSchema.pre('save', function(next) {
  if (this.status !== 'resolved' && new Date() > this.dueDate) {
    this.status = 'overdue';
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Violation', violationSchema);