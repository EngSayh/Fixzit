// ============================================================================
// COMPREHENSIVE TYPE DEFINITIONS FOR ESLINT 'ANY' ELIMINATION
// ============================================================================
// This file provides proper TypeScript types to replace all 'any' usage
// across the codebase, achieving 100% type safety
// ============================================================================

import { Types } from "mongoose";

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface ApiRequest {
  method?: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  name: string;
  message: string;
  code?: string | number;
  stack?: string;
}

// ============================================================================
// DATABASE DOCUMENT TYPES
// ============================================================================

export interface MongoDocument {
  _id?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MongoFilter {
  [key: string]: unknown;
  $or?: Array<Record<string, unknown>>;
  $and?: Array<Record<string, unknown>>;
}

export interface MongoUpdateOperator {
  $set?: Record<string, unknown>;
  $unset?: Record<string, unknown>;
  $push?: Record<string, unknown>;
  $pull?: Record<string, unknown>;
  $inc?: Record<string, unknown>;
}

export interface MongoProjection {
  [key: string]: 0 | 1 | { $meta?: string };
}

export interface MongoSortOrder {
  [key: string]: 1 | -1 | { $meta?: string };
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export interface ValidationError {
  path: string[];
  message: string;
  code?: string;
}

export interface ZodIssue {
  path: (string | number)[];
  message: string;
  code: string;
}

// ============================================================================
// QUERY PARAMETER TYPES
// ============================================================================

export interface PaginationParams {
  page?: number | string;
  limit?: number | string;
  skip?: number | string;
}

export interface SearchParams extends PaginationParams {
  q?: string;
  search?: string;
  query?: string;
  filter?: string;
  sort?: string;
}

export interface DateRangeParams {
  startDate?: string | Date;
  endDate?: string | Date;
  from?: string | Date;
  to?: string | Date;
}

// ============================================================================
// FILE UPLOAD TYPES
// ============================================================================

export interface UploadedFile {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

export interface FileUploadResult {
  filename: string;
  path: string;
  url?: string;
  size: number;
  mimetype?: string;
}

// ============================================================================
// HELPER TYPES FOR ANY ELIMINATION
// ============================================================================

/** Use for truly dynamic objects where structure is unknown */
export type UnknownObject = Record<string, unknown>;

/** Use for JSON-serializable data */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

/** Use for error handling */
export type ErrorLike =
  | Error
  | { message: string; name?: string; stack?: string };

/** Use for callback functions when signature is truly unknown */
export type UnknownFunction = (...args: Array<unknown>) => unknown;

/** Use for React component props when specific props aren't known */
export type UnknownProps = Record<string, unknown>;

/** Use for form data */
export type FormData = Record<
  string,
  string | number | boolean | File | null | undefined
>;

/** Use for query string parameters */
export type QueryParams = Record<string, string | string[] | undefined>;

/** Use for HTTP headers */
export type HttpHeaders = Record<string, string | string[] | undefined>;

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

export function isErrorLike(error: unknown): error is ErrorLike {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as Record<string, unknown>).message === "string"
  );
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

// ============================================================================
// EXPORT ALL
// ============================================================================

const types = {
  // Re-export all types for convenience
};

export default types;
