/**
 * Unit Tests for PII Encryption Utility
 * 
 * Tests AES-256-GCM encryption/decryption functions with comprehensive coverage.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import crypto from 'crypto';
import {
  encryptField,
  decryptField,
  encryptFields,
  decryptFields,
  isEncrypted,
  generateEncryptionKey,
  __test__,
} from '@/lib/security/encryption';

describe('PII Encryption Utility', () => {
  const originalEnv = process.env.ENCRYPTION_KEY;
  const testKey = generateEncryptionKey();

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = testKey;
  });

  afterAll(() => {
    process.env.ENCRYPTION_KEY = originalEnv;
  });

  describe('encryptField', () => {
    it('should encrypt a string value', () => {
      const plaintext = '1234567890';
      const encrypted = encryptField(plaintext, 'test.field');

      expect(encrypted).toBeTruthy();
      expect(encrypted).not.toBe(plaintext);
      expect(encrypted).toMatch(/^v1:/);
    });

    it('should encrypt a number value', () => {
      const plaintext = 50000;
      const encrypted = encryptField(plaintext, 'salary');

      expect(encrypted).toBeTruthy();
      expect(encrypted).toMatch(/^v1:/);
    });

    it('should return null for null input', () => {
      const encrypted = encryptField(null, 'test.field');
      expect(encrypted).toBeNull();
    });

    it('should return null for undefined input', () => {
      const encrypted = encryptField(undefined, 'test.field');
      expect(encrypted).toBeNull();
    });

    it('should return null for empty string', () => {
      const encrypted = encryptField('', 'test.field');
      expect(encrypted).toBeNull();
    });

    it('should produce different ciphertexts for same plaintext (unique IV)', () => {
      const plaintext = 'test-value';
      const encrypted1 = encryptField(plaintext, 'field1');
      const encrypted2 = encryptField(plaintext, 'field2');

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should include version prefix', () => {
      const encrypted = encryptField('test', 'field');
      expect(encrypted).toMatch(/^v1:/);
    });

    it('should have 5 parts separated by colons', () => {
      const encrypted = encryptField('test', 'field');
      const parts = encrypted!.split(':');
      expect(parts.length).toBe(5);
      expect(parts[0]).toBe('v1');
    });
  });

  describe('decryptField', () => {
    it('should decrypt an encrypted value', () => {
      const plaintext = '1234567890';
      const encrypted = encryptField(plaintext, 'nationalId');
      const decrypted = decryptField(encrypted!, 'nationalId');

      expect(decrypted).toBe(plaintext);
    });

    it('should decrypt numeric values as strings', () => {
      const plaintext = 50000;
      const encrypted = encryptField(plaintext, 'salary');
      const decrypted = decryptField(encrypted!, 'salary');

      expect(decrypted).toBe('50000');
    });

    it('should return null for null input', () => {
      const decrypted = decryptField(null, 'test.field');
      expect(decrypted).toBeNull();
    });

    it('should return null for undefined input', () => {
      const decrypted = decryptField(undefined, 'test.field');
      expect(decrypted).toBeNull();
    });

    it('should return null for empty string', () => {
      const decrypted = decryptField('', 'test.field');
      expect(decrypted).toBeNull();
    });

    it('should throw error for invalid format', () => {
      expect(() => {
        decryptField('invalid-format', 'field');
      }).toThrow(/Invalid encrypted format/);
    });

    it('should throw error for unsupported version', () => {
      expect(() => {
        decryptField('v2:salt:iv:tag:ciphertext', 'field');
      }).toThrow(/Unsupported encryption version/);
    });

    it('should throw error for tampered ciphertext', () => {
      const plaintext = 'test-value';
      const encrypted = encryptField(plaintext, 'field');
      
      // Tamper with ciphertext (last part)
      const parts = encrypted!.split(':');
      parts[4] = parts[4].slice(0, -4) + 'XXXX';
      const tampered = parts.join(':');

      expect(() => {
        decryptField(tampered, 'field');
      }).toThrow(/Failed to decrypt/);
    });
  });

  describe('encryptFields', () => {
    it('should encrypt multiple fields in an object', () => {
      const obj = {
        personal: {
          nationalId: '1234567890',
          passport: 'AB123456',
        },
        employment: {
          salary: 50000,
        },
      };

      const encrypted = encryptFields(obj, [
        'personal.nationalId',
        'personal.passport',
        'employment.salary',
      ]);

      expect(encrypted.personal.nationalId).toMatch(/^v1:/);
      expect(encrypted.personal.passport).toMatch(/^v1:/);
      expect(encrypted.employment.salary).toMatch(/^v1:/);
    });

    it('should handle missing nested objects', () => {
      const obj = {
        personal: {
          firstName: 'John',
        },
      };

      const encrypted = encryptFields(obj, ['personal.nationalId']);

      expect(encrypted.personal.nationalId).toBeUndefined();
    });

    it('should skip null/undefined values', () => {
      const obj = {
        personal: {
          nationalId: null,
          passport: undefined,
        },
      };

      const encrypted = encryptFields(obj, [
        'personal.nationalId',
        'personal.passport',
      ]);

      expect(encrypted.personal.nationalId).toBeNull();
      expect(encrypted.personal.passport).toBeUndefined();
    });
  });

  describe('decryptFields', () => {
    it('should decrypt multiple fields in an object', () => {
      const obj = {
        personal: {
          nationalId: '1234567890',
          passport: 'AB123456',
        },
        employment: {
          salary: 50000,
        },
      };

      const encrypted = encryptFields(obj, [
        'personal.nationalId',
        'personal.passport',
        'employment.salary',
      ]);

      const decrypted = decryptFields(encrypted, [
        'personal.nationalId',
        'personal.passport',
        'employment.salary',
      ]);

      expect(decrypted.personal.nationalId).toBe('1234567890');
      expect(decrypted.personal.passport).toBe('AB123456');
      expect(decrypted.employment.salary).toBe('50000');
    });

    it('should handle missing paths gracefully', () => {
      const obj = {
        personal: {
          firstName: 'John',
        },
      };

      const decrypted = decryptFields(obj, ['personal.nationalId']);

      expect(decrypted.personal.nationalId).toBeUndefined();
    });

    it('should keep encrypted value on decrypt failure', () => {
      const obj = {
        personal: {
          nationalId: 'v1:invalid:encrypted:data:here',
        },
      };

      const decrypted = decryptFields(obj, ['personal.nationalId']);

      // Should keep encrypted value rather than throwing
      expect(decrypted.personal.nationalId).toBe('v1:invalid:encrypted:data:here');
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted values', () => {
      const encrypted = encryptField('test', 'field');
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plaintext values', () => {
      expect(isEncrypted('plaintext')).toBe(false);
      expect(isEncrypted('1234567890')).toBe(false);
      expect(isEncrypted(null)).toBe(false);
      expect(isEncrypted(undefined)).toBe(false);
      expect(isEncrypted(123)).toBe(false);
    });

    it('should return true for mock encrypted values', () => {
      expect(isEncrypted('MOCK_ENCRYPTED:test')).toBe(true);
    });
  });

  describe('generateEncryptionKey', () => {
    it('should generate a base64 key', () => {
      const key = generateEncryptionKey();
      expect(key).toBeTruthy();
      expect(typeof key).toBe('string');
      
      // Verify it's valid base64
      const buffer = Buffer.from(key, 'base64');
      expect(buffer.length).toBe(32); // 256 bits
    });

    it('should generate unique keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('round-trip encryption/decryption', () => {
    const testCases = [
      { value: '1234567890', name: 'National ID' },
      { value: 'AB123456', name: 'Passport' },
      { value: 50000, name: 'Salary (number)' },
      { value: 'totp-secret-key', name: 'MFA Secret' },
      { value: 'special@chars#123!', name: 'Special characters' },
      { value: 'مرحبا', name: 'Arabic text' },
      { value: '你好', name: 'Chinese text' },
      { value: 'a'.repeat(1000), name: 'Long string (1000 chars)' },
    ];

    testCases.forEach(({ value, name }) => {
      it(`should round-trip: ${name}`, () => {
        const encrypted = encryptField(value, 'test.field');
        const decrypted = decryptField(encrypted!, 'test.field');
        expect(decrypted).toBe(String(value));
      });
    });
  });

  describe('key derivation', () => {
    it('should derive same key from same master key and salt', () => {
      const masterKey = 'test-master-key';
      const salt = crypto.randomBytes(64);

      const key1 = __test__.deriveKey(masterKey, salt);
      const key2 = __test__.deriveKey(masterKey, salt);

      expect(key1.equals(key2)).toBe(true);
    });

    it('should derive different keys from different salts', () => {
      const masterKey = 'test-master-key';
      const salt1 = crypto.randomBytes(64);
      const salt2 = crypto.randomBytes(64);

      const key1 = __test__.deriveKey(masterKey, salt1);
      const key2 = __test__.deriveKey(masterKey, salt2);

      expect(key1.equals(key2)).toBe(false);
    });
  });

  describe('mock encryption (no key)', () => {
    beforeAll(() => {
      delete process.env.ENCRYPTION_KEY;
      process.env.NODE_ENV = 'development';
    });

    afterAll(() => {
      process.env.ENCRYPTION_KEY = testKey;
    });

    it('should use mock encryption without key in development', () => {
      const plaintext = '1234567890';
      const encrypted = encryptField(plaintext, 'field');
      expect(encrypted).toBe('MOCK_ENCRYPTED:1234567890');
    });

    it('should decrypt mock encrypted values', () => {
      const encrypted = 'MOCK_ENCRYPTED:1234567890';
      const decrypted = decryptField(encrypted, 'field');
      expect(decrypted).toBe('1234567890');
    });
  });

  describe('error handling', () => {
    it('should throw in production without encryption key', () => {
      delete process.env.ENCRYPTION_KEY;
      process.env.NODE_ENV = 'production';

      expect(() => {
        encryptField('test', 'field');
      }).toThrow(/ENCRYPTION_KEY environment variable not set/);

      process.env.ENCRYPTION_KEY = testKey;
      process.env.NODE_ENV = 'test';
    });

    it('should handle missing encryption key in test environment', () => {
      // In test environment without key, encryption returns mock value
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      const result = encryptField('test', 'field');
      // In non-production without key, it falls back to mock encryption
      expect(result).toContain('MOCK_ENCRYPTED:');

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  describe('security properties', () => {
    it('should use AES-256-GCM algorithm', () => {
      expect(__test__.ALGORITHM).toBe('aes-256-gcm');
    });

    it('should use 128-bit IV', () => {
      expect(__test__.IV_LENGTH).toBe(16);
    });

    it('should use 128-bit authentication tag', () => {
      expect(__test__.AUTH_TAG_LENGTH).toBe(16);
    });

    it('should include version prefix for key rotation', () => {
      expect(__test__.VERSION_PREFIX).toBe('v1');
    });
  });
});
