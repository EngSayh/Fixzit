import mongoose from "mongoose";

/**
 * Centralized ObjectId validator that accepts both string and ObjectId inputs.
 * Trims strings before validation to reduce false negatives.
 */
export function isValidObjectId(value: unknown): boolean {
  if (value instanceof mongoose.Types.ObjectId) {
    return true;
  }
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  return mongoose.Types.ObjectId.isValid(trimmed);
}

/**
 * Helper to normalize an id to ObjectId when valid; otherwise returns undefined.
 */
export function toObjectId(value: unknown): mongoose.Types.ObjectId | undefined {
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }
  if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value.trim())) {
    return new mongoose.Types.ObjectId(value.trim());
  }
  return undefined;
}
