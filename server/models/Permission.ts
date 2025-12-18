import { Schema, InferSchemaType, model, models } from "mongoose";
import { getModel, MModel } from "@/types/mongoose-compat";

/**
 * Permission Model
 *
 * Represents an atomic permission in the system.
 * Format: "module:action" (e.g., "finance:invoice.read")
 *
 * Examples:
 * - workorders:create
 * - finance:invoice.read
 * - hr:employee.update
 * - admin:settings.write
 */
const PermissionSchema = new Schema(
  {
    key: {
      type: String,
      unique: true, // unique implies index, no separate index needed
      required: true,
      trim: true,
      // Format: module:action (e.g., "workorders:create")
      match: /^[a-z][a-z0-9_]*:[a-z][a-z0-9_.]*$/i,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    module: {
      type: String,
      // index via compound { module: 1, action: 1 }
      required: true,
      trim: true,
      lowercase: true,
      // Examples: workorders, finance, hr, admin
    },
    action: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      // Examples: create, read, update, delete, invoice.read, employee.update
    },
  },
  {
    timestamps: true,
    collection: "permissions",
  },
);

// Indexes for efficient querying
PermissionSchema.index({ module: 1, action: 1 });
// Note: { key: 1 } index is already created by `unique: true` on the key field

// Pre-save hook to extract module and action from key
PermissionSchema.pre("save", function (next) {
  if (this.isModified("key")) {
    const [module, action] = this.key.split(":");
    if (module && action) {
      this.module = module;
      this.action = action;
    }
  }
  next();
});

// Instance methods
PermissionSchema.methods.toSafeObject = function () {
  return {
    id: this._id.toString(),
    key: this.key,
    description: this.description,
    module: this.module,
    action: this.action,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export type Permission = InferSchemaType<typeof PermissionSchema>;

const PermissionModel = getModel<Permission>("Permission", PermissionSchema);
export default PermissionModel;
