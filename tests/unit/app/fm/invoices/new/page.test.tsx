import React from 'react';
import { describe, beforeEach, beforeAll, test, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

import InvoiceCreationForOpsPage from '@/app/fm/invoices/new/page';

const mockUseFmOrgGuard = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

type InvoiceFormValues = Record<string, string | number | boolean | null | object | undefined>;
type SubmitHandler = (values: InvoiceFormValues, event?: Event) => Promise<void> | void;

let capturedSubmit: SubmitHandler | undefined;

vi.mock('@/hooks/fm/useFmOrgGuard', () => ({
  useFmOrgGuard: () => mockUseFmOrgGuard(),
}));

vi.mock('@/components/fm/ModuleViewTabs', () => ({
  __esModule: true,
  default: ({ moduleId }: { moduleId: string }) => <div data-testid="module-tabs">{moduleId}</div>,
}));

vi.mock('@/i18n/useAutoTranslator', () => ({
  useAutoTranslator:
    () =>
    (fallback: string) =>
      fallback,
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: vi.fn(),
    handleSubmit: (cb: SubmitHandler) => {
      capturedSubmit = cb;
      return vi.fn();
    },
    reset: vi.fn(),
    formState: {
      errors: {},
      isSubmitting: false,
    },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  capturedSubmit = undefined;
  mockUseFmOrgGuard.mockReturnValue({
    hasOrgContext: true,
    guard: null,
    supportBanner: <div data-testid="support-banner">support</div>,
    orgId: 'org-test',
  });
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
  }) as typeof fetch;
});

afterEach(() => {
  vi.resetModules();
});

describe('InvoiceCreationForOpsPage org guard behavior', () => {
  test('renders guard when organization context missing', () => {
    mockUseFmOrgGuard.mockReturnValue({
      hasOrgContext: false,
      guard: <div data-testid="org-guard" />,
      supportBanner: null,
      orgId: null,
    });

    render(<InvoiceCreationForOpsPage />);

    expect(screen.getByTestId('org-guard')).toBeInTheDocument();
  });

  test('renders finance layout and submits using tenant header', async () => {
    render(<InvoiceCreationForOpsPage />);

    expect(screen.getByTestId('module-tabs')).toHaveTextContent('finance');
    expect(screen.getByTestId('support-banner')).toBeInTheDocument();
    expect(capturedSubmit).toBeDefined();

    await act(async () => {
      await capturedSubmit?.(
        {
          customer: 'ACME',
          project: 'Renewal',
          amount: '1000',
          billingContact: 'ops@acme.com',
          narrative: 'Monthly retainer',
        },
        {
          nativeEvent: {
            submitter: { dataset: { action: 'send' } },
          },
        },
      );
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/invoices/send', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({
        'Content-Type': 'application/json',
        'x-tenant-id': 'org-test',
      }),
    }));
    expect(toastSuccess).toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });
});

beforeAll(() => {
  (globalThis as unknown as Record<string, unknown>).React = React;
});
