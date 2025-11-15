/**
 * Global Mongoose type augmentations for Mongoose 8.x
 * Fixes Model<T> type errors across the codebase
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import 'mongoose';

declare module 'mongoose' {
  /**
   * Fix edge-runtime compatible Model export pattern.
   * When using: export const User = models.User || model("User", UserSchema)
   * TypeScript infers the type as ReturnType<typeof model> | Model, which causes union type issues.
   * This augmentation makes Model methods more permissive.
   */
  interface Model<_T, _TQueryHelpers = unknown, _TInstanceMethods = unknown, _TVirtuals = unknown> {
    // Override find to prevent union type signature conflicts
    find(
      _filter?: any,
      _projection?: any,
      _options?: any
    ): any;
    
    // Override findOne to prevent union type signature conflicts
    findOne(
      _filter?: any,
      _projection?: any,
      _options?: any
    ): any;
    
    // Override create to prevent union type signature conflicts
    create(
      _doc: any,
      _options?: any
    ): any;
    
    // Override findById to prevent union type signature conflicts
    findById(
      _id: any,
      _projection?: any,
      _options?: any
    ): any;
  }
}
