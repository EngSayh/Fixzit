import { Schema, model, models, InferSchemaType } from 'mongoose';

const EmployeeSchema = new Schema({
  orgId: { type: String, index: true, required: true },
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
  status: { type: String, enum: ['ACTIVE','INACTIVE'], default: 'ACTIVE' },
  metadata: Schema.Types.Mixed
}, { timestamps: true });

export type EmployeeDoc = InferSchemaType<typeof EmployeeSchema>;

export const Employee = (models.Employee || model('Employee', EmployeeSchema)) as any;