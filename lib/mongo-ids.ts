import { Types } from "mongoose";

export type MongoId = Types.ObjectId | string;

export function toObjectId(id: MongoId): Types.ObjectId {
  if (id instanceof Types.ObjectId) return id;
  if (!Types.ObjectId.isValid(id)) throw new Error(`Invalid ObjectId: ${id}`);
  return new Types.ObjectId(id);
}

export function isObjectIdLike(v: unknown): v is MongoId {
  return (
    v instanceof Types.ObjectId ||
    (typeof v === "string" && Types.ObjectId.isValid(v))
  );
}
