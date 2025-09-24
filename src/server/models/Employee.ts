import { Schema, model, models, InferSchemaType } from "mongoose";
import { MockModel } from "@/src/lib/mockDb";
import { isMockDB } from "@/src/lib/mongo";

const EmployeeSchema = new Schema({
  orgId: { type: String, index: true, required: true },
  personal: {
    firstName: String,
    lastName: String,
    email: { type: String, index: true },
    phone: String,
  },
  professional: {
    role: { type: String, default: "EMPLOYEE" },
    department: String,
    title: String,
  },
  status: { type: String, enum: ["ACTIVE","INACTIVE","SUSPENDED"], default: "ACTIVE", index: true },
  metadata: Schema.Types.Mixed,
}, { timestamps: true });

export type EmployeeDoc = InferSchemaType<typeof EmployeeSchema>;

export const Employee = isMockDB
  ? new MockModel('employees') as any
  : (models.Employee || model("Employee", EmployeeSchema));