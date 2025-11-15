// src/types/mongoose-compat.ts
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import type {
  Model,
  HydratedDocument,
  Schema,
  FilterQuery,
  UpdateQuery,
  PipelineStage,
} from 'mongoose';

/** Typed Model alias that fills Mongoose 8's generics once centrally. */
export type MModel<TDoc> = Model<
  TDoc,                       // TRawDocType
  {},                         // TQueryHelpers
  {},                         // TInstanceMethods
  {},                         // TVirtuals
  HydratedDocument<TDoc>,     // THydratedDocumentType
  Schema<TDoc>                // TSchema
>;

/** Common statics used throughout Fixzit. Extend per-model if you need more. */
export type CommonModelStatics<TDoc> = {
  create(_doc: TDoc | TDoc[], _options?: any): Promise<any>;
  find(_filter?: FilterQuery<TDoc>, _proj?: any, _opts?: any): any;
  findById(_id: any, _proj?: any, _opts?: any): any;
  findByIdAndUpdate(_id: any, _update: UpdateQuery<TDoc>, _opts?: any): any;
  deleteMany(_filter?: FilterQuery<TDoc>): any;
  aggregate(_pipeline: PipelineStage[]): any;
};

/** Safe factory to avoid union-callable issues from `models.X || model(...)`. */
export function getModel<TDoc>(name: string, schema: Schema<TDoc>) {
  const { model, models } = require('mongoose') as typeof import('mongoose');
  return (models[name] as MModel<TDoc>) || model<TDoc>(name, schema);
}
