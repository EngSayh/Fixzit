import { Schema, model, models, Types } from 'mongoose';

const ServiceContractSchema = new Schema(
  {
    property_id: { type: Types.ObjectId, ref: 'Property', required: true },
    tenant_id: { type: Types.ObjectId, ref: 'Tenant', required: true },
    contract_number: { type: String, required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date },
    status: { type: String, enum: ['active', 'expired', 'cancelled'], default: 'active' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default models.ServiceContract || model('ServiceContract', ServiceContractSchema);
