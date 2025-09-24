/**
 * Testing library and framework:
 * - Uses React Testing Library for rendering and user interactions.
 * - Uses Jest/Vitest expect-style assertions and jsdom environment.
 *
 * Scenarios covered:
 * - Renders input with placeholder from context.
 * - Directionality (isRTL) toggles icon/input alignment classes.
 * - No fetch when query is empty/whitespace; list stays closed.
 * - Fetch invoked with correct URL params and loading indicator shown.
 * - Successful fetch displays hits and opens listbox.
 * - Focus/blur behavior: opening on focus with hits; blur closes after timeout.
 * - Keyboard shortcut Cmd/Ctrl+K opens and focuses input.
 * - AbortController: subsequent queries abort prior request; no crash on rejection.
 * - Handles non-ok response gracefully (swallowed) and hides loading.
 * - Subtitle optional rendering and correct link attributes for hits.
 */
 
import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
 
// Mock the TopBarContext hook used by GlobalSearch
jest.mock('@/src/contexts/TopBarContext', () => {
  return {
    useTopBar: jest.fn(() => ({
      app: 'console',
      searchEntities: ['users','groups'],
      placeholder: 'Search...',
      isRTL: false,
    })),
  };
});
 
// Mock lucide-react Search icon to avoid SVG/DOM complexity
jest.mock('lucide-react', () => ({
  Search: (props: any) => <div data-testid="search-icon" {...props} />,
}));
 
// Import the component under test after mocks
// The path here mirrors the file under test from the PR snippet
// If the actual component is defined in a different file, adjust the import accordingly.
import { GlobalSearch } from './GlobalSearch';
 
const useTopBar = require('@/src/contexts/TopBarContext').useTopBar as jest.Mock;
 
function mockUseTopBar(overrides?: Partial<ReturnType<typeof useTopBar>>) {
  useTopBar.mockReturnValue({
    app: 'console',
    searchEntities: ['users', 'groups'],
    placeholder: 'Search the console',
    isRTL: false,
    ...overrides,
  });
}
 
// Helper to control navigator.platform for meta vs ctrl detection
function setNavigatorPlatform(value: string) {
  Object.defineProperty(window.navigator, 'platform', {
    value,
    configurable: true,
  });
}
 
beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve(new Response(JSON.stringify([]), { status: 200 })) as any);
  mockUseTopBar(); // default mock
});
 
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
  (global.fetch as jest.Mock).mockRestore();
  jest.clearAllMocks();
});
 
