import { Schema, Types } from 'mongoose';

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return Boolean(value) && Object.prototype.toString.call(value) === '[object Object]';
}

function coerceIdsDeep(value: unknown): unknown {
  if (value == null) return value;
  if (value instanceof Types.ObjectId) return value.toString();
  if (Array.isArray(value)) {
    return value.map(item => coerceIdsDeep(item));
  }
  if (isPlainObject(value)) {
    const out: PlainObject = {};
    for (const key of Object.keys(value)) {
      out[key] = coerceIdsDeep(value[key]);
    }
    return out;
  }
  return value;
}

type TransformableDocument = {
  _id?: Types.ObjectId | string | { toString?: () => string };
  __v?: unknown;
  id?: string;
  [key: string]: unknown;
};

export function toJSONClean(schema: Schema) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(_doc: unknown, ret: TransformableDocument) {
      if (ret._id != null) {
        const normalizedId =
          typeof ret._id === 'string'
            ? ret._id
            : typeof ret._id?.toString === 'function'
              ? ret._id.toString()
              : undefined;
        if (normalizedId) {
          ret.id = normalizedId;
        }
      }
      delete ret._id;
      delete ret.__v;
      return coerceIdsDeep(ret);
    },
  });
}
