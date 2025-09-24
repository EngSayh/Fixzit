import { Schema, model, models, InferSchemaType } from "mongoose";

const EmployeeSchema = new Schema({
  orgId: { type: String, required: true, index: true },
  personal: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, index: true },
    phone: String,
    dateOfBirth: Date,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'SA' }
    }
  },
  professional: {
    role: { type: String, required: true },
    department: String,
    title: String,
    manager: String, // Employee ID
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    salary: Number,
    status: { 
      type: String, 
      enum: ['active', 'inactive', 'terminated'], 
      default: 'active' 
    }
  },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], 
    default: 'ACTIVE' 
  },
  metadata: Schema.Types.Mixed
}, {
  timestamps: true
});

export type EmployeeDoc = InferSchemaType<typeof EmployeeSchema>;
export const Employee = models.Employee || model("Employee", EmployeeSchema);