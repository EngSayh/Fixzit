// src/types/mongoose-compat.ts
import mongoose, {
  type Model,
  type HydratedDocument,
  type Schema,
} from "mongoose";

/** Typed Model alias that fills Mongoose 8's generics once centrally. */
export type MModel<TDoc> = Model<
  TDoc, // TRawDocType
  Record<string, never>, // TQueryHelpers
  Record<string, never>, // TInstanceMethods
  Record<string, never>, // TVirtuals
  HydratedDocument<TDoc>, // THydratedDocumentType
  Schema<TDoc> // TSchema
>;

/** Common statics used throughout Fixzit. Extend per-model if you need more. */
export type CommonModelStatics<TDoc> = Pick<
  MModel<TDoc>,
  | "create"
  | "find"
  | "findById"
  | "findByIdAndUpdate"
  | "deleteMany"
  | "aggregate"
>;

/** Safe factory to avoid union-callable issues from `models.X || model(...)`. */
export function getModel<TDoc, TModel extends Model<TDoc> = MModel<TDoc>>(
  name: string,
  schema: Schema<TDoc>,
): TModel {
  return (
    (mongoose.models[name] as TModel) ||
    mongoose.model<TDoc, TModel>(name, schema)
  );
}
