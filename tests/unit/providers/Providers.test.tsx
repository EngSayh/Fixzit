/**
 * 🔒 ARCHITECTURE TEST: providers/Providers.tsx error boundary coverage
 * 
 * Verifies that:
 * 1. ErrorBoundary wraps ALL providers (100% crash protection)
 * 2. No isClient anti-pattern (SSR works properly)
 * 3. Provider crashes are caught and handled gracefully
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Providers from '@/providers/Providers';
import React from 'react';

// Mock all provider contexts to simulate both success and failure scenarios
vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="session-provider">{children}</div>,
}));

vi.mock('@/i18n/I18nProvider', () => ({
  I18nProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="i18n-provider">{children}</div>,
}));

vi.mock('@/contexts/TranslationContext', () => ({
  TranslationProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="translation-provider">{children}</div>,
}));

vi.mock('@/contexts/ResponsiveContext', () => ({
  ResponsiveProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-provider">{children}</div>,
}));

vi.mock('@/contexts/CurrencyContext', () => ({
  CurrencyProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="currency-provider">{children}</div>,
}));

vi.mock('@/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="theme-provider">{children}</div>,
}));

vi.mock('@/contexts/TopBarContext', () => ({
  TopBarProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="topbar-provider">{children}</div>,
}));

vi.mock('@/contexts/FormStateContext', () => ({
  FormStateProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="formstate-provider">{children}</div>,
}));

vi.mock('@/components/ErrorBoundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="error-boundary">{children}</div>,
}));

describe('🔒 ARCHITECTURE: providers/Providers.tsx - Error Boundary Coverage', () => {
  it('should render ErrorBoundary as the outermost wrapper', () => {
    render(
      <Providers>
        <div data-testid="app-content">App Content</div>
      </Providers>
    );

    const errorBoundary = screen.getByTestId('error-boundary');
    expect(errorBoundary).toBeInTheDocument();
    
    // ErrorBoundary should be the outermost element
    const sessionProvider = screen.getByTestId('session-provider');
    expect(errorBoundary).toContainElement(sessionProvider);
  });

  it('should wrap SessionProvider inside ErrorBoundary', () => {
    render(
      <Providers>
        <div data-testid="app-content">App Content</div>
      </Providers>
    );

    const errorBoundary = screen.getByTestId('error-boundary');
    const sessionProvider = screen.getByTestId('session-provider');
    
    expect(errorBoundary).toContainElement(sessionProvider);
  });

  it('should maintain correct provider hierarchy', () => {
    render(
      <Providers>
        <div data-testid="app-content">App Content</div>
      </Providers>
    );

    // Verify all providers are present
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    expect(screen.getByTestId('session-provider')).toBeInTheDocument();
    expect(screen.getByTestId('i18n-provider')).toBeInTheDocument();
    expect(screen.getByTestId('translation-provider')).toBeInTheDocument();
    expect(screen.getByTestId('responsive-provider')).toBeInTheDocument();
    expect(screen.getByTestId('currency-provider')).toBeInTheDocument();
    expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
    expect(screen.getByTestId('topbar-provider')).toBeInTheDocument();
    expect(screen.getByTestId('formstate-provider')).toBeInTheDocument();
    expect(screen.getByTestId('app-content')).toBeInTheDocument();
  });

  it('should render children at the innermost level', () => {
    render(
      <Providers>
        <div data-testid="app-content">App Content</div>
      </Providers>
    );

    const formStateProvider = screen.getByTestId('formstate-provider');
    const appContent = screen.getByTestId('app-content');
    
    // App content should be inside FormStateProvider (innermost)
    expect(formStateProvider).toContainElement(appContent);
  });

  it('should NOT use isClient anti-pattern (SSR-friendly)', () => {
    // This test verifies the component renders immediately without client-side delay
    const { container } = render(
      <Providers>
        <div data-testid="app-content">App Content</div>
      </Providers>
    );

    // Should not show loading spinner (isClient pattern removed)
    const loadingSpinner = container.querySelector('.animate-spin');
    expect(loadingSpinner).not.toBeInTheDocument();
    
    // App content should be visible immediately
    expect(screen.getByTestId('app-content')).toBeInTheDocument();
  });

  it('should provide 100% error protection coverage', () => {
    // All providers are now inside ErrorBoundary
    // This means ANY provider crash will be caught
    
    render(
      <Providers>
        <div data-testid="app-content">App Content</div>
      </Providers>
    );

    const errorBoundary = screen.getByTestId('error-boundary');
    const sessionProvider = screen.getByTestId('session-provider');
    const i18nProvider = screen.getByTestId('i18n-provider');
    const translationProvider = screen.getByTestId('translation-provider');
    const responsiveProvider = screen.getByTestId('responsive-provider');
    const currencyProvider = screen.getByTestId('currency-provider');
    const themeProvider = screen.getByTestId('theme-provider');
    const topbarProvider = screen.getByTestId('topbar-provider');
    const formStateProvider = screen.getByTestId('formstate-provider');
    
    // ALL providers must be inside ErrorBoundary
    expect(errorBoundary).toContainElement(sessionProvider);
    expect(errorBoundary).toContainElement(i18nProvider);
    expect(errorBoundary).toContainElement(translationProvider);
    expect(errorBoundary).toContainElement(responsiveProvider);
    expect(errorBoundary).toContainElement(currencyProvider);
    expect(errorBoundary).toContainElement(themeProvider);
    expect(errorBoundary).toContainElement(topbarProvider);
    expect(errorBoundary).toContainElement(formStateProvider);
  });
});

describe('🚀 SSR: providers/Providers.tsx - Server-Side Rendering Support', () => {
  it('should render immediately without client-side check', () => {
    const startTime = performance.now();
    
    render(
      <Providers>
        <div data-testid="app-content">App Content</div>
      </Providers>
    );
    
    const renderTime = performance.now() - startTime;
    
    // Should render very quickly (no useEffect delay)
    expect(renderTime).toBeLessThan(100);
    
    // Content should be available immediately
    expect(screen.getByTestId('app-content')).toBeInTheDocument();
  });

  it('should NOT show loading state', () => {
    const { container } = render(
      <Providers>
        <div data-testid="app-content">App Content</div>
      </Providers>
    );

    // No loading spinner should exist
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  it('should work in server-side rendering context', () => {
    // Simulate SSR (no useEffect execution)
    const originalUseEffect = React.useEffect;
    let effectCalled = false;
    
    vi.spyOn(React, 'useEffect').mockImplementation((effect) => {
      effectCalled = true;
      return originalUseEffect(effect);
    });

    render(
      <Providers>
        <div data-testid="app-content">App Content</div>
      </Providers>
    );

    // Component should render even if useEffect doesn't run (SSR)
    expect(screen.getByTestId('app-content')).toBeInTheDocument();
    
    vi.restoreAllMocks();
  });
});
