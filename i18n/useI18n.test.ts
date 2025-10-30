/**
 * Tests for useI18n hook
 *
 * Framework/Libraries:
 * - Testing framework: Vitest or Jest (aligns with project configuration)
 * - Utilities: @testing-library/react (renderHook, act)
 *
 * These tests validate:
 * - Context requirement (throws without provider)
 * - Key lookup with nested dot paths
 * - Fallback to key for missing or non-string values
 * - Variable interpolation (strings and numbers, repeated tokens)
 * - Unknown placeholders remain intact
 * - t function identity stability with same dict reference and change on new dict reference
 */
import React, { PropsWithChildren, useMemo, useState } from 'react';
import { renderHook, act } from '@testing-library/react';
import { useI18n } from './useI18n';
import { I18nContext } from './I18nProvider';

import { vi } from 'vitest';
type Dict = Record<string, unknown>;

function TestI18nProvider({
  children,
  initialDict,
  initialLocale = 'en',
}: PropsWithChildren<{ initialDict: Dict; initialLocale?: string }>) {
  const [dict, setDict] = useState<Dict>(initialDict);
  const [locale, setLocale] = useState<string>(initialLocale);

  const value = useMemo(
    () => ({
      dict,
      locale,
      setLocale,
      // Expose a testing-only setter via context cast if needed by consumers in future
      // but keep it out of the public shape used in production.
    }),
    [dict, locale]
  );

  // For tests that need to update dict, expose a portal on window (scoped) to update it.
  // Safer approach: return a wrapper factory with external setter; we'll prefer wrapperProps pattern instead.
  return React.createElement(
    I18nContext.Provider,
    { value: value as any },
    children
  );
}

describe('useI18n', () => {
  it('throws if used without I18nProvider', () => {
    // Suppress console error from React error boundary
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useI18n())).toThrow('useI18n must be used within <I18nProvider />');
    spy.mockRestore();
  });

  it('returns provided dict via context and a t function', () => {
    const dict = { greeting: 'Hello' };
    const wrapper: React.FC<PropsWithChildren> = ({ children }) =>
      React.createElement(
        I18nContext.Provider,
        { value: { dict, locale: 'en', setLocale: () => {} } as any },
        children
      );
    const { result } = renderHook(() => useI18n(), { wrapper });
    expect(result.current.t).toBeInstanceOf(Function);
    expect(result.current.dict).toBe(dict);
    expect(result.current.locale).toBe('en');
  });

  it('resolves simple keys and nested dot-path keys', () => {
    const dict = {
      hello: 'Hello',
      nested: { deep: { value: 'Deep Value' } },
    };
    const wrapper: React.FC<PropsWithChildren> = ({ children }) =>
      React.createElement(
        I18nContext.Provider,
        { value: { dict, locale: 'en', setLocale: () => {} } as any },
        children
      );
    const { result } = renderHook(() => useI18n(), { wrapper });

    expect(result.current.t('hello')).toBe('Hello');
    expect(result.current.t('nested.deep.value')).toBe('Deep Value');
  });

  it('falls back to key when missing in dict', () => {
    const dict = { hello: 'Hello' };
    const wrapper: React.FC<PropsWithChildren> = ({ children }) =>
      React.createElement(
        I18nContext.Provider,
        { value: { dict, locale: 'en', setLocale: () => {} } as any },
        children
      );
    const { result } = renderHook(() => useI18n(), { wrapper });

    expect(result.current.t('missing.key')).toBe('missing.key');
  });

  it('falls back to key when the resolved value is not a string (e.g., object, number, boolean)', () => {
    const dict = {
      obj: { nested: { a: 1 } },
      num: 42,
      bool: true,
    };
    const wrapper: React.FC<PropsWithChildren> = ({ children }) =>
      React.createElement(
        I18nContext.Provider,
        { value: { dict, locale: 'en', setLocale: () => {} } as any },
        children
      );
    const { result } = renderHook(() => useI18n(), { wrapper });

    expect(result.current.t('obj')).toBe('obj');
    expect(result.current.t('num')).toBe('num');
    expect(result.current.t('bool')).toBe('bool');
  });

  it('returns the raw string when no interpolation vars are provided', () => {
    const dict = { welcome: 'Welcome, {name}!' };
    const wrapper: React.FC<PropsWithChildren> = ({ children }) =>
      React.createElement(
        I18nContext.Provider,
        { value: { dict, locale: 'en', setLocale: () => {} } as any },
        children
      );
    const { result } = renderHook(() => useI18n(), { wrapper });

    expect(result.current.t('welcome')).toBe('Welcome, {name}!');
  });

  it('interpolates provided variables (strings and numbers), including repeated tokens', () => {
    const dict = {
      greet: 'Hello, {name}! You have {count} message(s). Bye, {name}.',
    };
    const wrapper: React.FC<PropsWithChildren> = ({ children }) =>
      React.createElement(
        I18nContext.Provider,
        { value: { dict, locale: 'en', setLocale: () => {} } as any },
        children
      );
    const { result } = renderHook(() => useI18n(), { wrapper });

    expect(result.current.t('greet', { name: 'Alice', count: 3 })).toBe(
      'Hello, Alice! You have 3 message(s). Bye, Alice.'
    );
  });

  it('leaves unknown placeholders intact when vars do not provide a value', () => {
    const dict = { msg: 'Hi {name}, your {thing} is ready.' };
    const wrapper: React.FC<PropsWithChildren> = ({ children }) =>
      React.createElement(
        I18nContext.Provider,
        { value: { dict, locale: 'en', setLocale: () => {} } as any },
        children
      );
    const { result } = renderHook(() => useI18n(), { wrapper });

    expect(result.current.t('msg', { name: 'Bob' })).toBe('Hi Bob, your {thing} is ready.');
  });

  it('coerces non-string interpolation values using String()', () => {
    const dict = { msg: 'Value: {val}' };
    const wrapper: React.FC<PropsWithChildren> = ({ children }) =>
      React.createElement(
        I18nContext.Provider,
        { value: { dict, locale: 'en', setLocale: () => {} } as any },
        children
      );
    const { result } = renderHook(() => useI18n(), { wrapper });

    expect(result.current.t('msg', { val: 0 })).toBe('Value: 0');
    expect(result.current.t('msg', { val: null as unknown as number })).toBe('Value: null');
    expect(result.current.t('msg', { val: undefined as unknown as number })).toBe('Value: undefined');
    expect(result.current.t('msg', { val: { a: 1 } as unknown as number })).toBe('Value: [object Object]');
  });

  it('t function identity is stable when dict reference is unchanged, and changes when dict reference updates', () => {
    const initialDict = { a: 'A' };
    const Wrapper: React.FC<PropsWithChildren<{ dict: Dict }>> = ({ children, dict }) =>
      React.createElement(
        I18nContext.Provider,
        { value: { dict, locale: 'en', setLocale: () => {} } as any },
        children
      );

    const { result, rerender } = renderHook(() => useI18n(), {
      wrapper: (p: any) => React.createElement(Wrapper, p),
      initialProps: { dict: initialDict },
    });

    const t1 = result.current.t;

    // Rerender with same dict reference: identity should be stable
    rerender({ dict: initialDict });
    const t2 = result.current.t;
    expect(t2).toBe(t1);

    // Rerender with a new dict reference: identity should change due to useMemo deps
    const newDict = { a: 'Alpha' };
    rerender({ dict: newDict });
    const t3 = result.current.t;
    expect(t3).not.toBe(t2);

    // Validate new dict is used
    expect(result.current.t('a')).toBe('Alpha');
  });
});
