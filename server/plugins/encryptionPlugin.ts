/**
 * DATA-004 FIX: Centralized Encryption Plugin
 *
 * Reusable Mongoose plugin for PII field encryption/decryption.
 * Consolidates duplicate encryption logic from User.ts, hr.models.ts, etc.
 *
 * GDPR Article 32: Security of processing (encryption at rest)
 * Saudi Labor Law Article 52: Salary confidentiality
 *
 * @module server/plugins/encryptionPlugin
 */

import { Schema, Query } from "mongoose";
import {
  encryptField,
  decryptField,
  isEncrypted,
} from "@/lib/security/encryption";
import { logger } from "@/lib/logger";

/**
 * Configuration options for the encryption plugin
 */
export interface EncryptionPluginOptions {
  /**
   * Fields to encrypt, mapped by dot-notation path to display name
   * Example: { 'personal.nationalId': 'National ID', 'bankDetails.iban': 'IBAN' }
   */
  fields: Record<string, string>;

  /**
   * Whether to log encryption/decryption operations (default: false in production)
   */
  logOperations?: boolean;
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Set a nested value in an object using dot notation
 */
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const parts = path.split(".");
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Mongoose plugin that adds automatic PII encryption/decryption
 *
 * @example
 * ```typescript
 * import { encryptionPlugin } from '@/server/plugins/encryptionPlugin';
 *
 * const UserSchema = new Schema({...});
 *
 * UserSchema.plugin(encryptionPlugin, {
 *   fields: {
 *     'personal.nationalId': 'National ID',
 *     'personal.passport': 'Passport Number',
 *     'bankDetails.iban': 'IBAN',
 *   }
 * });
 * ```
 */
export function encryptionPlugin<T>(
  schema: Schema<T>,
  options: EncryptionPluginOptions
): void {
  const { fields, logOperations = process.env.NODE_ENV === "development" } =
    options;

  const fieldPaths = Object.keys(fields);

  /**
   * Pre-save hook: Encrypt PII fields before saving to database
   */
  schema.pre("save", function (next) {
    const doc = this as unknown as Record<string, unknown>;

    for (const path of fieldPaths) {
      const value = getNestedValue(doc, path);

      if (
        value !== undefined &&
        value !== null &&
        typeof value === "string" &&
        value.length > 0 &&
        !isEncrypted(value)
      ) {
        const encrypted = encryptField(value, path);
        setNestedValue(doc, path, encrypted);

        if (logOperations) {
          logger.debug("[EncryptionPlugin] Field encrypted on save", {
            field: path,
            displayName: fields[path],
          });
        }
      }
    }

    next();
  });

  /**
   * Pre-findOneAndUpdate hook: Encrypt PII fields in update operations
   */
  schema.pre("findOneAndUpdate", function (next) {
    const update = (this as Query<unknown, unknown>).getUpdate() as Record<
      string,
      unknown
    > | null;
    if (!update) return next();

    const $set = (update.$set as Record<string, unknown>) ?? update;

    for (const path of fieldPaths) {
      // Check both $set and direct update paths
      const value = getNestedValue($set, path);

      if (
        value !== undefined &&
        value !== null &&
        typeof value === "string" &&
        value.length > 0 &&
        !isEncrypted(value)
      ) {
        const encrypted = encryptField(value, path);

        if (update.$set) {
          setNestedValue(update.$set as Record<string, unknown>, path, encrypted);
        } else {
          setNestedValue(update, path, encrypted);
        }

        if (logOperations) {
          logger.debug("[EncryptionPlugin] Field encrypted on update", {
            field: path,
            displayName: fields[path],
          });
        }
      }
    }

    (this as Query<unknown, unknown>).setUpdate(update);
    next();
  });

  /**
   * Pre-updateOne hook: Reuse findOneAndUpdate logic
   */
  schema.pre("updateOne", function (next) {
    const update = (this as Query<unknown, unknown>).getUpdate() as Record<
      string,
      unknown
    > | null;
    if (!update) return next();

    const $set = (update.$set as Record<string, unknown>) ?? update;

    for (const path of fieldPaths) {
      const value = getNestedValue($set, path);

      if (
        value !== undefined &&
        value !== null &&
        typeof value === "string" &&
        value.length > 0 &&
        !isEncrypted(value)
      ) {
        const encrypted = encryptField(value, path);

        if (update.$set) {
          setNestedValue(update.$set as Record<string, unknown>, path, encrypted);
        } else {
          setNestedValue(update, path, encrypted);
        }
      }
    }

    (this as Query<unknown, unknown>).setUpdate(update);
    next();
  });

  /**
   * Pre-updateMany hook: Reuse update logic
   */
  schema.pre("updateMany", function (next) {
    const update = (this as Query<unknown, unknown>).getUpdate() as Record<
      string,
      unknown
    > | null;
    if (!update) return next();

    const $set = (update.$set as Record<string, unknown>) ?? update;

    for (const path of fieldPaths) {
      const value = getNestedValue($set, path);

      if (
        value !== undefined &&
        value !== null &&
        typeof value === "string" &&
        value.length > 0 &&
        !isEncrypted(value)
      ) {
        const encrypted = encryptField(value, path);

        if (update.$set) {
          setNestedValue(update.$set as Record<string, unknown>, path, encrypted);
        } else {
          setNestedValue(update, path, encrypted);
        }
      }
    }

    (this as Query<unknown, unknown>).setUpdate(update);
    next();
  });

  /**
   * Post-find hook: Decrypt PII fields after query
   */
  schema.post("find", function (docs: unknown[]) {
    if (!Array.isArray(docs)) return;

    for (const doc of docs) {
      if (!doc || typeof doc !== "object") continue;
      decryptDocument(doc as Record<string, unknown>, fieldPaths, fields, logOperations);
    }
  });

  /**
   * Post-findOne hook: Decrypt PII fields after query
   */
  schema.post("findOne", function (doc: unknown) {
    if (!doc || typeof doc !== "object") return;
    decryptDocument(doc as Record<string, unknown>, fieldPaths, fields, logOperations);
  });

  /**
   * Post-findOneAndUpdate hook: Decrypt PII fields after update+return
   */
  schema.post("findOneAndUpdate", function (doc: unknown) {
    if (!doc || typeof doc !== "object") return;
    decryptDocument(doc as Record<string, unknown>, fieldPaths, fields, logOperations);
  });
}

/**
 * Helper to decrypt all encrypted fields in a document
 */
function decryptDocument(
  doc: Record<string, unknown>,
  fieldPaths: string[],
  fields: Record<string, string>,
  logOperations: boolean
): void {
  for (const path of fieldPaths) {
    const value = getNestedValue(doc, path);

    if (
      value !== undefined &&
      value !== null &&
      typeof value === "string" &&
      isEncrypted(value)
    ) {
      try {
        const decrypted = decryptField(value, path);
        setNestedValue(doc, path, decrypted);

        if (logOperations) {
          logger.debug("[EncryptionPlugin] Field decrypted on read", {
            field: path,
            displayName: fields[path],
          });
        }
      } catch (error) {
        logger.error("[EncryptionPlugin] Decryption failed", {
          field: path,
          displayName: fields[path],
          error: error instanceof Error ? error.message : String(error),
        });
        // Leave as encrypted if decryption fails
      }
    }
  }
}

export default encryptionPlugin;
