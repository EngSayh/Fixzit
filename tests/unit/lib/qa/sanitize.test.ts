/**
 * Unit tests for QA payload sanitization
 */

import { describe, it, expect } from 'vitest';
import { sanitizeQaPayload, estimatePayloadSize } from '@/lib/qa/sanitize';

describe('sanitizeQaPayload', () => {
  describe('null/undefined handling', () => {
    it('returns null for null input', () => {
      expect(sanitizeQaPayload(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(sanitizeQaPayload(undefined)).toBeNull();
    });
  });

  describe('primitive values', () => {
    it('passes through numbers unchanged', () => {
      expect(sanitizeQaPayload(42)).toBe(42);
      expect(sanitizeQaPayload(3.14)).toBe(3.14);
      expect(sanitizeQaPayload(-100)).toBe(-100);
    });

    it('passes through booleans unchanged', () => {
      expect(sanitizeQaPayload(true)).toBe(true);
      expect(sanitizeQaPayload(false)).toBe(false);
    });

    it('passes through short strings unchanged', () => {
      expect(sanitizeQaPayload('hello')).toBe('hello');
    });

    it('truncates long strings', () => {
      const longString = 'x'.repeat(600);
      const result = sanitizeQaPayload(longString) as string;
      expect(result.length).toBeLessThan(600);
      expect(result).toContain('[TRUNCATED]');
    });
  });

  describe('email redaction', () => {
    it('redacts email addresses in strings', () => {
      const input = 'Contact user@example.com for help';
      const result = sanitizeQaPayload(input);
      expect(result).toBe('Contact [REDACTED_EMAIL] for help');
    });

    it('redacts multiple emails', () => {
      const input = 'From: sender@test.com To: receiver@test.com';
      const result = sanitizeQaPayload(input);
      expect(result).toBe('From: [REDACTED_EMAIL] To: [REDACTED_EMAIL]');
    });

    it('redacts emails in nested objects', () => {
      const input = { user: { email: 'test@example.com', name: 'Test' } };
      const result = sanitizeQaPayload(input) as Record<string, Record<string, string>>;
      expect(result.user.email).toBe('[REDACTED_EMAIL]');
      expect(result.user.name).toBe('Test');
    });
  });

  describe('sensitive key redaction', () => {
    it('redacts password fields', () => {
      const input = { password: 'secret123', username: 'admin' };
      const result = sanitizeQaPayload(input) as Record<string, string>;
      expect(result.password).toBe('[REDACTED]');
      expect(result.username).toBe('admin');
    });

    it('redacts token fields', () => {
      const input = { accessToken: 'abc123', refreshToken: 'xyz789', userId: '123' };
      const result = sanitizeQaPayload(input) as Record<string, string>;
      expect(result.accessToken).toBe('[REDACTED]');
      expect(result.refreshToken).toBe('[REDACTED]');
      expect(result.userId).toBe('123');
    });

    it('redacts secret fields', () => {
      const input = { clientSecret: 'shh', publicKey: 'pk123' };
      const result = sanitizeQaPayload(input) as Record<string, string>;
      expect(result.clientSecret).toBe('[REDACTED]');
      expect(result.publicKey).toBe('pk123');
    });

    it('redacts api key fields', () => {
      const input = { apiKey: 'key123', api_key: 'key456' };
      const result = sanitizeQaPayload(input) as Record<string, string>;
      expect(result.apiKey).toBe('[REDACTED]');
      expect(result.api_key).toBe('[REDACTED]');
    });

    it('redacts session-related fields', () => {
      const input = { sessionId: 'sess123', sessionToken: 'tok456' };
      const result = sanitizeQaPayload(input) as Record<string, string>;
      expect(result.sessionId).toBe('[REDACTED]');
      expect(result.sessionToken).toBe('[REDACTED]');
    });

    it('redacts credit card fields', () => {
      const input = { creditCard: '4111...', cardNumber: '4111', cvv: '123' };
      const result = sanitizeQaPayload(input) as Record<string, string>;
      expect(result.creditCard).toBe('[REDACTED]');
      expect(result.cardNumber).toBe('[REDACTED]');
      expect(result.cvv).toBe('[REDACTED]');
    });

    it('does NOT redact "author" field (word boundary check)', () => {
      const input = { author: 'John Doe', authority: 'admin', authenticate: true };
      const result = sanitizeQaPayload(input) as Record<string, unknown>;
      expect(result.author).toBe('John Doe');
      expect(result.authority).toBe('admin');
      expect(result.authenticate).toBe(true);
    });

    it('does NOT redact "session" as part of larger word', () => {
      const input = { sessionDetails: { userId: '123' }, sessionState: 'active' };
      const result = sanitizeQaPayload(input) as Record<string, unknown>;
      // sessionDetails should NOT be redacted (not word boundary match for session_id or session_token)
      expect(result.sessionDetails).toEqual({ userId: '123' });
      expect(result.sessionState).toBe('active');
    });

    it('redacts camelCase token fields (authToken, bearerToken, jwtToken)', () => {
      const input = {
        authToken: 'secret-auth-token-value',
        bearerToken: 'secret-bearer-token-value',
        jwtToken: 'secret-jwt-token-value',
        accessToken: 'secret-access-token-value',
        refreshToken: 'secret-refresh-token-value',
        idToken: 'secret-id-token-value',
        apiToken: 'secret-api-token-value',
        userToken: 'secret-user-token-value',
        clientToken: 'secret-client-token-value',
        // These should NOT be redacted
        authorName: 'John Doe',
        tokenCount: 5,
      };
      const result = sanitizeQaPayload(input) as Record<string, unknown>;
      // All camelCase token fields should be redacted
      expect(result.authToken).toBe('[REDACTED]');
      expect(result.bearerToken).toBe('[REDACTED]');
      expect(result.jwtToken).toBe('[REDACTED]');
      expect(result.accessToken).toBe('[REDACTED]');
      expect(result.refreshToken).toBe('[REDACTED]');
      expect(result.idToken).toBe('[REDACTED]');
      expect(result.apiToken).toBe('[REDACTED]');
      expect(result.userToken).toBe('[REDACTED]');
      expect(result.clientToken).toBe('[REDACTED]');
      // These should NOT be redacted
      expect(result.authorName).toBe('John Doe');
      expect(result.tokenCount).toBe(5);
    });

    it('redacts nested camelCase token fields', () => {
      const input = {
        auth: {
          authToken: 'nested-auth-token',
          bearerToken: 'nested-bearer-token',
        },
        user: {
          id: '123',
          jwtToken: 'nested-jwt-token',
        },
      };
      const result = sanitizeQaPayload(input) as Record<string, Record<string, unknown>>;
      expect(result.auth.authToken).toBe('[REDACTED]');
      expect(result.auth.bearerToken).toBe('[REDACTED]');
      expect(result.user.id).toBe('123');
      expect(result.user.jwtToken).toBe('[REDACTED]');
    });
  });

  describe('value-based sensitive pattern redaction', () => {
    it('redacts Bearer tokens in string values', () => {
      const input = { message: 'Request failed with Bearer abc123xyz' };
      const result = sanitizeQaPayload(input) as Record<string, string>;
      expect(result.message).toBe('Request failed with [REDACTED_BEARER_TOKEN]');
    });

    it('redacts Bearer tokens case-insensitively', () => {
      const input = 'Authorization: bearer mySecretToken123';
      const result = sanitizeQaPayload(input);
      expect(result).toBe('Authorization: [REDACTED_BEARER_TOKEN]');
    });

    it('redacts JWT tokens in values', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
      const input = { error: `Invalid token: ${jwt}` };
      const result = sanitizeQaPayload(input) as Record<string, string>;
      expect(result.error).toBe('Invalid token: [REDACTED_JWT]');
      expect(result.error).not.toContain('eyJ');
    });

    it('redacts API key patterns in values', () => {
      const input = { log: 'api_key=sk_live_abc123xyz' };
      const result = sanitizeQaPayload(input) as Record<string, string>;
      expect(result.log).toBe('[REDACTED_API_KEY]');
    });

    it('redacts Basic auth headers', () => {
      const input = 'Authorization: Basic dXNlcjpwYXNzd29yZA==';
      const result = sanitizeQaPayload(input);
      expect(result).toBe('Authorization: [REDACTED_BASIC_AUTH]');
    });

    it('redacts MongoDB connection strings', () => {
      const input = { connectionString: 'mongodb+srv://user:password123@cluster.mongodb.net/db' };
      const result = sanitizeQaPayload(input) as Record<string, string>;
      expect(result.connectionString).toBe('[REDACTED_MONGO_URI]');
    });

    it('redacts password patterns in key-value format', () => {
      const input = 'Connection failed: password=mysecret123';
      const result = sanitizeQaPayload(input);
      expect(result).toBe('Connection failed: [REDACTED_PASSWORD]');
    });

    it('redacts URLs with embedded credentials', () => {
      const input = { url: 'https://admin:secret@api.example.com/data' };
      const result = sanitizeQaPayload(input) as Record<string, string>;
      expect(result.url).toBe('https://[REDACTED_CREDENTIALS]@api.example.com/data');
    });

    it('redacts AWS access key IDs', () => {
      const input = { awsKey: 'AKIAIOSFODNN7EXAMPLE' };
      const result = sanitizeQaPayload(input) as Record<string, string>;
      expect(result.awsKey).toBe('[REDACTED_AWS_KEY_ID]');
    });

    it('redacts multiple sensitive values in one string', () => {
      const input = 'Auth: Bearer token123 and password=secret';
      const result = sanitizeQaPayload(input);
      expect(result).toBe('Auth: [REDACTED_BEARER_TOKEN] and [REDACTED_PASSWORD]');
    });

    it('redacts sensitive values in nested arrays', () => {
      const input = {
        logs: [
          { message: 'Bearer secretToken123 used' },
          { message: 'Normal log entry' },
        ],
      };
      const result = sanitizeQaPayload(input) as Record<string, Array<Record<string, string>>>;
      expect(result.logs[0].message).toBe('[REDACTED_BEARER_TOKEN] used');
      expect(result.logs[1].message).toBe('Normal log entry');
    });

    it('redacts Bearer tokens containing base64 characters (+/=)', () => {
      // Real OAuth2 tokens often contain base64 characters
      const input = { message: 'Auth failed: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9+abc/def=' };
      const result = sanitizeQaPayload(input) as Record<string, string>;
      expect(result.message).toBe('Auth failed: [REDACTED_BEARER_TOKEN]');
      expect(result.message).not.toContain('+');
      expect(result.message).not.toContain('/');
      expect(result.message).not.toContain('=');
    });

    it('redacts Bearer tokens with URL-safe base64 variants (~_)', () => {
      const input = 'Authorization: Bearer abc123~def_456';
      const result = sanitizeQaPayload(input);
      expect(result).toBe('Authorization: [REDACTED_BEARER_TOKEN]');
    });

    it('redacts API keys containing base64 characters', () => {
      // Many API keys use base64 encoding
      const input = { log: 'api_key=sk_live_abc123+xyz/456==' };
      const result = sanitizeQaPayload(input) as Record<string, string>;
      expect(result.log).toBe('[REDACTED_API_KEY]');
      expect(result.log).not.toContain('+');
      expect(result.log).not.toContain('/');
    });

    it('redacts x-api-key header with base64 value', () => {
      const input = { header: 'x-api-key: abc123+def/ghi==' };
      const result = sanitizeQaPayload(input) as Record<string, string>;
      expect(result.header).toBe('[REDACTED_API_KEY]');
    });

    it('redacts session values with base64 characters', () => {
      const input = 'session=abc123+def/ghi==jklmnopqrstuvwxyz';
      const result = sanitizeQaPayload(input);
      expect(result).toBe('[REDACTED_SESSION]');
    });
  });

  describe('array handling', () => {
    it('sanitizes array elements', () => {
      const input = ['safe', 'user@email.com', { password: 'secret' }];
      const result = sanitizeQaPayload(input) as unknown[];
      expect(result[0]).toBe('safe');
      expect(result[1]).toBe('[REDACTED_EMAIL]');
      expect((result[2] as Record<string, string>).password).toBe('[REDACTED]');
    });

    it('truncates long arrays', () => {
      const input = Array.from({ length: 100 }, (_, i) => i);
      const result = sanitizeQaPayload(input) as unknown[];
      expect(result.length).toBe(51); // 50 items + truncation message
      expect(result[50]).toContain('more items');
    });
  });

  describe('nested object handling', () => {
    it('handles nested objects', () => {
      const input = {
        level1: {
          level2: {
            value: 'test',
            email: 'nested@test.com'
          }
        }
      };
      const result = sanitizeQaPayload(input) as Record<string, Record<string, Record<string, string>>>;
      expect(result.level1.level2.value).toBe('test');
      expect(result.level1.level2.email).toBe('[REDACTED_EMAIL]');
    });

    it('limits object depth', () => {
      // Create a deeply nested object
      let deep: Record<string, unknown> = { value: 'deep' };
      for (let i = 0; i < 10; i++) {
        deep = { nested: deep };
      }
      
      const result = sanitizeQaPayload(deep);
      // Should not throw and should contain truncation marker at some depth
      expect(JSON.stringify(result)).toContain('MAX_DEPTH_EXCEEDED');
    });
  });

  describe('real-world payloads', () => {
    it('sanitizes a typical form submission payload', () => {
      const input = {
        event: 'form_submit',
        formData: {
          email: 'user@company.com',
          password: 'mypassword123',
          rememberMe: true
        },
        metadata: {
          timestamp: 1234567890,
          userAgent: 'Mozilla/5.0'
        }
      };
      
      const result = sanitizeQaPayload(input) as Record<string, unknown>;
      const formData = result.formData as Record<string, unknown>;
      
      expect(formData.email).toBe('[REDACTED_EMAIL]');
      expect(formData.password).toBe('[REDACTED]');
      expect(formData.rememberMe).toBe(true);
    });

    it('sanitizes an API error payload with bearer token in error message', () => {
      const input = {
        error: 'Authentication failed with Bearer mySecretToken123',
        details: {
          attemptedEmail: 'admin@test.com',
          author: 'John Doe'  // Should NOT be redacted
        }
      };
      
      const result = sanitizeQaPayload(input) as Record<string, unknown>;
      const details = result.details as Record<string, unknown>;
      
      // Value-based redaction of bearer token
      expect(result.error).toBe('Authentication failed with [REDACTED_BEARER_TOKEN]');
      expect(details.attemptedEmail).toBe('[REDACTED_EMAIL]');
      // Word boundary: author should NOT be redacted
      expect(details.author).toBe('John Doe');
    });

    it('sanitizes a log entry with embedded JWT', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjMifQ.signature123';
      const input = {
        level: 'error',
        message: `Token validation failed: ${jwt}`,
        context: {
          authority: 'system',  // Should NOT be redacted (word boundary)
          endpoint: '/api/login'
        }
      };
      
      const result = sanitizeQaPayload(input) as Record<string, unknown>;
      const context = result.context as Record<string, unknown>;
      
      expect(result.message).toBe('Token validation failed: [REDACTED_JWT]');
      expect(context.authority).toBe('system');
      expect(context.endpoint).toBe('/api/login');
    });

    it('sanitizes connection string errors', () => {
      const input = {
        errorType: 'DatabaseConnectionError',
        message: 'Failed to connect to mongodb+srv://admin:password123@cluster.net/db',
        stack: 'Error at connection.js:42'
      };
      
      const result = sanitizeQaPayload(input) as Record<string, unknown>;
      
      expect(result.message).toBe('Failed to connect to [REDACTED_MONGO_URI]');
      expect(result.errorType).toBe('DatabaseConnectionError');
    });
  });
});

describe('estimatePayloadSize', () => {
  it('returns 0 for null', () => {
    expect(estimatePayloadSize(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(estimatePayloadSize(undefined)).toBe(0);
  });

  it('estimates size of simple string', () => {
    const size = estimatePayloadSize('hello');
    expect(size).toBe(7); // "hello" with quotes
  });

  it('estimates size of object', () => {
    const obj = { key: 'value' };
    const size = estimatePayloadSize(obj);
    expect(size).toBe(JSON.stringify(obj).length);
  });

  it('handles circular references gracefully', () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    // Should return 0 instead of throwing
    expect(estimatePayloadSize(circular)).toBe(0);
  });
});
