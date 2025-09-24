import { Schema, model, models, InferSchemaType } from "mongoose";
import { isMockDB } from "@/src/lib/mongo";

const Status = ["DRAFT","SUBMITTED","DISPATCHED","IN_PROGRESS","ON_HOLD","COMPLETED","VERIFIED","CLOSED","CANCELLED"] as const;
const Priority = ["LOW","MEDIUM","HIGH","URGENT"] as const;

// Mock data store for development - singleton to persist data
class MockWorkOrderStore {
  private workOrders: any[] = [];
  private nextId = 1;
  private static instance: MockWorkOrderStore;

  constructor() {
    if (MockWorkOrderStore.instance) {
      return MockWorkOrderStore.instance;
    }
    MockWorkOrderStore.instance = this;

    // Initialize with some sample data only once
    if (this.workOrders.length === 0) {
      this.workOrders = [
        {
          _id: "1",
          tenantId: "t-001",
          code: "WO-2025-001",
          title: "AC not cooling in Tower A",
          description: "Air conditioning system in Tower A unit 1204 is not working properly",
          priority: "HIGH",
          status: "SUBMITTED",
          statusHistory: [],
          createdBy: "u-admin-1",
          createdAt: new Date("2025-01-20T10:00:00Z"),
          updatedAt: new Date("2025-01-20T10:00:00Z")
        },
        {
          _id: "2",
          tenantId: "t-001",
          code: "WO-2025-002",
          title: "Water leak in ceiling",
          description: "Water leak from ceiling in Villa 9 main bathroom",
          priority: "URGENT",
          status: "DISPATCHED",
          statusHistory: [{ from: "SUBMITTED", to: "DISPATCHED", byUserId: "u-admin-1", at: new Date("2025-01-19T14:30:00Z") }],
          createdBy: "u-admin-1",
          assigneeUserId: "tech-007",
          createdAt: new Date("2025-01-19T14:30:00Z"),
          updatedAt: new Date("2025-01-19T14:30:00Z")
        }
      ];
      this.nextId = 3;
    }
  }

  async countDocuments(filter?: any) {
    let results = [...this.workOrders];

    if (filter?.tenantId) {
      results = results.filter(wo => wo.tenantId === filter.tenantId);
    }
    if (filter?.status) {
      results = results.filter(wo => wo.status === filter.status);
    }
    if (filter?.$text) {
      const search = filter.$text.$search.toLowerCase();
      results = results.filter(wo =>
        wo.title.toLowerCase().includes(search) ||
        wo.description?.toLowerCase().includes(search)
      );
    }

    return results.length;
  }


  async findOne(filter: any) {
    return this.workOrders.find(wo =>
      Object.entries(filter).every(([key, value]) => wo[key] === value)
    ) || null;
  }

  async update(filter: any, update: any) {
    const index = this.workOrders.findIndex(wo => wo._id === filter._id && wo.tenantId === filter.tenantId);
    if (index === -1) return { acknowledged: false, modifiedCount: 0 };

    // Handle direct property assignment
    if (update.assigneeUserId !== undefined) {
      this.workOrders[index].assigneeUserId = update.assigneeUserId;
    }
    if (update.assigneeVendorId !== undefined) {
      this.workOrders[index].assigneeVendorId = update.assigneeVendorId;
    }
    if (update.status) {
      if (this.workOrders[index].status === "SUBMITTED" && update.status === "DISPATCHED") {
        this.workOrders[index].statusHistory.push({
          from: this.workOrders[index].status,
          to: "DISPATCHED",
          byUserId: "u-admin-1", // This would come from the user context
          at: new Date()
        });
      }
      this.workOrders[index].status = update.status;
    }

    this.workOrders[index].updatedAt = new Date();
    return { acknowledged: true, modifiedCount: 1 };
  }

  private findOneAndUpdateSync(filter: any, update: any, options: any = {}) {
    const index = this.workOrders.findIndex(wo => wo._id === filter._id && wo.tenantId === filter.tenantId);
    if (index === -1) return null;

    const updated = { ...this.workOrders[index], ...update.$set, updatedAt: new Date() };
    this.workOrders[index] = updated;

    return options.new ? updated : this.workOrders[index];
  }

  updateOne(filter: any, update: any) {
    const index = this.workOrders.findIndex(wo => wo._id === filter._id && wo.tenantId === filter.tenantId);
    if (index === -1) return { acknowledged: false, modifiedCount: 0 };

    this.workOrders[index] = { ...this.workOrders[index], ...update.$set, updatedAt: new Date() };
    return { acknowledged: true, modifiedCount: 1 };
  }





