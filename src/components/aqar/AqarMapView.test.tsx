/**
 * Tests for AqarMapView
 *
 * Testing library/framework used:
 * - React Testing Library for rendering and interactions
 * - Jest as the default runner (with fallback compatibility for Vitest via global detection)
 *
 * Notes:
 * - We mock the Google Maps JS API via a lightweight in-memory mock to verify behavior without network calls.
 * - We avoid jest-dom specific matchers to keep compatibility broad (Jest/Vitest).
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AqarMapView from './AqarMapView';

declare const jest: any; // for TS compatibility if using Vitest
declare const vi: any;   // for TS compatibility if using Jest

// Cross-runner spy factory (Jest or Vitest)
function createSpy<T extends (...args: any[]) => any>(impl?: T): T {
  const g: any = globalThis as any;
  if (g.vi && typeof g.vi.fn === 'function') {
    return g.vi.fn(impl) as any;
  }
  if (g.jest && typeof g.jest.fn === 'function') {
    return g.jest.fn(impl) as any;
  }
  // Fallback: no-op
  return (((...args: any[]) => (impl ? impl(...args) : undefined)) as unknown) as T;
}

// Google Maps lightweight mock installer
const installGoogleMapsMock = () => {
  const createdMaps: any[] = [];
  const createdMarkers: any[] = [];

  class GoogleMapMock {
    center: any;
    zoom: number;
    constructor(el: any, opts: any) {
      this.center = opts.center;
      this.zoom = opts.zoom;
      createdMaps.push(this);
    }
    getZoom = () => this.zoom;
    setZoom = (z: number) => { this.zoom = z; };
    setCenter = (c: any) => { this.center = c; };
  }

  class Marker {
    position: any;
    title: string;
    map: any;
    _listeners: Record<string, Function>;
    _setMapCalls: any[];
    icon: any;

    constructor(opts: any) {
      this.position = opts.position;
      this.title = opts.title;
      this.map = opts.map;
      this.icon = opts.icon;
      this._listeners = {};
      this._setMapCalls = [];
      createdMarkers.push(this);
    }

    addListener = (event: string, cb: Function) => {
      this._listeners[event] = cb;
    };

    trigger = (event: string) => {
      if (this._listeners[event]) {
        this._listeners[event]();
      }
    };

    setMap = (m: any) => {
      this._setMapCalls.push(m);
      this.map = m;
    };
  }

  class InfoWindow {
    content: string;
    open: (...args: any[]) => void;

    constructor(opts: any) {
      this.content = opts.content;
      this.open = createSpy() as unknown as (...args: any[]) => void;
    }
  }

  class Size { constructor(_w: number, _h: number) {} }
  class Point { constructor(_x: number, _y: number) {} }

  (window as any).google = {
    maps: {
      Map: GoogleMapMock,
      Marker,
      InfoWindow,
      Size,
      Point,
    },
  };

  return { createdMaps, createdMarkers };
};

// Test utilities
const buildListings = () => ([
  {
    _id: 'l1',
    title: 'Listing One',
    location: { lat: 24.7137, lng: 46.6754, city: 'Riyadh', district: 'Olaya' },
    price: { amount: 1000000, currency: 'SAR' },
    specifications: { area: 120, bedrooms: 3, bathrooms: 2 },
    media: [{ url: 'https://example.com/1.jpg', isCover: true }],
  },
  {
    _id: 'l2',
    title: 'Listing Two',
    location: { lat: 24.7138, lng: 46.6755, city: 'Riyadh', district: 'Diplomatic Quarter' },
    price: { amount: 2000000, currency: 'SAR' },
    specifications: { area: 200, bedrooms: 4, bathrooms: 3 },
    media: [{ url: 'https://example.com/2.jpg', isCover: true }],
  },
]);

const withEn = { lang: 'en' as const };
const defaultCenter = { lat: 24.7136, lng: 46.6753 };
const defaultZoom = 10;

describe('AqarMapView', () => {
  afterEach(() => {
    // Cleanup globals
    delete (window as any).google;
    delete (window as any).selectListing;

    // Restore spies for both runners
    const g: any = globalThis as any;
    if (g.vi && typeof g.vi.restoreAllMocks === 'function') {
      g.vi.restoreAllMocks();
    }
    if (g.jest && typeof g.jest.restoreAllMocks === 'function') {
      g.jest.restoreAllMocks();
    }
  });

  it('shows loading spinner initially and hides it after map initialization (EN)', async () => {
    installGoogleMapsMock();

    render(<AqarMapView {...withEn} />);

    // Initially shows loading state
    expect(screen.getByText('Loading map...')).toBeTruthy();

    // After effect runs, map initializes and loading disappears
    await waitFor(() => {
      const loading = screen.queryByText('Loading map...');
      if (loading) {
        throw new Error('Still loading');
      }
    });

    // Controls should be present
    expect(screen.getByTitle('Zoom In')).toBeTruthy();
    expect(screen.getByTitle('Zoom Out')).toBeTruthy();
    expect(screen.getByTitle('Center Map')).toBeTruthy();
  });

  it('respects language direction and labels (AR)', async () => {
    installGoogleMapsMock();

    render(<AqarMapView lang="ar" />);

    // Loading text in Arabic
    expect(screen.getByText('جاري تحميل الخريطة...')).toBeTruthy();

    // Wait for non-loading state
    await waitFor(() => {
      const loading = screen.queryByText('جاري تحميل الخريطة...');
      if (loading) {
        throw new Error('Still loading');
      }
    });

    // Container direction should be RTL
    const root = document.querySelector('div.relative');
    expect(root ? root.getAttribute('dir') : null).toBe('rtl');

    // Legend label in Arabic
    expect(screen.getByText('عقارات متاحة')).toBeTruthy();
  });

  it('renders map controls and handles zoom in/out and center actions', async () => {
    const { createdMaps } = installGoogleMapsMock();

    render(<AqarMapView {...withEn} center={{ ...defaultCenter }} zoom={defaultZoom} />);

    await waitFor(() => {
      if (!screen.queryByTitle('Zoom In')) {
        throw new Error('Not ready');
      }
    });

    // Initially one map instance created
    expect(createdMaps.length).toBe(1);
    const theMap = createdMaps[0];

    // Zoom In increments zoom
    fireEvent.click(screen.getByTitle('Zoom In'));
    expect(theMap.getZoom()).toBe(defaultZoom + 1);

    // Zoom Out decrements zoom
    fireEvent.click(screen.getByTitle('Zoom Out'));
    expect(theMap.getZoom()).toBe(defaultZoom);

    // Center Map sets center and zoom to provided props
    fireEvent.click(screen.getByTitle('Center Map'));
    expect(theMap.center).toEqual(defaultCenter);
    expect(theMap.getZoom()).toBe(defaultZoom);
  });

  it('creates markers for listings and shows selection overlay on marker click', async () => {
    const { createdMarkers } = installGoogleMapsMock();
    const listings = buildListings();
    const onListingClick = createSpy() as unknown as (l: any) => void;

    render(<AqarMapView {...withEn} listings={listings} onListingClick={onListingClick} />);

    // Wait for markers to be created
    await waitFor(() => {
      if (createdMarkers.length !== listings.length) {
        throw new Error('Markers not ready');
      }
    });

    // Trigger click on first marker
    createdMarkers[0].trigger('click');

    // Overlay should display selected listing details (title & "View Details" button)
    expect(await screen.findByText(listings[0].title)).toBeTruthy();
    expect(screen.getByText('View Details')).toBeTruthy();

    // Clicking overlay button calls onListingClick with selected listing
    fireEvent.click(screen.getByText('View Details'));
    expect(onListingClick).toHaveBeenCalledTimes(1);
    expect(onListingClick).toHaveBeenCalledWith(expect.objectContaining({ _id: listings[0]._id }));
  });

  it('exposes window.selectListing to trigger onListingClick from InfoWindow button', async () => {
    installGoogleMapsMock();
    const listings = buildListings();
    const onListingClick = createSpy() as unknown as (l: any) => void;

    render(<AqarMapView {...withEn} listings={listings} onListingClick={onListingClick} />);

    // Wait until selectListing is attached
    await waitFor(() => {
      if (typeof (window as any).selectListing !== 'function') {
        throw new Error('selectListing not ready');
      }
    });

    // Simulate InfoWindow button click via global
    (window as any).selectListing(listings[1]._id);

    expect(onListingClick).toHaveBeenCalledTimes(1);
    expect(onListingClick).toHaveBeenCalledWith(expect.objectContaining({ _id: listings[1]._id }));
  });

  it('clears old markers when listings change', async () => {
    const { createdMarkers } = installGoogleMapsMock();
    const listingsA = [buildListings()[0]];
    const listingsB = buildListings(); // 2 listings

    const { rerender } = render(<AqarMapView {...withEn} listings={listingsA} />);

    // Wait for first set of markers
    await waitFor(() => {
      if (createdMarkers.length !== listingsA.length) {
        throw new Error('First markers not ready');
      }
    });

    const firstMarkers = [...createdMarkers];

    // Rerender with new listings
    rerender(<AqarMapView {...withEn} listings={listingsB} />);

    // Ensure first markers had setMap(null) called during cleanup
    await waitFor(() => {
      firstMarkers.forEach(m => {
        if (!(m._setMapCalls && m._setMapCalls.some((v: any) => v === null))) {
          throw new Error('Old marker not cleared');
        }
      });
    });
  });

  it('calls setMap(null) on unmount for existing markers', async () => {
    const { createdMarkers } = installGoogleMapsMock();
    const listings = buildListings();

    const { unmount } = render(<AqarMapView {...withEn} listings={listings} />);

    await waitFor(() => {
      if (createdMarkers.length !== listings.length) {
        throw new Error('Markers not ready');
      }
    });

    unmount();

    // All markers should be cleaned up
    createdMarkers.forEach(m => {
      expect(m._setMapCalls && m._setMapCalls.some((v: any) => v === null)).toBe(true);
    });
  });

  it('handles Google Maps script load failure by logging error and removing loading state', async () => {
    // Ensure google is not present to force script path
    delete (window as any).google;

    // Spy on console.error
    const logErr = createSpy() as unknown as (msg?: any, ...rest: any[]) => void;
    const g: any = globalThis as any;
    if (g.vi && typeof g.vi.spyOn === 'function') {
      g.vi.spyOn(console, 'error').mockImplementation(logErr);
    } else if (g.jest && typeof g.jest.spyOn === 'function') {
      g.jest.spyOn(console, 'error').mockImplementation(logErr);
    }

    // Stub createElement and appendChild to trigger onerror
    const origCreate = document.createElement.bind(document);
    const origAppend = document.head.appendChild.bind(document.head);

    let capturedScript: any = null;
    // @ts-ignore
    document.createElement = ((tag: string) => {
      if (tag === 'script') {
        const el: any = {};
        Object.defineProperty(el, 'src', {
          set: function (_v) { /* ignore */ },
        });
        el.async = true;
        el.onload = null;
        el.onerror = null;
        capturedScript = el;
        return el as any;
      }
      return origCreate(tag);
    }) as any;

    // @ts-ignore
    document.head.appendChild = ((node: any) => {
      if (node === capturedScript && capturedScript && capturedScript.onerror) {
        // simulate script load failure
        setTimeout(() => capturedScript.onerror());
      }
      return origAppend(node);
    }) as any;

    render(<AqarMapView {...withEn} />);

    // Initially shows loading
    expect(screen.getByText('Loading map...')).toBeTruthy();

    // Wait for loading to be removed after error
    await waitFor(() => {
      const loading = screen.queryByText('Loading map...');
      if (loading) {
        throw new Error('Still loading after error');
      }
    });

    // Error should have been logged
    expect(logErr).toHaveBeenCalled();

    // Restore DOM stubs
    document.createElement = origCreate as any;
    document.head.appendChild = origAppend as any;
  });
});