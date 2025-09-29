const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, trim: true },
    name: { type: String, required: true, trim: true },
    department: { type: String, trim: true },
    status: { type: String, enum: ['Active', 'Inactive', 'On Leave'], default: 'Active' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.LegacyEmployee || mongoose.model('LegacyEmployee', EmployeeSchema);

