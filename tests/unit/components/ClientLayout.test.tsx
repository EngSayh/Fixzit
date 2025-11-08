/**
 * Unit Test: ClientLayout Component
 * Tests authentication handling, route protection, and layout rendering
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ClientLayout from '@/components/ClientLayout';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  })),
}));

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: null,
    status: 'unauthenticated',
  })),
}));

// Mock translation context
vi.mock('@/contexts/TranslationContext', () => ({
  useTranslation: vi.fn(() => ({
    language: 'en',
    isRTL: false,
    t: (key: string) => key,
  })),
}));

// Mock dynamic imports
vi.mock('next/dynamic', () => ({
  default: (fn: () => Promise<unknown>) => {
    const Component = () => null;
    Component.displayName = 'DynamicComponent';
    return Component;
  },
}));

describe('ClientLayout', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render children', () => {
    render(
      <ClientLayout>
        <div data-testid="test-content">Test Content</div>
      </ClientLayout>
    );

    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('should handle unauthenticated state', async () => {
    const { useSession } = await import('next-auth/react');
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    render(
      <ClientLayout>
        <div>Content</div>
      </ClientLayout>
    );

    // Should render without crashing
    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  it('should handle authenticated state', async () => {
    const { useSession } = await import('next-auth/react');
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: { user: { id: '123', role: 'ADMIN' } },
      status: 'authenticated',
    });

    render(
      <ClientLayout>
        <div>Protected Content</div>
      </ClientLayout>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('should handle loading state', async () => {
    const { useSession } = await import('next-auth/react');
    (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      status: 'loading',
    });

    render(
      <ClientLayout>
        <div>Content</div>
      </ClientLayout>
    );

    // Should render without errors during loading
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should handle RTL language', async () => {
    const { useTranslation } = await import('@/contexts/TranslationContext');
    (useTranslation as ReturnType<typeof vi.fn>).mockReturnValue({
      language: 'ar',
      isRTL: true,
      t: (key: string) => key,
    });

    render(
      <ClientLayout>
        <div>محتوى</div>
      </ClientLayout>
    );

    // Should render RTL content
    expect(screen.getByText('محتوى')).toBeInTheDocument();
  });

  it('should not crash when SessionProvider is unavailable', () => {
    const { useSession } = require('next-auth/react');
    (useSession as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('SessionProvider not available');
    });

    // Should handle the error gracefully
    expect(() => {
      render(
        <ClientLayout>
          <div>Content</div>
        </ClientLayout>
      );
    }).not.toThrow();
  });
});