describe('GlobalSearch', () => {
  test('renders input with placeholder and search icon', () => {
    render(<GlobalSearch />);
    expect(screen.getByLabelText('Global search')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search the console')).toBeInTheDocument();
    // icon present
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });
 
  test('respects RTL alignment classes when isRTL=true', () => {
    mockUseTopBar({ isRTL: true });
    render(<GlobalSearch />);
    const icon = screen.getByTestId('search-icon');
    expect(icon.className).toMatch(/\bright-3\b/); // icon alignment
    const input = screen.getByLabelText('Global search');
    expect(input.className).toMatch(/\btext-right\b/);
  });
 
  test('does not fetch when query is empty or whitespace; remains closed', async () => {
    render(<GlobalSearch />);
    const input = screen.getByLabelText('Global search');
 
    await userEvent.type(input, '   '); // whitespace
    // run effects
    await act(async () => {});
 
    expect(global.fetch).not.toHaveBeenCalled();
    // Listbox should not be in the document
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
 
  test('fetches with correct params, shows loading spinner, and displays hits on success', async () => {
    const hits = [
      { id: '1', entity: 'users', title: 'Alice', subtitle: 'Admin', href: '/u/1' },
      { id: '2', entity: 'groups', title: 'Team Rocket', href: '/g/2' }, // no subtitle
    ];
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify(hits), { status: 200 })
    );
 
    mockUseTopBar({ app: 'console', searchEntities: ['users','groups'] });
    render(<GlobalSearch />);
    const input = screen.getByLabelText('Global search');
 
    await userEvent.type(input, 'ali'); // triggers effect
 
    // Loading spinner should be shown while waiting
    // spinner is an absolute positioned div; query by role is not applicable; check by style class
    await waitFor(() => {
      const spinners = screen.getAllByText((_, node) => {
        // find div with classes 'animate-spin' and 'border-b-2'
        return !!node && node.nodeName === 'DIV' && /\banimate-spin\b/.test((node as HTMLElement).className);
      });
      expect(spinners.length).toBeGreaterThan(0);
    });
 
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const calledUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
 
    expect(calledUrl).toContain('/api/search?');
    // Validate URLSearchParams
    const url = new URL(calledUrl, 'http://localhost');
    expect(url.searchParams.get('app')).toBe('console');
    expect(url.searchParams.get('entities')).toBe('users,groups');
    expect(url.searchParams.get('q')).toBe('ali');
 
    // Results should render and listbox should be open
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
    // Titles
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Team Rocket')).toBeInTheDocument();
    // Subtitle optional behavior
    expect(screen.getByText('Admin')).toBeInTheDocument();
    // Entity label
    expect(screen.getByText(/users/i)).toBeInTheDocument();
    expect(screen.getByText(/groups/i)).toBeInTheDocument();
    // Links have correct href
    expect(screen.getByRole('option', { name: /Alice/ }).closest('a')).toHaveAttribute('href', '/u/1');
    expect(screen.getByRole('option', { name: /Team Rocket/ }).closest('a')).toHaveAttribute('href', '/g/2');
  });
 
  test('focus/blur: opens on focus when hits present, closes after blur timeout', async () => {
    const hits = [{ id: '1', entity: 'users', title: 'Bob', href: '/u/1' }];
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify(hits), { status: 200 })
    );
 
    render(<GlobalSearch />);
    const input = screen.getByLabelText('Global search');
 
    // Type to fetch
    await userEvent.type(input, 'bob');
    await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());
 
    // Close by blur with timeout
    fireEvent.blur(input);
    // advance timers for the setTimeout(200)
    act(() => {
      jest.advanceTimersByTime(200);
    });
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
 
    // Focus should re-open the list if hits available
    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });
 
  test('keyboard shortcut opens and focuses input (mac: Meta+K)', async () => {
    setNavigatorPlatform('MacIntel');
    render(<GlobalSearch />);
    const input = screen.getByLabelText('Global search');
 
    // Ensure not focused initially
    (input as HTMLInputElement).blur();
 
    // Press Meta+K
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    // Input should be focused and dropdown opened (even with no hits yet, component sets open=true)
    expect(document.activeElement).toBe(input);
  });
 
  test('keyboard shortcut opens and focuses input (windows/linux: Ctrl+K)', async () => {
    setNavigatorPlatform('Win32');
    render(<GlobalSearch />);
    const input = screen.getByLabelText('Global search');
 
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(document.activeElement).toBe(input);
  });
 
  test('aborts previous request when query changes quickly; later result shows', async () => {
    // We will simulate two fetches: the first gets aborted/rejected, second succeeds
    const fetchMock = global.fetch as jest.Mock;
 
    // First call: we simulate an abort by returning a rejected Promise (as the component swallows in catch)
    const abortedError = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    fetchMock.mockImplementationOnce(() => Promise.reject(abortedError));
 
    // Second call: return hits
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve(new Response(JSON.stringify([{ id: '2', entity: 'users', title: 'Carol', href: '/u/2' }]), { status: 200 }))
    );
 
    render(<GlobalSearch />);
    const input = screen.getByLabelText('Global search');
 
    await userEvent.type(input, 'c');   // triggers first request
    await userEvent.type(input, 'a');   // triggers second request (new params; should abort previous)
 
    // We should end up with the second result rendered and no unhandled errors
    await waitFor(() => {
      expect(screen.getByText('Carol')).toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
 
  test('handles non-ok response gracefully (catch + finally), hides loading', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response('boom', { status: 500 })
    );
 
    render(<GlobalSearch />);
    const input = screen.getByLabelText('Global search');
    await userEvent.type(input, 'err');
 
    // Loading should appear then disappear; list should not open
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
 
    // advance microtasks
    await act(async () => {});
 
    // spinner should eventually not be in the document
    // we locate using className heuristic again
    await waitFor(() => {
      const spinner = screen.queryByText((_, node) => {
        return !!node && node.nodeName === 'DIV' && /\banimate-spin\b/.test((node as HTMLElement).className);
      });
      expect(spinner).toBeNull();
    });
 
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
 
  test('does not open results when no hits are returned', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200 })
    );
    render(<GlobalSearch />);
    const input = screen.getByLabelText('Global search');
 
    await userEvent.type(input, 'nohits');
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});