// @ts-nocheck
import { Schema, model, models, InferSchemaType } from "mongoose";
import { MockModel } from "@/src/lib/mockDb";

const SearchSynonymSchema = new Schema({
  locale: { type: String, enum: ['en','ar'], required: true, index: true },
  term: { type: String, required: true },
  synonyms: [String]
}, { timestamps: true });

SearchSynonymSchema.index({ locale: 1, term: 1 }, { unique: true });

export type SearchSynonymDoc = InferSchemaType<typeof SearchSynonymSchema>;

const isMockDB = process.env.NODE_ENV === 'development' && (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('localhost'));

export const SearchSynonym = isMockDB
  ? new MockModel('searchsynonyms') as any
  : (models.SearchSynonym || model("SearchSynonym", SearchSynonymSchema));

