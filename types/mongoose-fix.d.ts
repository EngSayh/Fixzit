/**
 * Global type declarations to resolve Mongoose 8.x union type overload ambiguity
 * 
 * Issue: Mongoose 8 has overloaded method signatures that TypeScript cannot disambiguate
 * when models are exported without explicit Model<T> typing.
 * 
 * This file provides type augmentations to bypass the issue globally.
 * 
 * Affected methods: findOne, findOneAndUpdate, findById, find, create, etc.
 * Files affected: 50+ API routes using Mongoose queries
 * 
 * Reference: https://github.com/Automattic/mongoose/issues/13752
 */

import type { Model as MongooseModel, Document, FilterQuery, UpdateQuery, QueryOptions } from 'mongoose';

declare module 'mongoose' {
  // Simplify Model type to avoid requiring all 7 generic parameters
  export type Model<
    T,
    TQueryHelpers = any,
    TInstanceMethods = any,
    TVirtuals = any,
    THydratedDocumentType = any,
    TSchema = any,
    TRest = any
  > = MongooseModel<T, TQueryHelpers, TInstanceMethods, TVirtuals, THydratedDocumentType, TSchema, TRest>;
  
  interface Model<T> {
    findOneAndUpdate(
      filter: FilterQuery<T>,
      update: UpdateQuery<T> | Record<string, any>,
      options?: QueryOptions<T> & { upsert?: boolean; new?: boolean; runValidators?: boolean }
    ): Promise<T | null>;
    
    findOne(filter: FilterQuery<T>): Promise<T | null>;
    
    find(filter: FilterQuery<T>): any;
    
    findById(id: string | any): Promise<T | null>;
    
    create(doc: Partial<T> | Partial<T>[]): Promise<T | T[]>;
  }
}

export {};
