/* eslint-disable @typescript-eslint/no-explicit-any */
import { Schema, Types } from 'mongoose';

function isPOJO(x: any) { return x && Object.prototype.toString.call(x) === '[object Object]'; }
function coerceIdsDeep(x: any): any {
  if (x == null) return x;
  if (x instanceof Types.ObjectId) return x.toString();
  if (Array.isArray(x)) return x.map(coerceIdsDeep);
  if (isPOJO(x)) {
    const out: any = {};
    for (const k of Object.keys(x)) out[k] = coerceIdsDeep(x[k]);
    return out;
  }
  return x;
}

export function toJSONClean(schema: Schema) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(_doc: any, ret: any) {
      ret.id = ret._id?.toString?.();
      delete ret._id;
      delete ret.__v;
      return coerceIdsDeep(ret);
    },
  });
}
