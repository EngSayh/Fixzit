import mongoose, { Schema, model, models, Model } from 'mongoose';

// KSA-specific compliance documents (Iqama, Passport, Contract)
interface IComplianceDocument {
  type: 'IQAMA' | 'PASSPORT' | 'CONTRACT' | 'VISA' | 'OTHER';
  number?: string;
  issueDate?: Date;
  expiryDate: Date;
  fileUrl?: string;
  notes?: string;
}

// Bank details for WPS (Wage Protection System) compliance
interface IBankDetails {
  bankName: string;
  iban: string; // IBAN format validation required
  accountNumber?: string;
}

// Compensation structure aligned with KSA labor law
interface ICompensation {
  baseSalary: number; // Monthly basic salary in SAR
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: { name: string; amount: number }[];
  currency: string; // Default: SAR
  gosiApplicable: boolean; // True for Saudi nationals
  sanedApplicable: boolean; // Unemployment insurance
}

// Employment details
interface IEmployment {
  jobTitle: string;
  department: string;
  managerId?: mongoose.Types.ObjectId;
  site?: string; // For FM: property/site assignment
  joinDate: Date;
  contractType: 'PERMANENT' | 'FIXED_TERM' | 'CONTRACT';
  contractEndDate?: Date;
  probationEndDate?: Date;
  qiwaContractId?: string; // Qiwa digital contract reference
}

export interface IEmployee extends mongoose.Document {
  orgId: mongoose.Types.ObjectId; // Multi-tenant isolation
  employeeCode: string; // Unique within org (e.g., EMP-001)
  firstName: string;
  lastName: string;
  firstNameAr?: string; // Arabic name
  lastNameAr?: string;
  email: string;
  phone: string;
  nationality: string;
  status: 'ONBOARDING' | 'ACTIVE' | 'ON_LEAVE' | 'SUSPENDED' | 'TERMINATED';
  employment: IEmployment;
  compensation: ICompensation;
  bank: IBankDetails;
  documents: IComplianceDocument[];
  assets: { assetTag: string; name: string; assignedAt: Date; returnedAt?: Date }[];
  skills: string[]; // For FM technician dispatch
  certifications: { name: string; issueDate: Date; expiryDate?: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

const ComplianceDocumentSchema = new Schema<IComplianceDocument>({
  type: { type: String, enum: ['IQAMA', 'PASSPORT', 'CONTRACT', 'VISA', 'OTHER'], required: true },
  number: String,
  issueDate: Date,
  expiryDate: { type: Date, required: true }, // Index defined at schema level (line 138)
  fileUrl: String,
  notes: String,
}, { _id: false });

const BankDetailsSchema = new Schema<IBankDetails>({
  bankName: { type: String, required: true },
  iban: { type: String, required: true, validate: /^SA[0-9]{22}$/ }, // Saudi IBAN format
  accountNumber: String,
}, { _id: false });

const CompensationSchema = new Schema<ICompensation>({
  baseSalary: { type: Number, required: true, min: 0 },
  housingAllowance: { type: Number, default: 0 },
  transportAllowance: { type: Number, default: 0 },
  otherAllowances: [{ name: String, amount: Number }],
  currency: { type: String, default: 'SAR' },
  gosiApplicable: { type: Boolean, default: false },
  sanedApplicable: { type: Boolean, default: false },
}, { _id: false });

const EmploymentSchema = new Schema<IEmployment>({
  jobTitle: { type: String, required: true },
  department: String,
  managerId: { type: Schema.Types.ObjectId, ref: 'Employee' },
  site: String,
  joinDate: { type: Date, required: true },
  contractType: { type: String, enum: ['PERMANENT', 'FIXED_TERM', 'CONTRACT'], required: true },
  contractEndDate: Date,
  probationEndDate: Date,
  qiwaContractId: String,
}, { _id: false });

const EmployeeSchema = new Schema<IEmployee>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    employeeCode: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    firstNameAr: String,
    lastNameAr: String,
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    nationality: { type: String, required: true },
    status: { 
      type: String, 
      enum: ['ONBOARDING', 'ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED'], 
      default: 'ONBOARDING',
      index: true 
    },
    employment: { type: EmploymentSchema, required: true },
    compensation: { type: CompensationSchema, required: true },
    bank: BankDetailsSchema,
    documents: [ComplianceDocumentSchema],
    assets: [{ assetTag: String, name: String, assignedAt: Date, returnedAt: Date }],
    skills: [String],
    certifications: [{ name: String, issueDate: Date, expiryDate: Date }],
  },
  {
    timestamps: true,
    collection: 'hr_employees',
  }
);

// Compound unique index for employeeCode within org
EmployeeSchema.index({ orgId: 1, employeeCode: 1 }, { unique: true });
EmployeeSchema.index({ orgId: 1, email: 1 });
EmployeeSchema.index({ orgId: 1, status: 1 });
EmployeeSchema.index({ 'documents.expiryDate': 1 }); // For compliance alerts

export const Employee: Model<IEmployee> = models.Employee || model<IEmployee>('Employee', EmployeeSchema);
