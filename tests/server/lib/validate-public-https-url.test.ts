import { describe, it, expect } from "vitest";
import {
  validatePublicHttpsUrl,
  isValidPublicHttpsUrl,
  URLValidationError,
} from "@/lib/security/validate-public-https-url";

describe("validatePublicHttpsUrl - SSRF Protection v1.5 (sync validator + async boolean helper)", () => {
  describe("Valid Public HTTPS URLs", () => {
    it("accepts valid public HTTPS URLs", async () => {
      const validUrls = [
        "https://example.com",
        "https://api.example.com/webhook",
        "https://subdomain.example.co.uk/path/to/endpoint",
        "https://example.com:8443/secure",
      ];

      for (const url of validUrls) {
        expect(() => validatePublicHttpsUrl(url)).not.toThrow();
        await expect(isValidPublicHttpsUrl(url)).resolves.toBe(true);
      }
    });
  });

  describe("HTTP (non-HTTPS) Rejection", () => {
    it("rejects HTTP URLs", async () => {
      expect(() => validatePublicHttpsUrl("http://example.com")).toThrow(
        URLValidationError,
      );
      expect(() => validatePublicHttpsUrl("http://example.com")).toThrow(
        "Only HTTPS URLs are allowed",
      );
      await expect(isValidPublicHttpsUrl("http://example.com")).resolves.toBe(
        false,
      );
    });

    it("rejects FTP and other protocols", async () => {
      expect(() => validatePublicHttpsUrl("ftp://example.com")).toThrow(
        URLValidationError,
      );
      expect(() => validatePublicHttpsUrl("file:///etc/passwd")).toThrow(
        URLValidationError,
      );
      await expect(isValidPublicHttpsUrl("ftp://example.com")).resolves.toBe(false);
    });
  });

  describe("Localhost Rejection", () => {
    it("rejects localhost variants", async () => {
      const localhostUrls = [
        "https://localhost",
        "https://localhost:3000",
        "https://127.0.0.1",
        "https://0.0.0.0",
        "https://[::1]",
        "https://[::]",
      ];

      for (const url of localhostUrls) {
        expect(() => validatePublicHttpsUrl(url)).toThrow(URLValidationError);
        expect(() => validatePublicHttpsUrl(url)).toThrow(
          "Localhost/loopback URLs are not allowed",
        );
        await expect(isValidPublicHttpsUrl(url)).resolves.toBe(false);
      }
    });
  });

  describe("Private IP Rejection", () => {
    it("rejects 10.0.0.0/8 range", async () => {
      const privateIPs = [
        "https://10.0.0.1",
        "https://10.255.255.255",
        "https://10.123.45.67",
      ];

      for (const url of privateIPs) {
        expect(() => validatePublicHttpsUrl(url)).toThrow(URLValidationError);
        expect(() => validatePublicHttpsUrl(url)).toThrow(
          "Private IP address URLs are not allowed",
        );
        await expect(isValidPublicHttpsUrl(url)).resolves.toBe(false);
      }
    });

    it("rejects 192.168.0.0/16 range", async () => {
      const privateIPs = [
        "https://192.168.0.1",
        "https://192.168.1.1",
        "https://192.168.255.255",
      ];

      for (const url of privateIPs) {
        expect(() => validatePublicHttpsUrl(url)).toThrow(URLValidationError);
        expect(() => validatePublicHttpsUrl(url)).toThrow(
          "Private IP address URLs are not allowed",
        );
        await expect(isValidPublicHttpsUrl(url)).resolves.toBe(false);
      }
    });

    it("rejects 172.16.0.0/12 range", async () => {
      const privateIPs = [
        "https://172.16.0.1",
        "https://172.31.255.255",
        "https://172.20.5.10",
      ];

      for (const url of privateIPs) {
        expect(() => validatePublicHttpsUrl(url)).toThrow(URLValidationError);
        expect(() => validatePublicHttpsUrl(url)).toThrow(
          "Private IP address URLs are not allowed",
        );
        await expect(isValidPublicHttpsUrl(url)).resolves.toBe(false);
      }
    });
  });

  describe("Link-Local Rejection (AWS Metadata)", () => {
    it("rejects 169.254.x.x addresses", async () => {
      const linkLocalUrls = [
        "https://169.254.169.254/latest/meta-data/",
        "https://169.254.0.1",
        "https://169.254.255.255",
      ];

      for (const url of linkLocalUrls) {
        expect(() => validatePublicHttpsUrl(url)).toThrow(URLValidationError);
        expect(() => validatePublicHttpsUrl(url)).toThrow(
          "Private IP address URLs are not allowed",
        );
        await expect(isValidPublicHttpsUrl(url)).resolves.toBe(false);
      }
    });
  });

  describe("Internal TLD Rejection", () => {
    it("rejects .local domains", async () => {
      expect(() => validatePublicHttpsUrl("https://service.local")).toThrow(
        URLValidationError,
      );
      expect(() => validatePublicHttpsUrl("https://service.local")).toThrow(
        "Internal TLD (.local, .internal, .test) URLs are not allowed",
      );
      await expect(isValidPublicHttpsUrl("https://service.local")).resolves.toBe(
        false,
      );
    });

    it("rejects .internal domains", async () => {
      expect(() => validatePublicHttpsUrl("https://service.internal")).toThrow(
        URLValidationError,
      );
      expect(() => validatePublicHttpsUrl("https://service.internal")).toThrow(
        "Internal TLD (.local, .internal, .test) URLs are not allowed",
      );
      await expect(isValidPublicHttpsUrl("https://service.internal")).resolves.toBe(
        false,
      );
    });

    it("rejects .test domains", async () => {
      expect(() => validatePublicHttpsUrl("https://service.test")).toThrow(
        URLValidationError,
      );
      expect(() => validatePublicHttpsUrl("https://service.test")).toThrow(
        "Internal TLD (.local, .internal, .test) URLs are not allowed",
      );
      await expect(isValidPublicHttpsUrl("https://service.test")).resolves.toBe(false);
    });
  });

  describe("Direct IP Address Rejection", () => {
    it("rejects direct public IP addresses", async () => {
      const directIPs = [
        "https://8.8.8.8",
        "https://1.1.1.1",
        "https://203.0.113.42",
      ];

      for (const url of directIPs) {
        expect(() => validatePublicHttpsUrl(url)).toThrow(URLValidationError);
        expect(() => validatePublicHttpsUrl(url)).toThrow(
          "Direct IP addresses are discouraged",
        );
        await expect(isValidPublicHttpsUrl(url)).resolves.toBe(false);
      }
    });
  });

  describe("Malformed URLs", () => {
    it("rejects invalid URL formats", async () => {
      const invalidUrls = ["", "not-a-url", "https", ":///"];

      for (const url of invalidUrls) {
        let threw = false;
        try {
          validatePublicHttpsUrl(url);
        } catch (err) {
          threw = true;
          expect(err).toBeInstanceOf(URLValidationError);
        }
        if (!threw) {
          await expect(isValidPublicHttpsUrl(url)).resolves.toBe(false);
        }
      }
    });
  });

  describe("Edge Cases", () => {
    it("allows URLs with private-IP-like subdomains (string match only)", () => {
      expect(() =>
        validatePublicHttpsUrl("https://10.0.0.1.example.com"),
      ).not.toThrow();
      expect(() =>
        validatePublicHttpsUrl("https://192.168.1.1.example.com"),
      ).not.toThrow();
      expect(() =>
        validatePublicHttpsUrl("https://172.16.0.1.example.com"),
      ).not.toThrow();
    });

    it("handles ports correctly", async () => {
      expect(() => validatePublicHttpsUrl("https://example.com:443")).not.toThrow();
      expect(() => validatePublicHttpsUrl("https://example.com:8443")).not.toThrow();
      await expect(isValidPublicHttpsUrl("https://example.com:443")).resolves.toBe(true);
      await expect(isValidPublicHttpsUrl("https://example.com:8443")).resolves.toBe(
        true,
      );
    });

    it("handles paths and query strings", async () => {
      await expect(
        isValidPublicHttpsUrl("https://example.com/path?param=value"),
      ).resolves.toBe(true);
      await expect(
        isValidPublicHttpsUrl("https://example.com/webhook?token=abc"),
      ).resolves.toBe(true);
    });
  });
});
