/**
 * Shared type for fields encrypted at rest in MongoDB.
 *
 * Fields may hold their original value type or the encrypted string representation,
 * and optional fields may also be null/undefined.
 */
type EncryptableFieldBase<T> = T | string | null | undefined;

export type EncryptableField<T> = EncryptableFieldBase<T>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type EncryptableField<T> = EncryptableFieldBase<T>;
}

export {};
