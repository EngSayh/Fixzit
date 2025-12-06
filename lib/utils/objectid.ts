import { ObjectId } from "mongodb";
import { Types } from "mongoose";

/**
 * Type representing a MongoDB ObjectId or string ID
 * Consolidated from lib/mongo-ids.ts
 */
export type MongoId = Types.ObjectId | string;

/**
 * Custom validation error for ObjectId validation failures
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Validate if a string is a valid MongoDB ObjectId
 * @param id - The string to validate
 * @returns true if valid ObjectId, false otherwise
 */
export function isValidObjectId(id: string | undefined | null): boolean {
  if (!id) return false;
  return Types.ObjectId.isValid(id);
}

/**
 * Parse a string to ObjectId, throwing ValidationError if invalid
 * Use this for API endpoints that require strict ObjectId validation
 * @param id - The string to parse
 * @param fieldName - Optional field name for error message context
 * @throws ValidationError if the id is not a valid ObjectId
 * @returns ObjectId
 */
export function parseObjectId(id: string | undefined | null, fieldName = "id"): ObjectId {
  if (!id) {
    throw new ValidationError(`${fieldName} is required`);
  }
  if (!isValidObjectId(id)) {
    throw new ValidationError(`Invalid ${fieldName}: must be a valid ObjectId format`);
  }
  return new ObjectId(id);
}

/**
 * Safely convert a string to ObjectId
 * @param id - The string to convert
 * @returns ObjectId if valid, null otherwise
 */
export function toObjectId(id: string | undefined | null): ObjectId | null {
  if (!id || !isValidObjectId(id)) return null;
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

/**
 * Convert string to ObjectId filter for MongoDB queries
 * @param id - The ID string
 * @returns Filter object with _id as ObjectId or string as fallback (for slug-based queries)
 */
export function toObjectIdFilter(
  id: string,
): { _id: ObjectId } | { slug: string } {
  if (isValidObjectId(id)) {
    return { _id: new ObjectId(id) };
  }
  return { slug: id };
}

/**
 * Type guard to check if a value is a valid ObjectId or ObjectId-like string
 * Consolidated from lib/mongo-ids.ts
 * @param v - Value to check
 * @returns true if v is a Types.ObjectId or a valid ObjectId string
 */
export function isObjectIdLike(v: unknown): v is MongoId {
  return (
    v instanceof Types.ObjectId ||
    (typeof v === "string" && Types.ObjectId.isValid(v))
  );
}

/**
 * Convert a MongoId (string or ObjectId) to Types.ObjectId
 * Throws if invalid. Consolidated from lib/mongo-ids.ts
 * @param id - The MongoId to convert
 * @returns Types.ObjectId
 */
export function toTypesObjectId(id: MongoId): Types.ObjectId {
  if (id instanceof Types.ObjectId) return id;
  if (!Types.ObjectId.isValid(id)) throw new Error(`Invalid ObjectId: ${id}`);
  return new Types.ObjectId(id);
}
