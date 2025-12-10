/**
 * Input Validation Tests
 * 
 * Tests for input sanitization and validation to prevent:
 * - XSS attacks
 * - SQL/NoSQL injection
 * - Path traversal
 * - Command injection
 * 
 * @module tests/unit/security/input-validation.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock sanitize-html
vi.mock('@/lib/sanitize-html', () => ({
  sanitizeHtml: vi.fn((html: string) => {
    // Simple sanitization for testing
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '');
  }),
}));

describe('Input Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('XSS Prevention', () => {
    it('should sanitize script tags from input', () => {
      const sanitize = (input: string): string => {
        return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      };

      const maliciousInput = '<script>alert("XSS")</script>Hello World';
      expect(sanitize(maliciousInput)).toBe('Hello World');
    });

    it('should sanitize event handlers from HTML', () => {
      const sanitize = (input: string): string => {
        return input.replace(/on\w+="[^"]*"/gi, '');
      };

      const maliciousInput = '<img src="x" onerror="alert(1)"><div onclick="evil()">Click</div>';
      const sanitized = sanitize(maliciousInput);
      
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('onclick');
    });

    it('should sanitize javascript: URLs', () => {
      const sanitize = (input: string): string => {
        return input.replace(/javascript:/gi, '');
      };

      const maliciousInput = '<a href="javascript:alert(1)">Click me</a>';
      expect(sanitize(maliciousInput)).not.toContain('javascript:');
    });

    it('should handle encoded XSS attempts', () => {
      const sanitize = (input: string): string => {
        // Decode HTML entities first
        const decoded = input
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#x3C;/gi, '<')
          .replace(/&#x3E;/gi, '>')
          .replace(/&#60;/g, '<')
          .replace(/&#62;/g, '>');
        
        return decoded.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      };

      const encodedXSS = '&lt;script&gt;alert(1)&lt;/script&gt;';
      // After decoding and sanitizing, script tags are removed
      expect(sanitize(encodedXSS)).toBe('');
    });

    it('should escape output for HTML context', () => {
      const escapeHtml = (input: string): string => {
        return input
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
      };

      const userInput = '<script>alert("XSS")</script>';
      const escaped = escapeHtml(userInput);
      
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    });
  });

  describe('NoSQL Injection Prevention', () => {
    it('should reject query operators in input', () => {
      const sanitizeMongoInput = (input: unknown): unknown => {
        if (typeof input !== 'object' || input === null) {
          return input;
        }

        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(input)) {
          // Reject keys starting with $
          if (key.startsWith('$')) {
            continue;
          }
          sanitized[key] = typeof value === 'object' 
            ? sanitizeMongoInput(value) 
            : value;
        }
        return sanitized;
      };

      const maliciousInput = {
        username: 'admin',
        password: { $gt: '' }, // NoSQL injection
      };

      const sanitized = sanitizeMongoInput(maliciousInput) as Record<string, unknown>;
      expect(sanitized.password).toEqual({});
    });

    it('should convert ObjectId strings safely', () => {
      const isValidObjectId = (id: string): boolean => {
        return /^[a-f\d]{24}$/i.test(id);
      };

      expect(isValidObjectId('6579a1b2c3d4e5f6a7b8c9d0')).toBe(true);
      expect(isValidObjectId('invalid-id')).toBe(false);
      expect(isValidObjectId('{"$gt": ""}')).toBe(false);
      expect(isValidObjectId('')).toBe(false);
    });

    it('should prevent regex DoS in search queries', () => {
      const sanitizeRegexInput = (input: string): string => {
        // Escape special regex characters
        return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      };

      const maliciousInput = 'a]|.*.*.*.*.*.*.*.*.*.*.*.*.*.*.*[';
      const sanitized = sanitizeRegexInput(maliciousInput);
      
      expect(() => new RegExp(sanitized)).not.toThrow();
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should reject path traversal sequences', () => {
      const isPathTraversal = (input: string): boolean => {
        const normalized = input.replace(/\\/g, '/');
        return normalized.includes('../') || 
               normalized.includes('..%2F') || 
               normalized.includes('..%5C') ||
               normalized.startsWith('/');
      };

      expect(isPathTraversal('../etc/passwd')).toBe(true);
      expect(isPathTraversal('..%2Fetc%2Fpasswd')).toBe(true);
      expect(isPathTraversal('/etc/passwd')).toBe(true);
      expect(isPathTraversal('safe-file.txt')).toBe(false);
    });

    it('should normalize and validate file paths', () => {
      const sanitizePath = (input: string, allowedDir: string): string | null => {
        // Remove any traversal attempts
        const normalized = input
          .replace(/\.\./g, '')
          .replace(/\/+/g, '/')
          .replace(/^\//, '');
        
        // Ensure it stays within allowed directory
        const fullPath = `${allowedDir}/${normalized}`;
        
        if (!fullPath.startsWith(allowedDir)) {
          return null;
        }
        
        return normalized;
      };

      expect(sanitizePath('uploads/../secrets/keys.txt', '/var/app')).toBe('uploads/secrets/keys.txt');
      expect(sanitizePath('normal-file.pdf', '/var/app')).toBe('normal-file.pdf');
    });

    it('should validate allowed file extensions', () => {
      const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];

      const isAllowedExtension = (filename: string): boolean => {
        const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
        return ALLOWED_EXTENSIONS.includes(ext);
      };

      expect(isAllowedExtension('document.pdf')).toBe(true);
      expect(isAllowedExtension('image.jpg')).toBe(true);
      expect(isAllowedExtension('script.exe')).toBe(false);
      expect(isAllowedExtension('shell.sh')).toBe(false);
      expect(isAllowedExtension('document.pdf.exe')).toBe(false);
    });
  });

  describe('Command Injection Prevention', () => {
    it('should reject shell metacharacters', () => {
      const containsShellMetachars = (input: string): boolean => {
        const dangerous = /[;&|`$(){}[\]<>!\\]/;
        return dangerous.test(input);
      };

      expect(containsShellMetachars('safe-filename.txt')).toBe(false);
      expect(containsShellMetachars('file; rm -rf /')).toBe(true);
      expect(containsShellMetachars('file | cat /etc/passwd')).toBe(true);
      expect(containsShellMetachars('file`whoami`')).toBe(true);
      expect(containsShellMetachars('$(id)')).toBe(true);
    });

    it('should sanitize shell command arguments', () => {
      const escapeShellArg = (arg: string): string => {
        // Wrap in single quotes and escape existing single quotes
        return `'${arg.replace(/'/g, "'\"'\"'")}'`;
      };

      const maliciousArg = "file'; rm -rf /; echo '";
      const escaped = escapeShellArg(maliciousArg);
      
      expect(escaped).toBe("'file'\"'\"'; rm -rf /; echo '\"'\"''");
    });
  });

  describe('Email Validation', () => {
    it('should validate email format', () => {
      const isValidEmail = (email: string): boolean => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('user.name@subdomain.example.com')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });

    it('should reject email header injection', () => {
      const hasEmailInjection = (email: string): boolean => {
        return /[\r\n]/.test(email) || 
               email.includes('Cc:') || 
               email.includes('Bcc:');
      };

      expect(hasEmailInjection('user@example.com')).toBe(false);
      expect(hasEmailInjection("user@example.com\nBcc: attacker@evil.com")).toBe(true);
      expect(hasEmailInjection("user@example.com\r\nCc: attacker@evil.com")).toBe(true);
    });
  });

  describe('Phone Number Validation', () => {
    it('should validate Saudi phone numbers', () => {
      const isValidSaudiPhone = (phone: string): boolean => {
        // Remove spaces, dashes, and common separators
        const cleaned = phone.replace(/[\s\-().]/g, '');
        
        // Saudi mobile: 05xxxxxxxx or +966 5xxxxxxxx
        // Saudi landline: 01x xxxxxxx or +966 1x xxxxxxx
        return /^(\+966|00966|0)?[15]\d{8}$/.test(cleaned);
      };

      expect(isValidSaudiPhone('+966501234567')).toBe(true);
      expect(isValidSaudiPhone('0501234567')).toBe(true);
      expect(isValidSaudiPhone('501234567')).toBe(true);
      expect(isValidSaudiPhone('+966112345678')).toBe(true);
      expect(isValidSaudiPhone('123')).toBe(false);
      expect(isValidSaudiPhone('abc')).toBe(false);
    });
  });

  describe('URL Validation', () => {
    it('should validate URL format', () => {
      const isValidUrl = (url: string): boolean => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      };

      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('https://example.com/path?query=1')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('javascript:alert(1)')).toBe(true); // Valid URL, but dangerous
    });

    it('should reject non-HTTP protocols', () => {
      const isAllowedProtocol = (url: string): boolean => {
        try {
          const parsed = new URL(url);
          return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
          return false;
        }
      };

      expect(isAllowedProtocol('https://example.com')).toBe(true);
      expect(isAllowedProtocol('http://example.com')).toBe(true);
      expect(isAllowedProtocol('javascript:alert(1)')).toBe(false);
      expect(isAllowedProtocol('file:///etc/passwd')).toBe(false);
      expect(isAllowedProtocol('data:text/html,<script>alert(1)</script>')).toBe(false);
    });
  });

  describe('JSON Validation', () => {
    it('should safely parse JSON input', () => {
      const safeJsonParse = (input: string): { success: boolean; data?: unknown; error?: string } => {
        try {
          const data = JSON.parse(input);
          return { success: true, data };
        } catch (e) {
          return { success: false, error: 'Invalid JSON' };
        }
      };

      expect(safeJsonParse('{"key": "value"}')).toEqual({
        success: true,
        data: { key: 'value' },
      });
      
      expect(safeJsonParse('not json')).toEqual({
        success: false,
        error: 'Invalid JSON',
      });
    });

    it('should limit JSON depth to prevent DoS', () => {
      const MAX_DEPTH = 10;

      const checkJsonDepth = (obj: unknown, currentDepth = 0): boolean => {
        if (currentDepth > MAX_DEPTH) return false;
        
        if (typeof obj === 'object' && obj !== null) {
          for (const value of Object.values(obj)) {
            if (!checkJsonDepth(value, currentDepth + 1)) {
              return false;
            }
          }
        }
        return true;
      };

      const shallow = { a: { b: { c: 1 } } };
      expect(checkJsonDepth(shallow)).toBe(true);

      // Create deeply nested object
      let deep: Record<string, unknown> = { value: 1 };
      for (let i = 0; i < 15; i++) {
        deep = { nested: deep };
      }
      expect(checkJsonDepth(deep)).toBe(false);
    });
  });
});
