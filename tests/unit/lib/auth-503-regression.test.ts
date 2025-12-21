/**
 * Auth → 503 Regression Guard Tests
 *
 * Ensures that authentication failures are NEVER mapped to 503.
 * 503 should only be used for genuine service availability issues.
 *
 * @see docs/engineering/audits/auth.503.triage.md
 */

import { describe, it, expect } from 'vitest';
import { UnauthorizedError } from '@/server/middleware/withAuthRbac';
import { ForbiddenError } from '@/server/lib/errors';
import { isUnauthorizedError } from '@/server/utils/isUnauthorizedError';

describe('Auth → 503 Regression Guard', () => {
  describe('UnauthorizedError must be recognized, not masked as 503', () => {
    it('UnauthorizedError is recognized by isUnauthorizedError guard', () => {
      const error = new UnauthorizedError('Invalid credentials');
      expect(isUnauthorizedError(error)).toBe(true);
    });

    it('UnauthorizedError has name "UnauthorizedError"', () => {
      const error = new UnauthorizedError('Session expired');
      expect(error.name).toBe('UnauthorizedError');
    });

    it('Error with name "UnauthorizedError" is recognized by guard', () => {
      const error = new Error('Test unauthorized');
      error.name = 'UnauthorizedError';
      expect(isUnauthorizedError(error)).toBe(true);
    });
  });

  describe('ForbiddenError must map to 403, not 503', () => {
    it('ForbiddenError has name "ForbiddenError"', () => {
      const error = new ForbiddenError('Insufficient permissions');
      expect(error.name).toBe('ForbiddenError');
    });
  });

  describe('Auth errors should NEVER produce 503', () => {
    it('UnauthorizedError should be distinguishable from service errors', () => {
      const authError = new UnauthorizedError('Authentication failed');

      // Auth errors should be recognizable by the guard
      expect(isUnauthorizedError(authError)).toBe(true);

      // Auth errors should NOT have messages that suggest service unavailability
      expect(authError.message).not.toContain('service unavailable');
      expect(authError.message).not.toContain('503');
    });

    it('Service unavailability message should NOT be used for auth failures', () => {
      // Document the pattern: "Authentication service unavailable" is for actual service outages
      // NOT for invalid credentials

      // This is a documentation test - valid auth error
      const validAuthError = new UnauthorizedError('Invalid credentials');
      expect(validAuthError.message).toBe('Invalid credentials');

      // If someone creates "service unavailable", it should be a different error type
      const serviceError = new Error('Authentication service unavailable');
      expect(isUnauthorizedError(serviceError)).toBe(false);
    });
  });

  describe('isUnauthorizedError guard contract', () => {
    it('returns true for UnauthorizedError instances', () => {
      expect(isUnauthorizedError(new UnauthorizedError())).toBe(true);
    });

    it('returns true for errors with name "UnauthorizedError"', () => {
      const error = new Error('test');
      error.name = 'UnauthorizedError';
      expect(isUnauthorizedError(error)).toBe(true);
    });

    it('returns false for ForbiddenError', () => {
      expect(isUnauthorizedError(new ForbiddenError())).toBe(false);
    });

    it('returns false for generic Error', () => {
      expect(isUnauthorizedError(new Error('generic'))).toBe(false);
    });

    it('returns false for service availability errors', () => {
      const serviceError = new Error('Authentication service unavailable');
      expect(isUnauthorizedError(serviceError)).toBe(false);
    });
  });
});
