/**
 * Tests for QuickActions component
 * Framework/Libraries: Jest + React Testing Library (JSDOM), compatible with Vitest where applicable.
 *
 * Scenarios covered:
 * - Renders nothing when quickActions is empty
 * - Renders trigger button when actions exist
 * - Toggles menu open/closed on button click
 * - Renders all action links with correct hrefs
 * - Closes menu when an action link is clicked
 * - Positions dropdown to the left when isRTL is true, right otherwise
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock next/link to render a simple anchor to avoid Next.js routing behavior in tests
jest.mock('next/link', () => {
  return ({ href, children, ...rest }: any) => (
    <a href={typeof href === 'string' ? href : href?.pathname} {...rest}>{children}</a>
  );
});

// Mock lucide-react icons to simple spans to keep DOM minimal
jest.mock('lucide-react', () => ({
  Plus: (props: any) => <span data-testid="icon-plus" {...props} />,
  ChevronDown: (props: any) => <span data-testid="icon-chevron" {...props} />,
}));

// Mock TopBar context hook
const mockUseTopBar = jest.fn();
jest.mock('@/src/contexts/TopBarContext', () => ({
  useTopBar: () => mockUseTopBar(),
}));

// Import after mocks to ensure component uses mocks
import { QuickActions } from './QuickActions';

function setup(opts: { actions?: Array<{id: string; label: string; href: string}>; isRTL?: boolean } = {}) {
  const {
    actions = [],
    isRTL = false,
  } = opts;

  mockUseTopBar.mockReturnValue({
    quickActions: actions,
    isRTL,
  });

  return render(<QuickActions />);
}

describe('QuickActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('does not render anything when quickActions is empty', () => {
    const { container } = setup({ actions: [] });
    // Component returns null; container should be empty or not contain the trigger button
    expect(container).toBeTruthy();
    expect(screen.queryByText(/New/i)).toBeNull();
    expect(screen.queryByTestId('icon-plus')).toBeNull();
  });

  test('renders the trigger button when actions exist (closed by default)', () => {
    setup({
      actions: [{ id: 'a1', label: 'Create Task', href: '/tasks/new' }],
    });

    expect(screen.getByText('New')).toBeInTheDocument();
    // Menu should not be open initially
    expect(screen.queryByText('Create Task')).toBeNull();
  });

  test('opens and closes the menu on button click (toggle behavior)', () => {
    setup({
      actions: [
        { id: 'a1', label: 'Create Task', href: '/tasks/new' },
        { id: 'a2', label: 'New Project', href: '/projects/new' },
      ],
    });

    const trigger = screen.getByText('New');
    // Open
    fireEvent.click(trigger);
    expect(screen.getByText('Create Task')).toBeInTheDocument();
    expect(screen.getByText('New Project')).toBeInTheDocument();

    // Close
    fireEvent.click(trigger);
    expect(screen.queryByText('Create Task')).toBeNull();
    expect(screen.queryByText('New Project')).toBeNull();
  });

  test('renders all links with correct hrefs when open', () => {
    setup({
      actions: [
        { id: 'a1', label: 'Create Task', href: '/tasks/new' },
        { id: 'a2', label: 'New Project', href: '/projects/new' },
        { id: 'a3', label: 'Invite Teammate', href: '/team/invite' },
      ],
    });

    // Open menu
    fireEvent.click(screen.getByText('New'));

    const link1 = screen.getByRole('link', { name: 'Create Task' });
    const link2 = screen.getByRole('link', { name: 'New Project' });
    const link3 = screen.getByRole('link', { name: 'Invite Teammate' });

    expect(link1).toHaveAttribute('href', '/tasks/new');
    expect(link2).toHaveAttribute('href', '/projects/new');
    expect(link3).toHaveAttribute('href', '/team/invite');
  });

  test('clicking a link closes the menu', () => {
    setup({
      actions: [
        { id: 'a1', label: 'Create Task', href: '/tasks/new' },
      ],
    });

    // Open
    fireEvent.click(screen.getByText('New'));
    const link = screen.getByRole('link', { name: 'Create Task' });
    expect(link).toBeInTheDocument();

    // Click link; component's onClick should set open to false
    fireEvent.click(link);

    // Menu should close
    expect(screen.queryByRole('link', { name: 'Create Task' })).toBeNull();
  });

  test('positions dropdown right-anchored by default (LTR)', () => {
    setup({
      isRTL: false,
      actions: [{ id: 'a1', label: 'Create Task', href: '/tasks/new' }],
    });

    // Open
    fireEvent.click(screen.getByText('New'));
    const link = screen.getByRole('link', { name: 'Create Task' });

    // Structure: a (link) -> div.p-1 -> div.absolute(top dropdown)
    const p1 = link.parentElement;
    const dropdown = p1?.parentElement as HTMLElement | null;

    expect(dropdown).toBeTruthy();
    // Should have 'right-0' class when LTR
    expect(dropdown?.className || '').toEqual(expect.stringContaining('right-0'));
    expect(dropdown?.className || '').not.toEqual(expect.stringContaining('left-0'));
  });

  test('positions dropdown left-anchored when RTL', () => {
    setup({
      isRTL: true,
      actions: [{ id: 'a1', label: 'Create Task', href: '/tasks/new' }],
    });

    // Open
    fireEvent.click(screen.getByText('New'));
    const link = screen.getByRole('link', { name: 'Create Task' });

    // Structure: a (link) -> div.p-1 -> div.absolute(top dropdown)
    const p1 = link.parentElement;
    const dropdown = p1?.parentElement as HTMLElement | null;

    expect(dropdown).toBeTruthy();
    // Should have 'left-0' class when RTL
    expect(dropdown?.className || '').toEqual(expect.stringContaining('left-0'));
    expect(dropdown?.className || '').not.toEqual(expect.stringContaining('right-0'));
  });

  test('button contains icons (visual cues present)', () => {
    setup({
      actions: [{ id: 'a1', label: 'Create Task', href: '/tasks/new' }],
    });

    expect(screen.getByTestId('icon-plus')).toBeInTheDocument();
    expect(screen.getByTestId('icon-chevron')).toBeInTheDocument();
  });
});