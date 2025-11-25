import { Schema, InferSchemaType, model, models, Types } from "mongoose";
import { getModel, MModel } from "@/src/types/mongoose-compat";

/**
 * Role Model
 *
 * Represents a set of permissions that can be assigned to users.
 *
 * Special Properties:
 * - wildcard: If true, grants ALL permissions (used for Super Admin)
 * - systemReserved: If true, prevents deletion/modification via UI
 *
 * Examples:
 * - Super Admin: wildcard=true, systemReserved=true
 * - Property Owner: specific permissions for property management
 * - Finance Manager: specific permissions for finance module
 * - Vendor: specific permissions for work orders and invoices
 */
const RoleSchema = new Schema(
  {
    name: {
      type: String,
      unique: true,
      index: true,
      required: true,
      trim: true,
      // Examples: "Super Admin", "Property Owner", "Finance Manager"
    },
    slug: {
      type: String,
      unique: true,
      index: true,
      required: true,
      trim: true,
      lowercase: true,
      // Examples: "super_admin", "property_owner", "finance_manager"
      match: /^[a-z][a-z0-9_]*$/,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    // Wildcard means ALL permissions (Super Admin only)
    // Guards still check server-side for defense-in-depth
    wildcard: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Reference to Permission documents
    permissions: [
      {
        type: Types.ObjectId,
        ref: "Permission",
      },
    ],
    // Protects role from deletion/rename via UI
    systemReserved: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Optional: role hierarchy level (higher = more permissions)
    level: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "roles",
  },
);

// Indexes
RoleSchema.index({ slug: 1 }, { unique: true });
RoleSchema.index({ wildcard: 1 });
RoleSchema.index({ systemReserved: 1 });
RoleSchema.index({ level: -1 });

// Pre-save hook to generate slug from name if not provided
RoleSchema.pre("save", function (next) {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }
  next();
});

// Instance methods
RoleSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    slug: this.slug,
    description: this.description,
    wildcard: this.wildcard,
    systemReserved: this.systemReserved,
    level: this.level,
    permissionCount: this.permissions?.length || 0,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// Static methods
RoleSchema.statics.findBySlug = function (slug: string) {
  return this.findOne({ slug });
};

RoleSchema.statics.findSuperAdminRole = function () {
  return this.findOne({ slug: "super_admin", wildcard: true });
};

// Virtual to check if role is Super Admin
RoleSchema.virtual("isSuperAdmin").get(function () {
  return this.slug === "super_admin" || this.wildcard === true;
});

export type Role = InferSchemaType<typeof RoleSchema>;

const RoleModel = getModel<Role>("Role", RoleSchema);
export default RoleModel;
