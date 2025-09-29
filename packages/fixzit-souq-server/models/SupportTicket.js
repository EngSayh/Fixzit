const mongoose = require('mongoose');

const SupportTicketSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'], default: 'OPEN' },
    responseTimeHours: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.models.SupportTicket || mongoose.model('SupportTicket', SupportTicketSchema);

