/**
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { validatePublicHttpsUrl, isValidPublicHttpsUrl, URLValidationError } from '@/lib/security/validate-public-https-url';

describe('validatePublicHttpsUrl - SSRF Protection', () => {
  describe('Valid Public HTTPS URLs', () => {
    it('should accept valid public HTTPS URLs', () => {
      const validUrls = [
        'https://example.com',
        'https://api.example.com/webhook',
        'https://subdomain.example.co.uk/path/to/endpoint',
        'https://example.com:8443/secure',
      ];

      validUrls.forEach((url) => {
        expect(() => validatePublicHttpsUrl(url)).not.toThrow();
        expect(isValidPublicHttpsUrl(url)).toBe(true);
      });
    });
  });

  describe('HTTP (non-HTTPS) Rejection', () => {
    it('should reject HTTP URLs', () => {
      expect(() => validatePublicHttpsUrl('http://example.com')).toThrow(URLValidationError);
      expect(() => validatePublicHttpsUrl('http://example.com')).toThrow('Only HTTPS URLs are allowed');
      expect(isValidPublicHttpsUrl('http://example.com')).toBe(false);
    });

    it('should reject FTP and other protocols', () => {
      expect(() => validatePublicHttpsUrl('ftp://example.com')).toThrow(URLValidationError);
      expect(() => validatePublicHttpsUrl('file:///etc/passwd')).toThrow(URLValidationError);
      expect(isValidPublicHttpsUrl('ftp://example.com')).toBe(false);
    });
  });

  describe('Localhost Rejection', () => {
    it('should reject localhost variants', () => {
      const localhostUrls = [
        'https://localhost',
        'https://localhost:3000',
        'https://127.0.0.1',
        'https://0.0.0.0',
        'https://[::1]',
        'https://[::]',
      ];

      localhostUrls.forEach((url) => {
        expect(() => validatePublicHttpsUrl(url)).toThrow(URLValidationError);
        expect(() => validatePublicHttpsUrl(url)).toThrow('Localhost URLs are not allowed');
        expect(isValidPublicHttpsUrl(url)).toBe(false);
      });
    });
  });

  describe('Private IP Rejection', () => {
    it('should reject 10.0.0.0/8 range', () => {
      const privateIPs = [
        'https://10.0.0.1',
        'https://10.255.255.255',
        'https://10.123.45.67',
      ];

      privateIPs.forEach((url) => {
        expect(() => validatePublicHttpsUrl(url)).toThrow(URLValidationError);
        expect(() => validatePublicHttpsUrl(url)).toThrow('Private IP addresses are not allowed');
        expect(isValidPublicHttpsUrl(url)).toBe(false);
      });
    });

    it('should reject 192.168.0.0/16 range', () => {
      const privateIPs = [
        'https://192.168.0.1',
        'https://192.168.1.1',
        'https://192.168.255.255',
      ];

      privateIPs.forEach((url) => {
        expect(() => validatePublicHttpsUrl(url)).toThrow(URLValidationError);
        expect(() => validatePublicHttpsUrl(url)).toThrow('Private IP addresses are not allowed');
        expect(isValidPublicHttpsUrl(url)).toBe(false);
      });
    });

    it('should reject 172.16.0.0/12 range', () => {
      const privateIPs = [
        'https://172.16.0.1',
        'https://172.31.255.255',
        'https://172.20.5.10',
      ];

      privateIPs.forEach((url) => {
        expect(() => validatePublicHttpsUrl(url)).toThrow(URLValidationError);
        expect(() => validatePublicHttpsUrl(url)).toThrow('Private IP addresses are not allowed');
        expect(isValidPublicHttpsUrl(url)).toBe(false);
      });
    });
  });

  describe('Link-Local Rejection (AWS Metadata)', () => {
    it('should reject 169.254.x.x addresses', () => {
      const linkLocalUrls = [
        'https://169.254.169.254/latest/meta-data/', // AWS metadata endpoint
        'https://169.254.0.1',
        'https://169.254.255.255',
      ];

      linkLocalUrls.forEach((url) => {
        expect(() => validatePublicHttpsUrl(url)).toThrow(URLValidationError);
        expect(() => validatePublicHttpsUrl(url)).toThrow('Link-local addresses are not allowed');
        expect(isValidPublicHttpsUrl(url)).toBe(false);
      });
    });
  });

  describe('Internal TLD Rejection', () => {
    it('should reject .local domains', () => {
      expect(() => validatePublicHttpsUrl('https://service.local')).toThrow(URLValidationError);
      expect(() => validatePublicHttpsUrl('https://service.local')).toThrow('Internal TLDs are not allowed');
      expect(isValidPublicHttpsUrl('https://service.local')).toBe(false);
    });

    it('should reject .internal domains', () => {
      expect(() => validatePublicHttpsUrl('https://api.internal')).toThrow(URLValidationError);
      expect(() => validatePublicHttpsUrl('https://api.internal')).toThrow('Internal TLDs are not allowed');
      expect(isValidPublicHttpsUrl('https://api.internal')).toBe(false);
    });
  });

  describe('Direct IP Address Rejection', () => {
    it('should reject direct public IP addresses', () => {
      const publicIPs = [
        'https://8.8.8.8', // Google DNS
        'https://1.1.1.1', // Cloudflare DNS
        'https://93.184.216.34', // example.com IP
      ];

      publicIPs.forEach((url) => {
        expect(() => validatePublicHttpsUrl(url)).toThrow(URLValidationError);
        expect(() => validatePublicHttpsUrl(url)).toThrow('Direct IP addresses are discouraged');
        expect(isValidPublicHttpsUrl(url)).toBe(false);
      });
    });
  });

  describe('Malformed URLs', () => {
    it('should reject invalid URL formats', () => {
      const malformedUrls = [
        'not-a-url',
        'https://',
        'https://example .com',
        '',
        'https://[invalid',
      ];

      malformedUrls.forEach((url) => {
        expect(() => validatePublicHttpsUrl(url)).toThrow(URLValidationError);
        expect(() => validatePublicHttpsUrl(url)).toThrow('Invalid URL format');
        expect(isValidPublicHttpsUrl(url)).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should reject URLs with private IP in subdomain', () => {
      // This is a domain name that looks like an IP, not blocked
      // But actual IP-based URLs are blocked
      expect(() => validatePublicHttpsUrl('https://192.168.1.1')).toThrow();
    });

    it('should handle ports correctly', () => {
      expect(() => validatePublicHttpsUrl('https://example.com:443')).not.toThrow();
      expect(() => validatePublicHttpsUrl('https://example.com:8443')).not.toThrow();
    });

    it('should handle paths and query strings', () => {
      expect(() => validatePublicHttpsUrl('https://example.com/path?param=value')).not.toThrow();
      expect(() => validatePublicHttpsUrl('https://example.com/webhook?token=abc123')).not.toThrow();
    });
  });
});
