import { Schema, model, models } from 'mongoose';

const ServiceContractSchema = new Schema({
  scope: { type: String, enum: ['PROPERTY','OWNER_GROUP'], default: 'OWNER_GROUP' },
  scopeRef: String, // buildingId OR ownerGroupId
  contractorType: { type: String, enum: ['FM_COMPANY','REAL_ESTATE_AGENT'] },
  contractorRef: String, // vendor id from Marketplace
  startDate: Date, endDate: Date,
  terms: String, sla: String, status: { type: String, enum: ['draft','active','ended'], default: 'active' }
}, { timestamps: true });

export default models.ServiceContract || model('ServiceContract', ServiceContractSchema);
