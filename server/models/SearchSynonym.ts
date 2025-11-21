import { Schema, InferSchemaType } from "mongoose";
import { auditPlugin } from "../plugins/auditPlugin";
import { getModel } from '@/src/types/mongoose-compat';

const SearchSynonymSchemaDef = {
  locale: { type: String, enum: ['en','ar'], required: true },
  term: { type: String, required: true },
  synonyms: [String]
} as const;

export const SearchSynonymSchema = new Schema(SearchSynonymSchemaDef, { timestamps: true });
// Expose raw definition for environments that mock mongoose schema internals
(SearchSynonymSchema as any).obj = (SearchSynonymSchema as any).obj || SearchSynonymSchemaDef;

// NOTE: SearchSynonym is global platform configuration (no tenantIsolationPlugin)
// Apply audit plugin to track who changes synonyms (affects search for all users)
SearchSynonymSchema.plugin(auditPlugin);

SearchSynonymSchema.index({ locale: 1, term: 1 }, { unique: true });

export type SearchSynonymDoc = InferSchemaType<typeof SearchSynonymSchema>;

export const SearchSynonym = getModel<SearchSynonymDoc>('SearchSynonym', SearchSynonymSchema);

export default SearchSynonym;
