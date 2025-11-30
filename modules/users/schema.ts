import mongoose, { Schema, Document } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";
import { auditPlugin } from "@/server/plugins/auditPlugin";
import { Role } from "@/domain/fm/fm.behavior";

// Ensure tests use this schema even if another User model was registered earlier.
if (process.env.NODE_ENV === "test" && mongoose.models.User) {
  delete mongoose.models.User;
  delete (
    mongoose as typeof mongoose & { modelSchemas?: Record<string, unknown> }
  ).modelSchemas?.User;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  orgId: string; // Changed to string to match plugin type
  email: string;
  passwordHash: string;
  name: string;
  role: Role; // Using the Role enum from fm.behavior
  employeeId?: string;
  permissions: string[];
  isActive: boolean;
  emailVerifiedAt?: Date;
  lastLoginAt?: Date;
  createdBy: string; // Audit plugin adds these
  updatedBy?: string;
  version: number; // Audit plugin adds this
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    // orgId removed - will be added by tenantIsolationPlugin
    email: { type: String, required: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: Object.values(Role), // Use the Role enum values
      required: true,
    },
    employeeId: { type: String, trim: true, sparse: true },
    permissions: [{ type: String }],
    isActive: { type: Boolean, default: true },
    emailVerifiedAt: Date,
    lastLoginAt: Date,
    // createdBy, updatedBy, version removed - will be added by auditPlugin
  },
  {
    timestamps: true,
    collection: "users",
  },
);

// Apply plugins BEFORE indexes
UserSchema.plugin(tenantIsolationPlugin, {
  // Enforce tenant-scoped uniqueness even if indexes haven't built yet
  uniqueTenantFields: ["email", "employeeId"],
});
UserSchema.plugin(auditPlugin, {
  excludeFields: ["passwordHash", "__v", "updatedAt", "createdAt"],
  enableChangeHistory: true,
  maxHistoryVersions: 50,
});

// INDEXES (applied after plugins)
UserSchema.index({ orgId: 1, email: 1 }, { unique: true });
UserSchema.index({ orgId: 1, employeeId: 1 }, { unique: true, sparse: true });
UserSchema.index({ orgId: 1, role: 1, isActive: 1 }); // Tenant-scoped index

const UserModel = getModel<IUser>("User", UserSchema);

export { UserModel as User };
export default UserModel;
