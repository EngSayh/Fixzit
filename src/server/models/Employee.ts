import mongoose, { Document, Schema } from 'mongoose';

export interface IEmployee extends Document {
  _id: string;
  employeeId: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  manager?: string;
  startDate: Date;
  endDate?: Date;
  status: 'Active' | 'Inactive' | 'On Leave' | 'Terminated';
  salary: {
    amount: number;
    currency: string;
    period: 'hourly' | 'monthly' | 'annually';
  };
  benefits: string[];
  skills: string[];
  performance: Array<{
    period: string;
    rating: number;
    feedback: string;
    reviewedBy: string;
    reviewDate: Date;
  }>;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  documents: Array<{
    type: string;
    url: string;
    uploadedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    employeeId: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    department: { type: String, required: true, trim: true },
    position: { type: String, required: true, trim: true },
    manager: { type: String, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: { 
      type: String, 
      enum: ['Active', 'Inactive', 'On Leave', 'Terminated'], 
      default: 'Active' 
    },
    salary: {
      amount: { type: Number, required: true, min: 0 },
      currency: { type: String, required: true, default: 'SAR' },
      period: { 
        type: String, 
        enum: ['hourly', 'monthly', 'annually'],
        required: true,
        default: 'monthly'
      }
    },
    benefits: [{ type: String, trim: true }],
    skills: [{ type: String, trim: true }],
    performance: [{
      period: { type: String, required: true, trim: true },
      rating: { type: Number, required: true, min: 1, max: 5 },
      feedback: { type: String, trim: true },
      reviewedBy: { type: String, required: true, trim: true },
      reviewDate: { type: Date, required: true }
    }],
    emergencyContact: {
      name: { type: String, trim: true },
      relationship: { type: String, trim: true },
      phone: { type: String, trim: true }
    },
    documents: [{
      type: { type: String, required: true, trim: true },
      url: { type: String, required: true, trim: true },
      uploadedAt: { type: Date, default: Date.now }
    }]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Add indexes for performance
EmployeeSchema.index({ employeeId: 1 });
EmployeeSchema.index({ email: 1 });
EmployeeSchema.index({ department: 1 });
EmployeeSchema.index({ status: 1 });
EmployeeSchema.index({ manager: 1 });

export const Employee = mongoose.models.Employee || mongoose.model<IEmployee>('Employee', EmployeeSchema);