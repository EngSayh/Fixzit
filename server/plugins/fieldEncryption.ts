import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import type {
  Schema,
  Document,
  Query,
  UpdateQuery,
  UpdateWithAggregationPipeline,
} from "mongoose";

type EncryptionOptions = {
  fields: string[];
  secret?: string;
  skipIfNoSecret?: boolean;
};

// Type-safe hook context types for Mongoose operations
interface QueryWithUpdate<T = Document> extends Query<T, T> {
  getUpdate(): UpdateWithAggregationPipeline | UpdateQuery<T> | null;
}

type DocumentLike = Record<string, unknown>;

const ENC_PREFIX = "enc::";
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;

function resolveKey(secret?: string): Buffer | null {
  const raw = secret || process.env.PII_ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      "PII_ENCRYPTION_KEY must be a 32-byte base64 value for AES-256-GCM",
    );
  }
  return key;
}

function encryptValue(value: unknown, key: Buffer): string {
  const normalized = value === undefined || value === null ? "" : String(value);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(normalized, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${ENC_PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

function decryptValue(value: unknown, key: Buffer): unknown {
  if (typeof value !== "string" || !value.startsWith(ENC_PREFIX)) return value;
  const payload = value.slice(ENC_PREFIX.length);
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) return value;
  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    // If decryption fails, return the original value to avoid data loss
    return value;
  }
}

type TransformFn = (value: unknown) => unknown;

function applyPath(target: DocumentLike, segments: string[], transform: TransformFn) {
  if (!target || segments.length === 0) return;
  const [head, ...rest] = segments;
  const next = target[head];

  if (rest.length === 0) {
    const nextValue = transform(next);
    if (nextValue !== undefined) {
      target[head] = nextValue;
    }
    return;
  }

  if (Array.isArray(next)) {
    next.forEach((item) => {
      if (item && typeof item === "object") {
        applyPath(item as DocumentLike, rest, transform);
      }
    });
  } else if (next && typeof next === "object") {
    applyPath(next as DocumentLike, rest, transform);
  }
}

function transformDocument(doc: DocumentLike, fields: string[], transform: TransformFn) {
  fields.forEach((path) => applyPath(doc, path.split("."), transform));
}

function encryptDocument(doc: DocumentLike, fields: string[], key: Buffer) {
  transformDocument(doc, fields, (current) => {
    if (current === undefined || current === null) return undefined;
    if (typeof current === "string" && current.startsWith(ENC_PREFIX)) return current;
    return encryptValue(current, key);
  });
}

function decryptDocument(doc: DocumentLike, fields: string[], key: Buffer) {
  transformDocument(doc, fields, (current) => {
    if (current === undefined || current === null) return current;
    return decryptValue(current, key);
  });
}

function encryptUpdate(update: Record<string, unknown>, fields: string[], key: Buffer) {
  const targets = (update.$set ?? update) as DocumentLike;
  encryptDocument(targets, fields, key);
  if (update.$set) update.$set = targets;
}

export function fieldEncryptionPlugin(schema: Schema, options: EncryptionOptions) {
  const key = resolveKey(options.secret);
  if (!key) {
    if (options.skipIfNoSecret) return;
    throw new Error(
      "PII encryption enabled but no PII_ENCRYPTION_KEY provided. Set PII_ENCRYPTION_KEY as base64.",
    );
  }

  const fields = options.fields || [];

  schema.pre("save", function (next) {
    encryptDocument(this, fields, key);
    next();
  });

  const updateHooks: Array<"findOneAndUpdate" | "updateOne" | "updateMany"> = [
    "findOneAndUpdate",
    "updateOne",
    "updateMany",
  ];
  updateHooks.forEach((hook) => {
    schema.pre(hook, function (this: QueryWithUpdate, next) {
      const update = this.getUpdate();
      // Type guard: ensure update is an object (not aggregation pipeline)
      if (update && typeof update === "object" && !Array.isArray(update)) {
        encryptUpdate(update as Record<string, unknown>, fields, key);
      }
      next();
    });
  });

  // Register decrypt hooks individually to satisfy TypeScript
  schema.post("init", function (result: DocumentLike | null) {
    if (result) decryptDocument(result, fields, key);
  });
  
  schema.post("findOne", function (result: DocumentLike | null) {
    if (result) decryptDocument(result, fields, key);
  });
  
  schema.post("find", function (result: DocumentLike[] | null) {
    if (Array.isArray(result)) {
      result.forEach((doc) => decryptDocument(doc, fields, key));
    }
  });
}
