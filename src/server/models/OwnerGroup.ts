import { Schema, model, models, Types } from 'mongoose';

const OwnerGroupSchema = new Schema(
  {
    name: { type: String, required: true },
    primary_contact_user_id: { type: Types.ObjectId, ref: 'User' },
    member_user_ids: [{ 
      type: Types.ObjectId, 
      ref: 'User' 
    }],
    fm_provider_org_id: { type: Types.ObjectId, ref: 'Tenant' },
    agent_org_id: { type: Types.ObjectId, ref: 'Tenant' },
    property_ids: [{ 
      type: Types.ObjectId, 
      ref: 'Property' 
    }],
    // Tenant isolation - primary organization
    orgId: { 
      type: Types.ObjectId, 
      ref: 'Organization',
      required: true,
    },
  },
  { timestamps: true }
);

export default models.OwnerGroup || model('OwnerGroup', OwnerGroupSchema);

