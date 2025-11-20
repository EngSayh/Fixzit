import { ObjectId } from 'mongodb';
import { Types } from 'mongoose';

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
export function toObjectIdFilter(id: string): { _id: ObjectId } | { slug: string } {
  if (isValidObjectId(id)) {
    return { _id: new ObjectId(id) };
  }
  return { slug: id };
}
