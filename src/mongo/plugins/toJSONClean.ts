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
  _id?: unknown;
  __v?: unknown;
  id?: string;
  [key: string]: unknown;
};

export function toJSONClean(schema: Schema) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(_doc: unknown, ret: TransformableDocument) {
      const rawId = ret._id as Types.ObjectId | string | { toString?: () => string } | undefined;
      if (rawId != null) {
        const normalizedId =
          typeof rawId === 'string'
            ? rawId
            : typeof rawId?.toString === 'function'
              ? rawId.toString()
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
