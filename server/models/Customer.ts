import { Schema, model, models, Types } from 'mongoose';

const CustomerSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    type: { type: String, enum: ['ORG', 'OWNER'], required: true },
    tenant_id: { type: Types.ObjectId, ref: 'Tenant' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default models.Customer || model('Customer', CustomerSchema);
