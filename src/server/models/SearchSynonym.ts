// @ts-nocheck
import { Schema, model, models, InferSchemaType } from "mongoose";

const SearchSynonymSchema = new Schema({
  locale: { type: String, enum: ['en','ar'], required: true, index: true },
  term: { type: String, required: true },
  synonyms: [String]
}, { timestamps: true });

SearchSynonymSchema.index({ locale: 1, term: 1 }, { unique: true });

export type SearchSynonymDoc = InferSchemaType<typeof SearchSynonymSchema>;

export const SearchSynonym = (models.SearchSynonym || model("SearchSynonym", SearchSynonymSchema));


