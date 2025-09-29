import { Schema, model, models, Types } from 'mongoose';

const OwnerGroupSchema = new Schema({
  buildingId: { type: String, index: true }, // existing building _id/slug
  ownerIds: [String],                        // existing owner ids
  primaryContactUserId: String,              // واحد يستقبل الطلبات
  fmVendorId: String,                        // شركة إدارة مرافق مُعيّنة
  realEstateAgentId: String,                 // أو وكيل عقاري مُعيّن
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default models.OwnerGroup || model('OwnerGroup', OwnerGroupSchema);
