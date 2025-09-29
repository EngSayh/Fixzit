/**
 * Tests for vitest.config.ts
 * Framework: Vitest
 * These tests focus on validating key aspects of the Vitest configuration.
 * If the repository's PR modified the vitest config, these assertions will help guard those changes.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import viteConfig from '../vitest.config';

type AnyConfig = any;
const cfg: AnyConfig = (viteConfig as any);

function toArray<T>(v: unknown): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? (v as T[]) : [v as T];
}

function flattenToStrings(v: unknown): string[] {
  return toArray<string>(v).map(String);
}

function hasTestOrSpec(patterns: string[]): boolean {
  return patterns.some((p) => p.includes('test') || p.includes('spec'));
}

function resolveSetupPaths(paths: string[], alias: any): string[] {
  const root = process.cwd();
  const entries: { find: string; replacement: string }[] = Array.isArray(alias)
    ? alias
    : alias && typeof alias === 'object'
      ? Object.entries(alias).map(([find, replacement]) => ({ find, replacement: String(replacement) }))
      : [];
  return paths
    .filter(Boolean)
    .map((p) => String(p))
    .map((p) => {
      const entry = entries.find((e) => p.startsWith(e.find));
      if (entry) {
        return path.resolve(p.replace(entry.find, entry.replacement));
      }
      if (
        p.startsWith('.') ||
        p.startsWith('/') ||
        p.startsWith('src/') ||
        p.startsWith('tests') ||
        p.startsWith('__tests__')
      ) {
        return path.resolve(root, p);
      }
      return ''; // not a project-relative path; skip existence check
    })
    .filter(Boolean);
}

describe('vitest.config.ts', () => {
  it('exports a configuration object', () => {
    expect(cfg && typeof cfg).toBe('object');
  });

  it('defines a supported test environment when set', () => {
    const env = cfg?.test?.environment;
    if (env != null) {
      expect(['node', 'jsdom', 'happy-dom', 'edge-runtime']).toContain(env);
    }
    if (env == null) {
      expect(env).toBeUndefined();
    }
  });

  it('declares include patterns containing "test" or "spec" when provided', () => {
    const include = flattenToStrings(cfg?.test?.include);
    if (include.length) {
      expect(hasTestOrSpec(include)).toBe(true);
    } else {
      expect(include).toEqual([]);
    }
  });

  it('excludes common non-test directories when provided', () => {
    const exclude = flattenToStrings(cfg?.test?.exclude);
    if (exclude.length) {
      expect(exclude.some((p) => p.includes('node_modules'))).toBe(true);
      // allow either "dist" or "build"
      expect(exclude.some((p) => p.includes('dist') || p.includes('build'))).toBe(true);
    } else {
      expect(exclude).toEqual([]);
    }
  });

  it('configures coverage with a supported provider and sane thresholds when provided', () => {
    const cov = cfg?.test?.coverage;
    if (cov) {
      const provider = cov.provider;
      if (provider != null) {
        expect(['v8', 'istanbul', 'c8']).toContain(provider);
      }
      const thresholds = cov.thresholds ?? cov.threshold ?? cov;
      (['lines', 'functions', 'branches', 'statements'] as const).forEach((k) => {
        const v = thresholds?.[k];
        if (typeof v === 'number') {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(100);
        }
      });
      const reporter = flattenToStrings(cov.reporter);
      if (reporter.length) {
        expect(reporter.some((r) => ['text', 'lcov', 'html', 'json'].includes(r))).toBe(true);
      }
    } else {
      expect(cov).toBeUndefined();
    }
  });

  it('has a valid alias configuration when provided', () => {
    const alias = cfg?.resolve?.alias;
    if (alias) {
      if (Array.isArray(alias)) {
        alias.forEach((entry: any) => {
          expect(entry).toHaveProperty('find');
          expect(entry).toHaveProperty('replacement');
          expect(typeof entry.find === 'string' || entry.find instanceof RegExp).toBe(true);
          expect(typeof entry.replacement).toBe('string');
        });
      } else {
        expect(typeof alias).toBe('object');
        // if '@' exists, ensure it maps to a string path
        if (Object.prototype.hasOwnProperty.call(alias, '@')) {
          expect(typeof alias['@']).toBe('string');
        }
      }
    } else {
      expect(alias).toBeUndefined();
    }
  });

  it('points setupFiles to resolvable project files when they look project-relative', () => {
    const setups = toArray<string>(cfg?.test?.setupFiles);
    if (setups.length) {
      const resolved = resolveSetupPaths(setups, cfg?.resolve?.alias);
      resolved.forEach((p) => {
        if (p) {
          expect(fs.existsSync(p)).toBe(true);
        }
      });
    } else {
      expect(setups).toEqual([]);
    }
  });
});