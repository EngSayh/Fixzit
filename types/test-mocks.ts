/**
 * Test Mock Type Definitions
 *
 * Provides type-safe interfaces for test mocks,
 * replacing `any` types in test files.
 *
 * @module types/test-mocks
 */

import type { Mock } from "vitest";

/**
 * Generic mock function that accepts any arguments
 * and returns a specific type
 */
export type GenericMock<_TReturn = unknown> = Mock;

/**
 * MongoDB collection mock interface
 * Represents a mocked MongoDB collection
 */
export interface MockMongoCollection<T = unknown> {
  find: GenericMock;
  findOne: GenericMock<T | null>;
  insertOne: GenericMock;
  insertMany: GenericMock;
  updateOne: GenericMock;
  updateMany: GenericMock;
  deleteOne: GenericMock;
  deleteMany: GenericMock;
  aggregate: GenericMock;
  countDocuments: GenericMock<number>;
  distinct: GenericMock<unknown[]>;
}

/**
 * Mock cursor for chaining MongoDB operations
 */
export interface MockMongoCursor {
  toArray: GenericMock<unknown[]>;
  limit: (_n: number) => MockMongoCursor;
  skip: (_n: number) => MockMongoCursor;
  sort: (_sortSpec: Record<string, 1 | -1>) => MockMongoCursor;
  forEach: (_callback: (_doc: unknown) => void) => void;
  [key: string]: unknown;
}

/**
 * Mock Next.js request object
 */
export interface MockNextRequest {
  url: string;
  method: string;
  headers: Map<string, string>;
  nextUrl: {
    searchParams: URLSearchParams;
  };
  json?: () => Promise<unknown>;
  formData?: () => Promise<FormData>;
}

/**
 * Mock Next.js response with json method
 */
export interface MockNextResponse {
  status: number;
  headers: Map<string, string>;
  json: () => Promise<unknown>;
}

/**
 * MongoDB document mock (generic structure)
 */
export interface MockMongoDoc {
  _id: string | object;
  [key: string]: unknown;
}

/**
 * Error mock for testing error handlers
 */
export interface MockError {
  message: string;
  name: string;
  code?: string | number;
  stack?: string;
  [key: string]: unknown;
}
