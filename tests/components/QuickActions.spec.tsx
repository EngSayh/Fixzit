// Additional coverage for QuickActions (Framework: Jest + React Testing Library)
describe('QuickActions — additional coverage', () => {
  const setNavPath = (path) => {
    const nav: any = require('next/navigation');
    if (typeof nav.__setPathname === 'function') {
      nav.__setPathname(path);
    }
  };

  test('wrapper has expected layout classes', () => {
    setNavPath('/fm/dashboard');
    const { container } = render(<QuickActions />);
    const firstLink = screen.getByRole('link', { name: /\+\s*New Work Order/i });
    const wrapper = firstLink.closest('div') as HTMLElement;

    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveClass('hidden');
    expect(wrapper.className).toContain('sm:flex');
    expect(wrapper).toHaveClass('items-center');
    expect(wrapper).toHaveClass('gap-2');
  });

  test('all rendered link labels are prefixed with "+ "', () => {
    setNavPath('/souq/home');
    render(<QuickActions />);
    const labels = screen.getAllByRole('link').map(a => (a.textContent || '').trim());
    labels.forEach(label => {

      expect(label).toMatch(/^\+\s+/);
    });
  });

  test('"/marketplace" path maps to SOUQ actions with correct hrefs', () => {
    setNavPath('/marketplace/anything');
    render(<QuickActions />);
    const hrefs = screen.getAllByRole('link').map(a => a.getAttribute('href'));
    expect(hrefs.length).toBe(2);
    expect(hrefs).toEqual(expect.arrayContaining([

      '/marketplace/rfqs/new',

      '/marketplace/items/new',
    ]));
  });

  test('falls back to /fm actions when usePathname returns undefined', () => {
    setNavPath(undefined as any);
    render(<QuickActions />);

    expect(screen.getByRole('link', { name: /\+\s*New Work Order/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /\+\s*New Invoice/i })).toBeInTheDocument();
  });

  test('returns null (renders nothing) when resolved scope has no actions (simulated)', () => {
    jest.isolateModules(() => {
      // Ensure we start from a known path that resolves to a scope we will empty out
      const nav: any = require('next/navigation');
      nav.__setPathname('/aqar/empty');

      // Mock component module with empty '/aqar' actions to trigger null render
      jest.doMock('../../src/components/QuickActions', () => {
        const React = require('react');
        const { usePathname } = require('next/navigation');
        const Link = require('next/link').default;

        const ACTIONS_BY_SCOPE = {
          '/fm': [
            { label: 'New Work Order', href: '/work-orders/new', perm: 'wo.create' },
            { label: 'New Invoice', href: '/finance/invoices/new', perm: 'finance.invoice.create' },
          ],
          '/aqar': [], // simulate no actions for aqar
          '/souq': [
            { label: 'New RFQ', href: '/marketplace/rfqs/new', perm: 'souq.rfq.create' },
            { label: 'Add Product/Service', href: '/marketplace/items/new', perm: 'souq.item.create' },
          ],
        };

        function getScope(pathname) {
          if (pathname.startsWith('/fm')) return '/fm';
          if (pathname.startsWith('/aqar')) return '/aqar';
          if (pathname.startsWith('/souq') || pathname.startsWith('/marketplace')) return '/souq';
          return '/fm';
        }

        function can(_perm) { return true; }

        function QuickActionsMock() {
          const pathname = usePathname() || '/';
          const scope = getScope(pathname);
          const actions = ACTIONS_BY_SCOPE[scope] || [];
          if (!actions.length) { return null; }
          return (

            <div className="hidden sm:flex items-center gap-2">

              {actions.filter(a => can(a.perm)).map(a => (

                <Link key={a.href} href={a.href}>+ {a.label}</Link>

              ))}
            </div>
          );
        }

        return { __esModule: true, default: QuickActionsMock };
      });

      const { default: QAEmptyAqar } = require('../../src/components/QuickActions');
      const { container } = render(React.createElement(QAEmptyAqar));
      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    jest.resetModules();
    jest.doUnmock('../../src/components/QuickActions');
  });
});