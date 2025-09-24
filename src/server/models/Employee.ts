import { Schema, model, models, InferSchemaType } from "mongoose";
import { MockModel } from "@/src/lib/mockDb";
import { isMockDB } from "@/src/lib/mongo";

const EmployeeSchema = new Schema({
  orgId: { type: String, required: true, index: true },
  personal: {
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

