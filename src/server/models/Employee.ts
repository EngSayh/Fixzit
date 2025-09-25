// @ts-nocheck
import { Schema, model, models } from 'mongoose';

const EmployeeSchema = new Schema({
  orgId: { type: String, index: true },
  personal: {
    firstName: String,
    lastName: String,
    email: { type: String, index: true },
    phone: String
  },
  professional: {
    role: String,
    department: String,
    title: String
  },
  status: { type: String, default: 'ACTIVE' },
  metadata: Schema.Types.Mixed
}, { timestamps: true });

export const Employee = models.Employee || model('Employee', EmployeeSchema);

