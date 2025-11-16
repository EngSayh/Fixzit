import { Schema, InferSchemaType } from "mongoose";
import { auditPlugin } from "../plugins/auditPlugin";
import { getModel } from '@/src/types/mongoose-compat';

const SearchSynonymSchema = new Schema({
  locale: { type: String, enum: ['en','ar'], required: true },
  term: { type: String, required: true },
  synonyms: [String]
}, { timestamps: true });

// NOTE: SearchSynonym is global platform configuration (no tenantIsolationPlugin)
// Apply audit plugin to track who changes synonyms (affects search for all users)
SearchSynonymSchema.plugin(auditPlugin);

SearchSynonymSchema.index({ locale: 1, term: 1 }, { unique: true });

export type SearchSynonymDoc = InferSchemaType<typeof SearchSynonymSchema>;

export const SearchSynonym = getModel<SearchSynonymDoc>('SearchSynonym', SearchSynonymSchema);