  async find(filter?: any) {
    let results = [...this.workOrders];

    if (filter?._id) {
      results = results.filter(wo => wo._id === filter._id);
    }
    if (filter?.tenantId) {
      results = results.filter(wo => wo.tenantId === filter.tenantId);
    }
    if (filter?.status) {
      results = results.filter(wo => wo.status === filter.status);
    }
    if (filter?.priority) {
      results = results.filter(wo => wo.priority === filter.priority);
    }
    if (filter?.$text) {
      const search = filter.$text.$search.toLowerCase();
      results = results.filter(wo =>
        wo.title.toLowerCase().includes(search) ||
        wo.description?.toLowerCase().includes(search)
      );
    }

    return Promise.resolve(results);
  }


  async findOneAndUpdate(filter: any, update: any, options: any = {}) {
    const index = this.workOrders.findIndex(wo => wo._id === filter._id && wo.tenantId === filter.tenantId);
    if (index === -1) return null;

    const updated = { ...this.workOrders[index], ...update.$set, updatedAt: new Date() };
    this.workOrders[index] = updated;

    return options.new ? updated : this.workOrders[index];
  }

  async create(data: any) {
    const newWo = {
      _id: this.nextId.toString(),
      statusHistory: [],
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.workOrders.push(newWo);
    this.nextId++;
    return Promise.resolve(newWo);
  }


}

const StatusHistory = new Schema({
  from: { type: String },
  to: { type: String, enum: Status },
  byUserId: { type: String, required: true },
  at: { type: Date, default: Date.now },
  note: { type: String }
}, {_id:false});


const ChecklistItem = new Schema({
  label: { type: String, required: true },
  done: { type: Boolean, default: false }
}, {_id:false});

const Checklist = new Schema({
  title: { type: String, required: true },
  items: { type: [ChecklistItem], default: [] }
}, {_id:false});

const Comment = new Schema({
  byUserId: { type: String, required: true },
  text: { type: String, required: true },
  at: { type: Date, default: Date.now }
}, {_id:false});

const Material = new Schema({
  sku: String,
  name: String,
  qty: { type: Number, default: 1 },
  unitPrice: { type: Number, default: 0 },
  currency: { type: String, default: "SAR" }
}, {_id:false});

const Finance = new Schema({
  labor: { type: Number, default: 0 },
  materials: { type: Number, default: 0 },
  other: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  currency: { type: String, default: "SAR" },
  invoiceId: String,
  poId: String,
}, {_id:false});

const WorkOrderSchema = new Schema({
  tenantId: { type: String, index: true, required: true },
  code: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  description: String,
  category: String,
  subcategory: String,
  priority: { type: String, enum: Priority, default: "MEDIUM", index: true },
  slaMinutes: { type: Number, default: 0 },
  dueAt: { type: Date },

  propertyId: { type: String, index: true },
  unitId: { type: String },

  requester: {
    type: { type: String, enum: ["TENANT","OWNER","STAFF"], default: "TENANT" },
    id: String,
    name: String,
    phone: String,
    email: String
  },

  assigneeUserId: { type: String, index: true },
  assigneeVendorId: { type: String, index: true },

  status: { type: String, enum: Status, default: "SUBMITTED", index: true },
  statusHistory: { type: [StatusHistory], default: [] },

  checklists: { type: [Checklist], default: [] },
  materials: { type: [Material], default: [] },
  comments: { type: [Comment], default: [] },

  attachments: { type: [ { url:String, name:String, type:String, size:Number } ], default: [] },

  billable: { type: Boolean, default: false },
  costSummary: { type: Finance, default: () => ({}) },
  financeRefs: {
    invoiceId: String,
    poId: String
  },

  ratings: {
    score: { type: Number, min: 1, max: 5 },
    note: String,
    byUserId: String,
    at: Date
  },

  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date }
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

WorkOrderSchema.index({ tenantId: 1, code: 1 }, { unique: true });
WorkOrderSchema.index({ title: "text", description: "text" });
// Extra text fields can improve recall: category and requester.name
WorkOrderSchema.index({ category: 'text', 'requester.name': 'text' });

export type WorkOrderDoc = InferSchemaType<typeof WorkOrderSchema>;

// Use mock store in development when MongoDB is not available
export const WorkOrder = isMockDB
  ? new MockWorkOrderStore()
  : (models.WorkOrder || model("WorkOrder", WorkOrderSchema));
