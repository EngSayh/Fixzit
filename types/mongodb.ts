/**
 * MongoDB Type Definitions
 *
 * Provides type-safe interfaces for MongoDB operations,
 * replacing `any` types throughout the codebase.
 *
 * @module types/mongodb
 */

import type { ObjectId } from "mongodb";

/**
 * MongoDB filter object for queries
 * Represents the query criteria for find operations
 */
export type MongoFilter = Record<string, unknown>;

/**
 * MongoDB document with _id field
 * Base interface for all MongoDB documents
 */
export interface MongoDocument {
  _id: ObjectId | string;
  [key: string]: unknown;
}

/**
 * Generic API response with serialized MongoDB data
 * Used when returning data from API routes
 */
export interface SerializedMongoDoc {
  id: string;
  [key: string]: unknown;
}

/**
 * MongoDB query options
 * Common options for find/aggregate operations
 */
export interface MongoQueryOptions {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  projection?: Record<string, 0 | 1>;
}

/**
 * Type guard to check if value is a MongoDB ObjectId
 */
export function isObjectId(value: unknown): value is ObjectId {
  return (
    value !== null &&
    typeof value === "object" &&
    "_bsontype" in value &&
    value._bsontype === "ObjectID"
  );
}

/**
 * Serializes MongoDB document for API responses
 * Converts _id to id and ensures JSON-serializable output
 */
export function serializeMongoDoc<T extends MongoDocument>(
  doc: T,
): SerializedMongoDoc {
  const { _id, ...rest } = doc;
  return {
    id: String(_id),
    ...rest,
  };
}
