import React from 'react';
import { describe, beforeEach, test, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import NewExpensePage from '@/app/fm/finance/expenses/new/page';

const mockUseOrgGuard = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/contexts/FormStateContext', () => ({
  useFormState: () => ({
    registerForm: vi.fn(),
    unregisterForm: vi.fn(),
  }),
}));

vi.mock('@/contexts/TranslationContext', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback?: string) => fallback ?? _key,
  }),
}));

vi.mock('@/components/fm/useFmOrgGuard', () => ({
  useFmOrgGuard: () => mockUseOrgGuard(),
}));

vi.mock('@/components/fm/ModuleViewTabs', () => ({
  __esModule: true,
  default: ({ moduleId }: { moduleId: string }) => (
    <div data-testid="module-tabs">{moduleId}</div>
  ),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('NewExpensePage org guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOrgGuard.mockReturnValue({
      hasOrgContext: true,
      orgId: 'org-test',
      guard: null,
      supportBanner: <div data-testid="support-banner">banner</div>,
    });
  });

  test('returns guard when no org context is present', async () => {
    mockUseOrgGuard.mockReturnValue({
      hasOrgContext: false,
      orgId: null,
      guard: <div data-testid="org-guard" />,
      supportBanner: null,
    });

    await act(async () => {
      render(<NewExpensePage />);
    });

    expect(screen.getByTestId('module-tabs')).toHaveTextContent('finance');
    expect(screen.getByTestId('org-guard')).toBeInTheDocument();
  });

  test('renders expense form layout when org context exists', async () => {
    await act(async () => {
      render(<NewExpensePage />);
    });

    expect(screen.getByTestId('module-tabs')).toHaveTextContent('finance');
    expect(screen.getByTestId('support-banner')).toBeInTheDocument();
    expect(screen.getByText(/New Expense/i)).toBeInTheDocument();
  });
});
