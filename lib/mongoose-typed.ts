import { model, models, type Schema } from 'mongoose';
import type { MModel } from '@/src/types/mongoose-compat';

export function typedModel<T>(name: string, schema: Schema<T>, makeModel: typeof model = model): MModel<T> {
  const make = makeModel as unknown as <U>(_n: string, _s: Schema<U>) => MModel<U>;
  return (models[name] as MModel<T>) || make<T>(name, schema);
}

