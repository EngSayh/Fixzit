import { Schema, model, models, InferSchemaType } from "mongoose";
import { isMockDB } from "@/src/lib/mongo";

const OwnerStatementSchema = new Schema({
  tenantId: { type: String, index: true, required: true },
  ownerId: { type: String, index: true, required: true },
  propertyId: { type: String, index: true },
  period: { type: String, required: true },
  year: { type: Number, required: true },
  currency: { type: String, default: "SAR" },
  totals: {
    income: { type: Number, default: 0 },
    expenses: { type: Number, default: 0 },
    net: { type: Number, default: 0 }
  },
  lineItems: [{
    date: { type: Date, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ["INCOME","EXPENSE"], required: true },
    amount: { type: Number, required: true },
    reference: { type: String }
  }]
}, { timestamps: true });

OwnerStatementSchema.index({ tenantId: 1, ownerId: 1, period: 1, year: 1 });

export type OwnerStatementDoc = InferSchemaType<typeof OwnerStatementSchema>;

class MockOwnerStatementStore {
  private statements: any[] = [
    {
      tenantId: "demo-tenant",
      ownerId: "owner-001",
      propertyId: "property-100",
      period: "Q1",
      year: 2025,
      currency: "SAR",
      totals: { income: 28500, expenses: 7200, net: 21300 },
      lineItems: [
        { date: new Date("2025-01-08"), description: "Rent collected - Tower A/801", type: "INCOME", amount: 9500, reference: "INV-801-2025-01" },
        { date: new Date("2025-02-08"), description: "Rent collected - Tower A/801", type: "INCOME", amount: 9500, reference: "INV-801-2025-02" },
        { date: new Date("2025-03-08"), description: "Rent collected - Tower A/801", type: "INCOME", amount: 9500, reference: "INV-801-2025-03" },
        { date: new Date("2025-02-15"), description: "Maintenance - Plumbing leak", type: "EXPENSE", amount: 3200, reference: "WO-2025-145" },
        { date: new Date("2025-03-12"), description: "HVAC quarterly service", type: "EXPENSE", amount: 2000, reference: "WO-2025-166" },
        { date: new Date("2025-03-20"), description: "Cleaning services", type: "EXPENSE", amount: 2000, reference: "WO-2025-171" }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  async find(filter: Record<string, any>) {
    return this.statements.filter(statement => {
      if (filter.tenantId && statement.tenantId !== filter.tenantId) return false;
      if (filter.ownerId && statement.ownerId !== filter.ownerId) return false;
      if (filter.year && statement.year !== filter.year) return false;
      if (filter.period && statement.period !== filter.period) return false;
      return true;
    });
  }
}

export const OwnerStatement = isMockDB
  ? new MockOwnerStatementStore()
  : (models.OwnerStatement || model("OwnerStatement", OwnerStatementSchema));
