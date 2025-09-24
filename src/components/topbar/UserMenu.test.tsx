import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next/navigation useRouter
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock })
}));

// Mock TopBarContext hook
vi.mock('@/src/contexts/TopBarContext', () => ({
  useTopBar: vi.fn(() => ({ isRTL: false }))
}));

// Mock lucide-react icons to simple spans to avoid SVG noise
vi.mock('lucide-react', () => ({
  User: (props: any) => <span data-testid="icon-user" {...props} />,
  ChevronDown: (props: any) => <span data-testid="icon-chevron" {...props} />,
  Settings: (props: any) => <span data-testid="icon-settings" {...props} />,
  LogOut: (props: any) => <span data-testid="icon-logout" {...props} />
}));

// Use the component under test
// If the component's actual path differs, update this import accordingly.
import { UserMenu } from './UserMenu';

// Helpers
const openMenu = async () => {
  const button = screen.getByRole('button', { name: /user menu/i });
  fireEvent.click(button);
  await screen.findByText(/profile/i);
};

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch to a fresh mock for each test
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true })
    });
    // Spy on localStorage.clear
    vi.spyOn(window.localStorage.__proto__, 'clear').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the toggle button with icons', () => {
    render(<UserMenu />);
    expect(screen.getByRole('button', { name: /user menu/i })).toBeInTheDocument();
    expect(screen.getByTestId('icon-user')).toBeInTheDocument();
    expect(screen.getByTestId('icon-chevron')).toBeInTheDocument();
  });

  it('toggles the dropdown menu open and closed', async () => {
    render(<UserMenu />);
    const toggle = screen.getByRole('button', { name: /user menu/i });

    // Initially closed
    expect(screen.queryByText(/profile/i)).not.toBeInTheDocument();

    // Open
    fireEvent.click(toggle);
    expect(await screen.findByText(/profile/i)).toBeInTheDocument();

    // Close by clicking toggle again
    fireEvent.click(toggle);
    await waitFor(() => {
      expect(screen.queryByText(/profile/i)).not.toBeInTheDocument();
    });
  });

  it('closes the menu when "Profile" is clicked', async () => {
    render(<UserMenu />);
    await openMenu();

    const profileLink = screen.getByRole('link', { name: /profile/i });
    fireEvent.click(profileLink);

    await waitFor(() => {
      expect(screen.queryByText(/profile/i)).not.toBeInTheDocument();
    });
  });

  it('closes the menu when "Settings" is clicked', async () => {
    render(<UserMenu />);
    await openMenu();

    const settingsLink = screen.getByRole('link', { name: /settings/i });
    fireEvent.click(settingsLink);

    await waitFor(() => {
      expect(screen.queryByText(/settings/i)).not.toBeInTheDocument();
    });
  });

  it('positions menu to the right when isRTL=false', async () => {
    // Default mock returns isRTL: false
    render(<UserMenu />);
    await openMenu();

    const menu = screen.getByText(/profile/i).closest('div');
    expect(menu).toHaveClass('right-0');
    expect(menu).not.toHaveClass('left-0');
  });

  it('positions menu to the left when isRTL=true', async () => {
    const { useTopBar } = await import('@/src/contexts/TopBarContext');
    (useTopBar as unknown as vi.Mock).mockReturnValue({ isRTL: true });

    render(<UserMenu />);
    await openMenu();

    const menu = screen.getByText(/profile/i).closest('div');
    expect(menu).toHaveClass('left-0');
    expect(menu).not.toHaveClass('right-0');
  });

  it('calls logout endpoint and redirects to /login on success', async () => {
    render(<UserMenu />);
    await openMenu();

    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      expect(window.localStorage.clear).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith('/login');
    });
  });

  it('still redirects to /login when logout fails', async () => {
    (globalThis as any).fetch = vi.fn().mockRejectedValue(new Error('network'));

    // Silence console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<UserMenu />);
    await openMenu();

    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutBtn);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/login');
    });
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('sends logout with proper options (POST + include credentials)', async () => {
    render(<UserMenu />);
    await openMenu();

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const call = (global.fetch as vi.Mock).mock.calls[0];
      expect(call[0]).toBe('/api/auth/logout');
      expect(call[1]).toMatchObject({ method: 'POST', credentials: 'include' });
    });
  });
});