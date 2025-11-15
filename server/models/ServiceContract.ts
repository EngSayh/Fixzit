import { Schema, model, models, Types, Model, Document } from 'mongoose';
import { tenantIsolationPlugin } from '../plugins/tenantIsolation';
import { auditPlugin } from '../plugins/auditPlugin';

const ServiceContractSchema = new Schema({
  scope: { 
    type: String, 
    enum: ['Property', 'OwnerGroup'], // FIXED: Must match model names
    default: 'OwnerGroup' 
  },
  scopeRef: { 
    type: Schema.Types.ObjectId, // FIXED: Changed to ObjectId
    refPath: 'scope'
  },
  contractorType: { 
    type: String, 
    enum: ['FM_COMPANY', 'REAL_ESTATE_AGENT'] 
  },
  contractorRef: { 
    type: Schema.Types.ObjectId, // FIXED: Changed to ObjectId
    ref: 'Vendor'
  },
  startDate: Date,
  endDate: Date,
  terms: String,
  sla: String,
  status: { 
    type: String, 
    enum: ['draft', 'active', 'ended', 'cancelled'],
    default: 'active' 
  }
}, { timestamps: true });

// Apply plugins BEFORE indexes
ServiceContractSchema.plugin(tenantIsolationPlugin);
ServiceContractSchema.plugin(auditPlugin);

// Tenant-scoped indexes
ServiceContractSchema.index({ orgId: 1, status: 1 });
ServiceContractSchema.index({ orgId: 1, scope: 1, scopeRef: 1 });
ServiceContractSchema.index({ orgId: 1, contractorRef: 1 });
ServiceContractSchema.index({ orgId: 1, endDate: 1 });

// TypeScript-safe model export
interface IServiceContract extends Document {
  scope: 'Property' | 'OwnerGroup';
  scopeRef?: Schema.Types.ObjectId;
  contractorType?: 'FM_COMPANY' | 'REAL_ESTATE_AGENT';
  contractorRef?: Schema.Types.ObjectId;
  startDate?: Date;
  endDate?: Date;
  terms?: string;
  sla?: string;
  status: 'draft' | 'active' | 'ended' | 'cancelled';
  orgId: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
}

const ServiceContract = models.ServiceContract || model<IServiceContract>('ServiceContract', ServiceContractSchema);
export default ServiceContract;
