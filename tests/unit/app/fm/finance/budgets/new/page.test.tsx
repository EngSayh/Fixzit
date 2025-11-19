import React from 'react';
import { describe, beforeEach, test, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import NewBudgetPage from '@/app/fm/finance/budgets/new/page';

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

vi.mock('@/hooks/fm/useOrgGuard', () => ({
  useOrgGuard: () => mockUseOrgGuard(),
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

describe('NewBudgetPage org guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOrgGuard.mockReturnValue({
      orgId: 'org-test',
      guard: null,
      supportBanner: <div data-testid="support-banner">banner</div>,
    });
  });

  test('renders ModuleViewTabs + guard when organization missing', async () => {
    mockUseOrgGuard.mockReturnValue({
      orgId: null,
      guard: <div data-testid="org-guard" />,
      supportBanner: null,
    });

    await act(async () => {
      render(<NewBudgetPage />);
    });

    expect(screen.getByTestId('module-tabs')).toHaveTextContent('finance');
    expect(screen.getByTestId('org-guard')).toBeInTheDocument();
  });

  test('renders finance form when organization is available', async () => {
    await act(async () => {
      render(<NewBudgetPage />);
    });

    expect(screen.getByTestId('module-tabs')).toHaveTextContent('finance');
    expect(screen.getByTestId('support-banner')).toBeInTheDocument();
    expect(screen.getByText(/Create Budget/i)).toBeInTheDocument();
  });
});
