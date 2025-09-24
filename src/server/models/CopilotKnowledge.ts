import { Schema, model, models, InferSchemaType } from "mongoose";
import { isMockDB } from "@/src/lib/mongo";

const KnowledgeSchema = new Schema({
  tenantId: { type: String, index: true, default: null },
  roles: { type: [String], index: true, default: [] },
  locale: { type: String, index: true, default: "en" },
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  tags: { type: [String], default: [] },
  source: { type: String },
  content: { type: String, required: true },
  embedding: { type: [Number], default: [] },
  checksum: { type: String, index: true },
  createdBy: { type: String },
  updatedBy: { type: String }
}, {
  timestamps: true
});

KnowledgeSchema.index({ title: "text", content: "text", tags: "text" });
KnowledgeSchema.index({ tenantId: 1, locale: 1 });
KnowledgeSchema.index({ roles: 1 });

export type KnowledgeDoc = InferSchemaType<typeof KnowledgeSchema>;

class MockKnowledgeStore {
  private docs: KnowledgeDoc[] = [];

  async find(filter: Record<string, any>) {
    return this.docs.filter(doc => {
      if (filter.slug && doc.slug !== filter.slug) return false;
      if (filter.tenantId !== undefined && doc.tenantId !== filter.tenantId) return false;
      if (filter.locale && doc.locale !== filter.locale) return false;
      if (filter.roles) {
        const roles = filter.roles.$in as string[];
        if (roles?.length) {
          const docRoles = doc.roles || [];
          if (docRoles.length && !docRoles.some(role => roles.includes(role))) {
            return false;
          }
        }
      }
      return true;
    });
  }

  async findOne(filter: Record<string, any>) {
    return (await this.find(filter))[0] || null;
  }

  async findOneAndUpdate(filter: Record<string, any>, update: any, options: any) {
    const doc = await this.findOne(filter);
    if (!doc) {
      if (options?.upsert) {
        const toInsert = {
          ...(update.$set || {}),
          ...(update.$setOnInsert || {}),
          slug: filter.slug || update.$set?.slug
        } as KnowledgeDoc;
        this.docs.push(toInsert);
        return options.new ? toInsert : null;
      }
      return null;
    }

    Object.assign(doc, update.$set || {});
    return options.new ? doc : null;
  }

  async create(doc: KnowledgeDoc) {
    this.docs.push(doc);
    return doc;
  }
}

export const CopilotKnowledge = isMockDB
  ? new MockKnowledgeStore()
  : (models.CopilotKnowledge || model("CopilotKnowledge", KnowledgeSchema));
