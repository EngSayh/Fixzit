// Missing OwnerGroup model file
import { Schema, model, models, Document } from 'mongoose';

export interface IOwnerGroup extends Document {
  _id: string;
  name: string;
  organizationId: string;
  primaryOwnerId?: string;
  members: string[];
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

const OwnerGroupSchema = new Schema<IOwnerGroup>({
  name: { type: String, required: true },
  organizationId: { type: String, required: true },
  primaryOwnerId: { type: String },
  members: [{ type: String }],
  tenantId: { type: String, required: true }
}, {
  timestamps: true
});

OwnerGroupSchema.index({ organizationId: 1, tenantId: 1 });
OwnerGroupSchema.index({ primaryOwnerId: 1 });

const OwnerGroup = models.OwnerGroup || model<IOwnerGroup>('OwnerGroup', OwnerGroupSchema);

export default OwnerGroup;