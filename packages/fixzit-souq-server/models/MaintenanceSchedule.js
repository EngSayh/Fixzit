const mongoose = require('mongoose');

const maintenanceScheduleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
  assetName: { type: String, required: true },
  assetType: { type: String, required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  propertyName: { type: String, required: true },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'semi-annual', 'annual'],
    required: true
  },
  lastPerformed: { type: Date },
  nextDue: { type: Date, required: true },
  assignedTeam: { type: String, required: true },
  estimatedDuration: { type: Number, required: true }, // in hours
  estimatedCost: { type: Number, required: true },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['scheduled', 'overdue', 'in_progress', 'completed', 'skipped'],
    default: 'scheduled'
  },
  compliance: { type: Boolean, default: false },
  checklistItems: [{
    item: String,
    completed: { type: Boolean, default: false },
    notes: String
  }],
  history: [{
    date: Date,
    performedBy: String,
    duration: Number,
    cost: Number,
    notes: String,
    issues: [String]
  }],
  documents: [String],
  notifications: [{
    daysBefore: Number,
    sentTo: [String],
    sent: { type: Boolean, default: false }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update status based on dates
maintenanceScheduleSchema.pre('save', function(next) {
  if (this.status !== 'completed' && new Date() > this.nextDue) {
    this.status = 'overdue';
  }
  this.updatedAt = new Date();
  next();
});

// Calculate next due date after completion
maintenanceScheduleSchema.methods.calculateNextDue = function() {
  const now = new Date();
  let nextDate = new Date(this.nextDue);
  
  switch(this.frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'semi-annual':
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case 'annual':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }
  
  return nextDate;
};

module.exports = mongoose.model('MaintenanceSchedule', maintenanceScheduleSchema);