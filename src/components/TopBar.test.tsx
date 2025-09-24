/**
 * Testing library/framework: Jest + @testing-library/react
 * If the project uses Vitest, these tests should largely work by replacing jest.* with vi.*.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock TopBarContext hook to control isRTL value
jest.mock('@/src/contexts/TopBarContext', () => ({
  useTopBar: jest.fn(),
}));

// Mock child components to simple sentinels so we only validate TopBar composition
jest.mock('./topbar/AppSwitcher', () => ({
  AppSwitcher: () => <div data-testid="AppSwitcher">AppSwitcher</div>,
}));
jest.mock('./topbar/GlobalSearch', () => ({
  GlobalSearch: () => <div data-testid="GlobalSearch">GlobalSearch</div>,
}));
jest.mock('./topbar/LanguageSelector', () => ({
  LanguageSelector: () => <div data-testid="LanguageSelector">LanguageSelector</div>,
}));
jest.mock('./topbar/QuickActions', () => ({
  QuickActions: () => <div data-testid="QuickActions">QuickActions</div>,
}));
jest.mock('./topbar/Notifications', () => ({
  Notifications: () => <div data-testid="Notifications">Notifications</div>,
}));
jest.mock('./topbar/UserMenu', () => ({
  UserMenu: () => <div data-testid="UserMenu">UserMenu</div>,
}));
jest.mock('./topbar/TopMegaMenu', () => ({
  TopMegaMenu: () => <div data-testid="TopMegaMenu">TopMegaMenu</div>,
}));

// Import after mocks
import TopBar from './TopBar';
import { useTopBar } from '@/src/contexts/TopBarContext';

const mockedUseTopBar = useTopBar as jest.Mock;

describe('TopBar', () => {
  beforeEach(() => {
    mockedUseTopBar.mockReset();
  });

  test('renders brand text and all primary child modules (happy path, LTR)', () => {
    mockedUseTopBar.mockReturnValue({ isRTL: false });

    render(<TopBar role="admin" />);

    // Brand
    expect(screen.getByText('FIXZIT ENTERPRISE')).toBeInTheDocument();

    // Primary modules
    expect(screen.getByTestId('AppSwitcher')).toBeInTheDocument();

    expect(screen.getByTestId('GlobalSearch')).toBeInTheDocument();

    expect(screen.getByTestId('QuickActions')).toBeInTheDocument();

    expect(screen.getByTestId('Notifications')).toBeInTheDocument();

    expect(screen.getByTestId('LanguageSelector')).toBeInTheDocument();

    expect(screen.getByTestId('UserMenu')).toBeInTheDocument();

    expect(screen.getByTestId('TopMegaMenu')).toBeInTheDocument();

    // Header exists with expected base classes (sanity check without being too brittle)
    const header = screen.getByRole('banner'); // header maps to "banner" landmark
    expect(header).toBeInTheDocument();
    expect(header.className).toContain('sticky');
    expect(header.className).toContain('bg-gradient-to-r');
    expect(header.className).toContain('from-[#023047]');
    expect(header.className).toContain('via-[#0061A8]');
    expect(header.className).toContain('to-[#00A859]');

    // LTR should not include flex-row-reverse at the header level
    expect(header.className).not.toContain('flex-row-reverse');
  });

  test('applies RTL layout when isRTL is true', () => {
    mockedUseTopBar.mockReturnValue({ isRTL: true });

    render(<TopBar />); // role defaults to 'guest'

    const header = screen.getByRole('banner');
    expect(header.className).toContain('flex-row-reverse');

    // There are two inner flex containers also conditionally reversed; verify at least one contains the class
    // Since we mocked children, we can rely on text presence to find sibling container relationships.
    // We check class presence on elements containing the mocked components by walking up the tree.
    const appSwitcher = screen.getByTestId('AppSwitcher');

    const rightSide = screen.getByTestId('UserMenu');

    // Traverse up to nearest flex containers and assert class presence heuristic
    const findFlexAncestor = (el) => {
      let cur = el;
      while (cur && cur !== document.body) {
        if (cur.className && typeof cur.className === 'string' && cur.className.includes('flex')) {
          return cur;
        }
        cur = cur.parentElement;
      }
      return null;
    };

    const leftFlex = findFlexAncestor(appSwitcher);
    const rightFlex = findFlexAncestor(rightSide);
    expect(leftFlex?.className || '').toContain('flex-row-reverse');
    expect(rightFlex?.className || '').toContain('flex-row-reverse');
  });

  test('does not crash if TopBarContext returns undefined-like value; falls back to non-RTL', () => {
    // Simulate a defensive scenario where context might be misconfigured
    mockedUseTopBar.mockReturnValue({}); // no isRTL provided

    render(<TopBar role="guest" />);

    const header = screen.getByRole('banner');
    expect(header.className).not.toContain('flex-row-reverse');
  });

  test('is resilient to unexpected isRTL types (e.g., null or non-boolean)', () => {
    mockedUseTopBar.mockReturnValue({ isRTL: null });

    render(<TopBar role="power-user" />);

    const header = screen.getByRole('banner');
    expect(header.className).not.toContain('flex-row-reverse');
  });

  test('basic composition snapshot (low brittleness)', () => {
    mockedUseTopBar.mockReturnValue({ isRTL: false });
    const { container } = render(<TopBar />);
    // Snapshot should mainly capture the structure with mocked children; class names can change often,
    // so rely on a shallow snapshot to detect gross regressions in composition.
    expect(container).toMatchSnapshot();
  });
});