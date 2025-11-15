import { model, models, type Model, type Schema } from 'mongoose';

export function typedModel<T>(name: string, schema: Schema<T>, makeModel: typeof model = model): Model<T, any, any, any, any, any, any> {
  // eslint-disable-next-line no-unused-vars
  const make = makeModel as unknown as <U>(n: string, s: Schema<U>) => Model<U, any, any, any, any, any, any>;
  return (models[name] as Model<T, any, any, any, any, any, any>) || make<T>(name, schema);
}

