import { model, models, type Model, type Schema } from 'mongoose';

export function typedModel<T>(name: string, schema: Schema<T>, makeModel: typeof model = model): Model<T> {
  // eslint-disable-next-line no-unused-vars
  const make = makeModel as unknown as <U>(n: string, s: Schema<U>) => Model<U>;
  return (models[name] as Model<T>) || make<T>(name, schema);
}

