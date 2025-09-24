import { Schema, model, models, Document } from 'mongoose';

export interface IEmployee extends Document {
  orgId: string;
  userId?: string;
  code?: string;
  personal: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  professional: {
    role: string;
    department?: string;
    title?: string;
    managerId?: string;
  };
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>({
  orgId: { type: String, required: true, index: true },
  userId: { type: String, index: true },
  code: { type: String, index: true },
  personal: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String }
  },
  professional: {
    role: { type: String, required: true, index: true },
    department: { type: String },
    title: { type: String },
    managerId: { type: String }
  },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], default: 'ACTIVE', index: true },
  metadata: { type: Map, of: Schema.Types.Mixed }
}, { timestamps: true, collection: 'employees' });

EmployeeSchema.index({ orgId: 1, 'personal.email': 1 }, { unique: true });

export const Employee = models.Employee || model<IEmployee>('Employee', EmployeeSchema);


