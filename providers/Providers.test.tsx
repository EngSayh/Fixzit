/**
 * Test framework: Jest with React Testing Library (RTL) + JSDOM
 * If this project uses Vitest, replace jest import aliases with vitest and keep RTL usage.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import Providers from './Providers';

// Mock nested providers and ErrorBoundary to isolate Providers behavior.
// We mock minimal render output to assert nesting and prop passing.
jest.mock('@/contexts/ResponsiveContext', () => ({
  ResponsiveProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-provider">{children}</div>
  ),
}));

jest.mock('@/contexts/TranslationContext', () => ({
  TranslationProvider: ({ children, initialLocale }: { children: React.ReactNode; initialLocale?: string }) => (
    <div data-testid="translation-provider" data-locale={initialLocale || ''}>{children}</div>
  ),
}));

jest.mock('@/contexts/CurrencyContext', () => ({
  CurrencyProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="currency-provider">{children}</div>
  ),
}));

jest.mock('@/contexts/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

// ErrorBoundary should render children in happy path; errors tested via throw
const ConsoleError = console.error;
beforeAll(() => {
  // Silence expected error boundary logs in tests that trigger errors
  console.error = (...args: any[]) => {
    const msg = args[0];
    if (typeof msg === 'string' && (msg.includes('ErrorBoundary') || msg.includes('The above error'))) {
      return;
    }
    return (ConsoleError as any)(...args);
  };
});
afterAll(() => {
  console.error = ConsoleError;
});

jest.mock('@/components/ErrorBoundary', () => {
  const React = require('react');
  const Fallback = ({ error }: { error?: Error }) => (
    <div role="alert" data-testid="error-fallback">
      {error ? `Error: ${error.message}` : 'Error occurred'}
    </div>
  );
  class MockErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error }> {
    constructor(props: any) {
      super(props);
      this.state = { hasError: false, error: undefined };
    }
    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }
    componentDidCatch() {}
    render() {
      if (this.state.hasError) {
        return <Fallback error={this.state.error} />;
      }
      return <div data-testid="error-boundary">{this.props.children}</div>;
    }
  }
  return { __esModule: true, default: MockErrorBoundary };
});

// Utility component to simulate rendering children and optionally throw
function Child({ label = 'Child', shouldThrow = false }: { label?: string; shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Boom');
  }
  return <div data-testid="child">{label}</div>;
}

describe('Providers', () => {
  // The Providers component sets isClient in useEffect, so the first paint may show a loading UI.
  // In RTL with JSDOM and Jest fake timers, we can advance effects to move past initial non-client render.

  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('renders loading UI before client hydration', () => {
    render(
      <Providers>
        <Child />
      </Providers>
    );

    // Before effects run, loading UI should be visible
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // After running effects, loading UI should disappear
    jest.runAllTimers();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  test('renders children after client hydration and nests providers correctly (happy path)', () => {
    render(
      <Providers>
        <Child label="Happy child" />
      </Providers>
    );
    // Advance effects to flip isClient
    jest.runAllTimers();

    // Children rendered
    expect(screen.getByTestId('child')).toHaveTextContent('Happy child');

    // Provider nesting presence
    expect(screen.getByTestId('responsive-provider')).toBeInTheDocument();
    expect(screen.getByTestId('translation-provider')).toBeInTheDocument();
    expect(screen.getByTestId('currency-provider')).toBeInTheDocument();
    expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();

    // Nesting order check via DOM hierarchy: each wrapper should contain the child
    const responsive = screen.getByTestId('responsive-provider');
    const translation = screen.getByTestId('translation-provider');
    const currency = screen.getByTestId('currency-provider');
    const theme = screen.getByTestId('theme-provider');
    const errorBoundary = screen.getByTestId('error-boundary');
    const child = screen.getByTestId('child');

    expect(responsive).toContainElement(translation);
    expect(translation).toContainElement(currency);
    expect(currency).toContainElement(theme);
    expect(theme).toContainElement(errorBoundary);
    expect(errorBoundary).toContainElement(child);
  });

  test('passes initialLocale through to TranslationProvider', () => {
    render(
      <Providers>
        <Child />
      </Providers>
    );
    jest.runAllTimers();

    const translation = screen.getByTestId('translation-provider');
    expect(translation).toHaveAttribute('data-locale', 'fr');
  });

  test('defaults initialLocale to empty when not provided', () => {
    render(
      <Providers>
        <Child />
      </Providers>
    );
    jest.runAllTimers();

    const translation = screen.getByTestId('translation-provider');
    // Our mock sets empty string when undefined
    expect(translation.getAttribute('data-locale')).toBe('');
  });

  test('shows error fallback when a child throws (ErrorBoundary behavior)', () => {
    render(
      <Providers>
        <Child shouldThrow />
      </Providers>
    );
    jest.runAllTimers();

    // Our mocked ErrorBoundary renders role="alert" with error message
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent('Error: Boom');
  });

  test('maintains SSR safety by not rendering children pre-client', () => {
    // Render without advancing timers; the child should not be present
    render(
      <Providers>
        <Child />
      </Providers>
    );

    expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
