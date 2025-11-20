import React from 'react';
import { vi, describe, beforeEach, test, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';

import TenantsPage from '@/app/fm/tenants/page';

const mockUseSession = vi.fn();
const mockUseOrgGuard = vi.fn();
const mockUseSWR = vi.fn();

vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

vi.mock('swr', () => ({
  __esModule: true,
  default: (...args: any[]) => mockUseSWR(...args),
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

vi.mock('@/components/fm/tenants/CreateTenantForm', () => ({
  CreateTenantForm: ({ orgId }: { orgId: string }) => (
    <div data-testid="create-tenant-form">{orgId}</div>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockUseSession.mockReturnValue({ data: { user: {} } });
  mockUseOrgGuard.mockReturnValue({
    orgId: 'org-test',
    guard: null,
    supportBanner: null,
  });
  mockUseSWR.mockReturnValue({
    data: { items: [] },
    isLoading: false,
    mutate: vi.fn(),
    error: null,
  });
});

describe('TenantsPage org guard behavior', () => {
  test('renders guard when no organization selected', () => {
    mockUseOrgGuard.mockReturnValue({
      orgId: null,
      guard: <div data-testid="org-guard" />,
      supportBanner: null,
    });

    render(<TenantsPage />);

    expect(screen.getByTestId('module-tabs')).toHaveTextContent('tenants');
    expect(screen.getByTestId('org-guard')).toBeInTheDocument();
  });

  test('renders tenant layout when organization context exists', () => {
    mockUseOrgGuard.mockReturnValue({
      orgId: 'org-123',
      guard: null,
      supportBanner: <div data-testid="support-banner">banner</div>,
    });

    mockUseSWR.mockReturnValue({
      data: { items: [] },
      isLoading: false,
      mutate: vi.fn(),
      error: null,
    });

    render(<TenantsPage />);

    expect(screen.getByTestId('module-tabs')).toHaveTextContent('tenants');
    expect(screen.getByTestId('support-banner')).toBeInTheDocument();
    expect(screen.getByText(/Tenant Management/i)).toBeInTheDocument();
  });
});
beforeAll(() => {
  (globalThis as unknown as Record<string, unknown>).React = React;
});
