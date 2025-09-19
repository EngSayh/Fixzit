const mongoose = require('mongoose');

const SupportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    category: { 
      type: String, 
      enum: ['technical', 'billing', 'property', 'maintenance', 'general', 'complaint'],
      default: 'general'
    },
    priority: { 
      type: String, 
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    status: { 
      type: String, 
      enum: ['open', 'in_progress', 'waiting_customer', 'resolved', 'closed', 'OPEN', 'IN_PROGRESS', 'RESOLVED'], 
      default: 'open' 
    },
    createdBy: {
      _id: { type: mongoose.Schema.Types.ObjectId },
      name: String,
      email: String,
      role: String
    },
    assignedTo: {
      _id: { type: mongoose.Schema.Types.ObjectId },
      name: String,
      email: String,
      department: String
    },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    propertyName: String,
    resolvedAt: Date,
    responseTime: Number, // in hours
    responseTimeHours: { type: Number, default: 0 }, // Keep for backward compatibility
    resolutionTime: Number, // in hours
    satisfaction: { type: Number, min: 1, max: 5 },
    tags: [String],
    attachments: [{
      name: String,
      url: String,
      size: Number,
      type: String
    }],
    messages: [{
      _id: { type: mongoose.Schema.Types.ObjectId, default: mongoose.Types.ObjectId },
      message: String,
      sender: {
        _id: { type: mongoose.Schema.Types.ObjectId },
        name: String,
        role: String
      },
      timestamp: { type: Date, default: Date.now },
      attachments: [String],
      isInternal: { type: Boolean, default: false }
    }],
    relatedTickets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SupportTicket' }],
    slaBreached: { type: Boolean, default: false },
    escalationLevel: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// Calculate response time when first message is added by support
SupportTicketSchema.pre('save', function(next) {
  if (this.messages && this.messages.length > 1 && !this.responseTime) {
    const firstSupportMessage = this.messages.find(m => m.sender.role !== 'customer');
    if (firstSupportMessage) {
      this.responseTime = (firstSupportMessage.timestamp - this.createdAt) / (1000 * 60 * 60);
      this.responseTimeHours = this.responseTime; // Backward compatibility
    }
  }
  
  // Normalize status for backward compatibility
  if (this.status === 'OPEN') this.status = 'open';
  if (this.status === 'IN_PROGRESS') this.status = 'in_progress';
  if (this.status === 'RESOLVED') this.status = 'resolved';
  
  // Check SLA breach (4 hour response time)
  if (!this.responseTime && (new Date() - this.createdAt) > 4 * 60 * 60 * 1000) {
    this.slaBreached = true;
  }
  
  next();
});

module.exports = mongoose.models.SupportTicket || mongoose.model('SupportTicket', SupportTicketSchema);

