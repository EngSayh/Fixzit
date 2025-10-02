import { Schema, model, models, InferSchemaType } from "mongoose";

const Message = new Schema({
  byUserId: { type: String }, // null when guest
  byRole: { type: String },   // ADMIN|USER|GUEST
  at: { type: Date, default: Date.now },
  text: { type: String, required: true },
  attachments: { type: [ { url:String, name:String, size:Number, type:String } ], default: [] }
}, { _id: false });

const SupportTicketSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  code: { type: String, required: true, index: true },
  subject: { type: String, required: true },
  module: { type: String, enum: ["FM","Souq","Aqar","Account","Billing","Other"], default: "Other", index: true },
  type:   { type: String, enum: ["Bug","Feature","Complaint","Billing","Access","Other"], default: "Other", index: true },
  priority: { type: String, enum: ["Low","Medium","High","Urgent"], default: "Medium", index: true },
  category: { type: String, enum: ["Technical","Feature Request","Billing","Account","General","Bug Report"], default: "General", index: true },
  subCategory: { type: String, enum: ["Bug Report","Performance Issue","UI Error","API Error","Database Error","New Feature","Enhancement","Integration","Customization","Mobile App","Invoice Issue","Payment Error","Subscription","Refund","Pricing","Login Issue","Password Reset","Profile Update","Permissions","Access Denied","Documentation","Training","Support","Feedback","Other","Critical Bug","Minor Bug","Cosmetic Issue","Data Error","Security Issue"], default: "Other", index: true },
  status: { type: String, enum: ["New","Open","Waiting","Resolved","Closed"], default: "New", index: true },
  createdByUserId: { type: String },
  requester: { name:String, email:String, phone:String },
  messages: { type: [Message], default: [] },
  assigneeUserId: { type: String },
  firstResponseAt: { type: Date },
  resolvedAt: { type: Date }
}, { timestamps: true });

// Ensure code uniqueness is scoped to tenant
SupportTicketSchema.index({ tenantId: 1, code: 1 }, { unique: true });

SupportTicketSchema.index({ status:1, module:1, priority:1 });
SupportTicketSchema.index({ createdByUserId:1 });

export type SupportTicketDoc = InferSchemaType<typeof SupportTicketSchema>;

// Check if we're using mock database
export const SupportTicket = models.SupportTicket || model("SupportTicket", SupportTicketSchema);

