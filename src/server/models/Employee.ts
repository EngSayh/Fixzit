import { Schema, InferSchemaType, type Model } from 'mongoose';
import { typedModel } from '@/src/lib/mongoose-typed';

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
export type EmployeeModel = Model<EmployeeDoc>;

export const Employee = typedModel<EmployeeDoc>('Employee', EmployeeSchema) as EmployeeModel;