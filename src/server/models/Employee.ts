<<<<<<< HEAD
import { Schema, model, models, InferSchemaType } from "mongoose";
import { MockModel } from "@/src/lib/mockDb";
import { isMockDB } from "@/src/lib/mongo";
=======
import { Schema, model, models, InferSchemaType, Document } from 'mongoose';
import { MockModel } from '@/src/lib/mockDb';
>>>>>>> origin/main

const EmployeeSchema = new Schema({
  orgId: { type: String, required: true, index: true },
  personal: {
<<<<<<< HEAD
    firstName: String,
    lastName: String,
    email: { type: String, index: true },
    phone: String
  },
  professional: {
    role: { type: String, default: 'EMPLOYEE' },
    department: String,
    title: String
  },
  status: { type: String, enum: ['ACTIVE','INACTIVE'], default: 'ACTIVE' },
  metadata: Schema.Types.Mixed
}, { timestamps: true });

EmployeeSchema.index({ orgId: 1, 'personal.email': 1 }, { unique: true, partialFilterExpression: { 'personal.email': { $type: 'string' } } });

export type EmployeeDoc = InferSchemaType<typeof EmployeeSchema>;

export const Employee = isMockDB
  ? new MockModel('employees') as any
  : (models.Employee || model("Employee", EmployeeSchema));

=======
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

const isMockDB = String(process.env.USE_MOCK_DB || '').toLowerCase() === 'true';

class EmployeeMockModel extends MockModel {
  constructor() {
    super('employees');
  }
}

export const Employee = isMockDB
  ? new EmployeeMockModel() as any
  : (models.Employee || model<EmployeeDoc>('Employee', EmployeeSchema));
>>>>>>> origin/main
