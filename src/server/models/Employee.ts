import { Schema, model, models, InferSchemaType, Document } from 'mongoose';
import { MockModel } from '@/src/lib/mockDb';
import { isMockDB } from '@/src/lib/mongo';

const EmployeeSchema = new Schema({
  orgId: { type: String, required: true, index: true },
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

EmployeeSchema.index({ orgId: 1, 'personal.email': 1 }, { unique: true });

export type EmployeeDoc = InferSchemaType<typeof EmployeeSchema> & Document;

class EmployeeMockModel extends MockModel {
  constructor() {
    super('employees');
  }
}

export const Employee = isMockDB
  ? new EmployeeMockModel() as any
  : (models.Employee || model<EmployeeDoc>('Employee', EmployeeSchema));
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

EmployeeSchema.index({ orgId: 1, 'personal.email': 1 }, { unique: true });

export type EmployeeDoc = InferSchemaType<typeof EmployeeSchema> & Document;

class EmployeeMockModel extends MockModel {
  constructor() {
    super('employees');
  }
}

export const Employee = isMockDB
  ? new EmployeeMockModel() as any
  : (models.Employee || model<EmployeeDoc>('Employee', EmployeeSchema));
>>>>>>> origin/main
