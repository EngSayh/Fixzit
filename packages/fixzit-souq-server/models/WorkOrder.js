const mongoose = require('mongoose');

const WorkOrderSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
    status: { type: String, enum: ['NEW', 'IN_PROGRESS', 'COMPLETED'], default: 'NEW' },
    property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    assignedTo: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.models.WorkOrder || mongoose.model('WorkOrder', WorkOrderSchema);

