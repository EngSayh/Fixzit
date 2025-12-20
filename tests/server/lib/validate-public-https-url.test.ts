import { describe, it, expect, vi, beforeEach } from 'vitest';
import { URLValidationError } from '@/lib/security/validate-public-https-url';

// Mock DNS lookup BEFORE importing the module that uses it
// dns.lookup with { all: true } returns an array of { address, family }
vi.mock('node:dns', () => ({
  promises: {
    lookup: vi.fn().mockImplementation((host, options) => {
      // Return IPv4 for family: 4, reject for family: 6
      if (options?.family === 4) {
        return Promise.resolve([{ address: '93.184.216.34', family: 4 }]);
      }
      if (options?.family === 6) {
        return Promise.reject(new Error('No AAAA records'));
      }
      return Promise.resolve([{ address: '93.184.216.34', family: 4 }]);
    }),
  },
}));

// Import AFTER mock is set up
const { validatePublicHttpsUrl, isValidPublicHttpsUrl } = await import('@/lib/security/validate-public-https-url');

describe('validatePublicHttpsUrl - SSRF Protection v2.0', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Valid Public HTTPS URLs', () => {
    it('should accept valid public HTTPS URLs with DNS resolution', async () => {
      const validUrls = [
        'https://example.com',
        'https://api.example.com/webhook',
        'https://subdomain.example.co.uk/path/to/endpoint',
        'https://example.com:8443/secure',
      ];

      for (const url of validUrls) {
        await expect(validatePublicHttpsUrl(url)).resolves.toBeInstanceOf(URL);
        await expect(isValidPublicHttpsUrl(url)).resolves.toBe(true);
      }
    });
  });

  describe('HTTP (non-HTTPS) Rejection', () => {
    it('should reject HTTP URLs', async () => {
      await expect(validatePublicHttpsUrl('http://example.com')).rejects.toThrow(URLValidationError);
      await expect(validatePublicHttpsUrl('http://example.com')).rejects.toThrow('Only HTTPS URLs are allowed');
      await expect(isValidPublicHttpsUrl('http://example.com')).resolves.toBe(false);
    });

    it('should reject FTP and other protocols', async () => {
      await expect(validatePublicHttpsUrl('ftp://example.com')).rejects.toThrow(URLValidationError);
      await expect(validatePublicHttpsUrl('file:///etc/passwd')).rejects.toThrow(URLValidationError);
      await expect(isValidPublicHttpsUrl('ftp://example.com')).resolves.toBe(false);
    });
  });

  describe('Localhost Rejection', () => {
    it('should reject localhost variants', async () => {
      const localhostUrls = [
        'https://localhost',
        'https://localhost:3000',
        'https://127.0.0.1',
        'https://0.0.0.0',
        'https://[::1]',
        'https://[::]',
      ];

      for (const url of localhostUrls) {
        await expect(validatePublicHttpsUrl(url)).rejects.toThrow(URLValidationError);
        await expect(validatePublicHttpsUrl(url)).rejects.toThrow('Localhost/loopback URLs are not allowed');
        await expect(isValidPublicHttpsUrl(url)).resolves.toBe(false);
      }
    });
  });

  describe('Private IP Rejection', () => {
    it('should reject 10.0.0.0/8 range', async () => {
      const privateIPs = [
        'https://10.0.0.1',
        'https://10.255.255.255',
        'https://10.123.45.67',
      ];

      for (const url of privateIPs) {
        await expect(validatePublicHttpsUrl(url)).rejects.toThrow(URLValidationError);
        await expect(validatePublicHttpsUrl(url)).rejects.toThrow('Private IP address URLs are not allowed');
        await expect(isValidPublicHttpsUrl(url)).resolves.toBe(false);
      }
    });

    it('should reject 192.168.0.0/16 range', async () => {
      const privateIPs = [
        'https://192.168.0.1',
        'https://192.168.1.1',
        'https://192.168.255.255',
      ];

      for (const url of privateIPs) {
        await expect(validatePublicHttpsUrl(url)).rejects.toThrow(URLValidationError);
        await expect(validatePublicHttpsUrl(url)).rejects.toThrow('Private IP address URLs are not allowed');
        await expect(isValidPublicHttpsUrl(url)).resolves.toBe(false);
      }
    });

    it('should reject 172.16.0.0/12 range', async () => {
      const privateIPs = [
        'https://172.16.0.1',
        'https://172.31.255.255',
        'https://172.20.5.10',
      ];

      for (const url of privateIPs) {
        await expect(validatePublicHttpsUrl(url)).rejects.toThrow(URLValidationError);
        await expect(validatePublicHttpsUrl(url)).rejects.toThrow('Private IP address URLs are not allowed');
        await expect(isValidPublicHttpsUrl(url)).resolves.toBe(false);
      }
    });
  });

  describe('Link-Local Rejection (AWS Metadata)', () => {
    it('should reject 169.254.x.x addresses', async () => {
      const linkLocalUrls = [
        'https://169.254.169.254/latest/meta-data/', // AWS metadata endpoint
        'https://169.254.0.1',
        'https://169.254.255.255',
      ];

      for (const url of linkLocalUrls) {
        await expect(validatePublicHttpsUrl(url)).rejects.toThrow(URLValidationError);
        await expect(validatePublicHttpsUrl(url)).rejects.toThrow('Private IP address URLs are not allowed');
        await expect(isValidPublicHttpsUrl(url)).resolves.toBe(false);
      }
    });
  });

  describe('Internal TLD Rejection', () => {
    it('should reject .local domains', async () => {
      await expect(validatePublicHttpsUrl('https://service.local')).rejects.toThrow(URLValidationError);
      await expect(validatePublicHttpsUrl('https://service.local')).rejects.toThrow('Internal TLD (.local, .internal, .test) URLs are not allowed');
      await expect(isValidPublicHttpsUrl('https://service.local')).resolves.toBe(false);
    });

    it('should reject .internal domains', async () => {
      await expect(validatePublicHttpsUrl('https://api.internal')).rejects.toThrow(URLValidationError);
      await expect(validatePublicHttpsUrl('https://api.internal')).rejects.toThrow('Internal TLD (.local, .internal, .test) URLs are not allowed');
      await expect(isValidPublicHttpsUrl('https://api.internal')).resolves.toBe(false);
    });
  });

  describe('Direct IP Address Rejection', () => {
    it('should reject direct public IP addresses', async () => {
      const publicIPs = [
        'https://8.8.8.8', // Google DNS
        'https://1.1.1.1', // Cloudflare DNS
        'https://93.184.216.34', // example.com IP
      ];

      for (const url of publicIPs) {
        await expect(validatePublicHttpsUrl(url)).rejects.toThrow(URLValidationError);
        await expect(validatePublicHttpsUrl(url)).rejects.toThrow('Direct IP addresses are discouraged');
        await expect(isValidPublicHttpsUrl(url)).resolves.toBe(false);
      }
    });
  });

  describe('Malformed URLs', () => {
    it('should reject invalid URL formats', async () => {
      const malformedUrls = [
        'not-a-url',
        'https://',
        'https://example .com',
        '',
        'https://[invalid',
      ];

      for (const url of malformedUrls) {
        await expect(validatePublicHttpsUrl(url)).rejects.toThrow(URLValidationError);
        await expect(validatePublicHttpsUrl(url)).rejects.toThrow('Invalid URL format');
        await expect(isValidPublicHttpsUrl(url)).resolves.toBe(false);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should reject URLs with private IP in subdomain', async () => {
      await expect(validatePublicHttpsUrl('https://192.168.1.1')).rejects.toThrow();
    });

    it('should handle ports correctly', async () => {
      await expect(validatePublicHttpsUrl('https://example.com:443')).resolves.toBeInstanceOf(URL);
      await expect(validatePublicHttpsUrl('https://example.com:8443')).resolves.toBeInstanceOf(URL);
    });

    it('should handle paths and query strings', async () => {
      await expect(validatePublicHttpsUrl('https://example.com/path?param=value')).resolves.toBeInstanceOf(URL);
      await expect(validatePublicHttpsUrl('https://example.com/webhook?token=abc123')).resolves.toBeInstanceOf(URL);
    });
  });
});
