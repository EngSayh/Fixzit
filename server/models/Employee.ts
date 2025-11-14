import { Schema, model, models, InferSchemaType, Document } from 'mongoose';
import { tenantIsolationPlugin } from '../plugins/tenantIsolation';
import { auditPlugin } from '../plugins/auditPlugin';

const EmployeeSchema = new Schema({
  personal: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String }
  },
  professional: {
    role: { type: String, default: 'EMPLOYEE' },
    department: { type: String },
    title: { type: String },
    startDate: { type: Date }
  },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'ONBOARDING'], default: 'ACTIVE' },
  metadata: { type: Schema.Types.Mixed, default: {} }
}, { timestamps: true });

// Apply plugins BEFORE indexes
EmployeeSchema.plugin(tenantIsolationPlugin);
EmployeeSchema.plugin(auditPlugin);

// Tenant-scoped index
EmployeeSchema.index({ orgId: 1, 'personal.email': 1 }, { unique: true });

export type EmployeeDoc = InferSchemaType<typeof EmployeeSchema> & Document;

export const Employee = (typeof models !== 'undefined' && models.Employee) || model<EmployeeDoc>('Employee', EmployeeSchema);
