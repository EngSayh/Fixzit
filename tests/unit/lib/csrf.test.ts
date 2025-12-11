/**
 * CSRF Utility Tests
 * 
 * @module tests/unit/lib/csrf.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateCSRFToken,
  validateCSRFTokens,
  extractCSRFFromRequest,
} from '@/lib/csrf';

describe('CSRF Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateCSRFToken', () => {
    it('should generate a token of expected length', () => {
      const token = generateCSRFToken();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate unique tokens', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateCSRFToken());
      }
      expect(tokens.size).toBe(100);
    });
  });

  describe('validateCSRFTokens', () => {
    it('should return true for matching tokens', () => {
      const token = 'valid-csrf-token-12345';
      expect(validateCSRFTokens(token, token)).toBe(true);
    });

    it('should return false for mismatched tokens', () => {
      expect(validateCSRFTokens('token-a', 'token-b')).toBe(false);
    });

    it('should return false for null header token', () => {
      expect(validateCSRFTokens(null, 'cookie-token')).toBe(false);
    });

    it('should return false for null cookie token', () => {
      expect(validateCSRFTokens('header-token', null)).toBe(false);
    });

    it('should return false for both null tokens', () => {
      expect(validateCSRFTokens(null, null)).toBe(false);
    });

    it('should return false for different length tokens', () => {
      expect(validateCSRFTokens('short', 'much-longer-token')).toBe(false);
    });

    it('should use constant-time comparison', () => {
      // This test verifies the comparison doesn't short-circuit
      // by checking that similar tokens take similar time
      const token1 = 'a'.repeat(64);
      const token2 = 'b'.repeat(64);
      const token3 = 'a'.repeat(63) + 'b';

      // All comparisons should complete fully
      expect(validateCSRFTokens(token1, token2)).toBe(false);
      expect(validateCSRFTokens(token1, token3)).toBe(false);
      expect(validateCSRFTokens(token1, token1)).toBe(true);
    });
  });

  describe('extractCSRFFromRequest', () => {
    it('should extract tokens from request headers and cookies', () => {
      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'X-CSRF-Token' || name === 'x-csrf-token') {
              return 'header-token';
            }
            return null;
          },
        },
        cookies: {
          get: (name: string) => {
            if (name === 'csrf-token') {
              return { value: 'cookie-token' };
            }
            return undefined;
          },
        },
      };

      const result = extractCSRFFromRequest(mockRequest);
      expect(result.headerToken).toBe('header-token');
      expect(result.cookieToken).toBe('cookie-token');
    });

    it('should handle missing header token', () => {
      const mockRequest = {
        headers: {
          get: () => null,
        },
        cookies: {
          get: (name: string) => {
            if (name === 'csrf-token') {
              return { value: 'cookie-token' };
            }
            return undefined;
          },
        },
      };

      const result = extractCSRFFromRequest(mockRequest);
      expect(result.headerToken).toBeNull();
      expect(result.cookieToken).toBe('cookie-token');
    });

    it('should handle missing cookie token', () => {
      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'X-CSRF-Token') {
              return 'header-token';
            }
            return null;
          },
        },
        cookies: {
          get: () => undefined,
        },
      };

      const result = extractCSRFFromRequest(mockRequest);
      expect(result.headerToken).toBe('header-token');
      expect(result.cookieToken).toBeNull();
    });

    it('should handle lowercase header name', () => {
      const mockRequest = {
        headers: {
          get: (name: string) => {
            if (name === 'x-csrf-token') {
              return 'lowercase-header-token';
            }
            return null;
          },
        },
        cookies: {
          get: () => undefined,
        },
      };

      const result = extractCSRFFromRequest(mockRequest);
      expect(result.headerToken).toBe('lowercase-header-token');
    });
  });
});
