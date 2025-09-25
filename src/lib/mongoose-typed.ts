import { model, models, type Model, type Schema } from 'mongoose';

export function typedModel<T>(name: string, schema: Schema<T>, m?: typeof model<T>): Model<T> {
  const make = (m || model) as unknown as <U>(n: string, s: Schema<U>) => Model<U>;
  return (models[name] as Model<T>) || make<T>(name, schema);
}

