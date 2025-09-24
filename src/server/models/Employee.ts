import { Schema, model, models, InferSchemaType } from "mongoose";
import { isMockDB } from "@/src/lib/mongo";
import { MockModel } from "@/src/lib/mockDb";

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
  status: { type: String, default: 'ACTIVE', index: true },
  metadata: Schema.Types.Mixed
}, { timestamps: true });

EmployeeSchema.index({ orgId: 1, 'personal.email': 1 }, { unique: true });

export type EmployeeDoc = InferSchemaType<typeof EmployeeSchema>;

export const Employee: any = isMockDB
  ? new MockModel('employees')
  : (models.Employee || model("Employee", EmployeeSchema));

