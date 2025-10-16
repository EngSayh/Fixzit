import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: 'super_admin' | 'corporate_admin' | 'management' | 'finance' | 'hr' | 'employee' | 'property_owner' | 'technician' | 'tenant' | 'vendor' | 'guest';
  employeeId?: string;
  permissions: string[];
  isActive: boolean;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  name: { type: String, required: true, trim: true },
  role: {
    type: String,
    enum: ['super_admin', 'corporate_admin', 'management', 'finance', 'hr', 'employee', 'property_owner', 'technician', 'tenant', 'vendor', 'guest'],
    required: true
  },
  employeeId: { type: String, trim: true, sparse: true },
  permissions: [{ type: String }],
  isActive: { type: Boolean, default: true },
  emailVerifiedAt: Date,
  lastLoginAt: Date,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  collection: 'users'
});

UserSchema.index({ orgId: 1, email: 1 }, { unique: true });
UserSchema.index({ orgId: 1, employeeId: 1 }, { unique: true, sparse: true });
UserSchema.index({ role: 1, isActive: 1 });

const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export { UserModel as User };
export default UserModel;
