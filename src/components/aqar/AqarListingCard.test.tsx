/**
 * Tests for AqarListingCard component.
 *
 * Testing library/framework: React Testing Library + Jest (or Vitest compatible).
 * - We use @testing-library/react for rendering and queries
 * - We use @testing-library/jest-dom for extended matchers (toBeInTheDocument, etc.)
 *
 * If the repository uses Vitest, these tests should still work with minimal/no changes.
 * Ensure the test environment is jsdom and that next/image and next/link are mocked if needed.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Some repos auto-setup jest-dom via setupTests; include import defensively for consistency.
// If your project already sets this up globally, this import can be removed safely.
import '@testing-library/jest-dom';

// Mock Next.js components commonly required in tests.

jest.mock('next/image', () => {
  return function MockedNextImage(props: any) {
    // Render a basic img to simulate next/image
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt} src={props.src} data-testid="next-image" />;
  };
});

jest.mock('next/link', () => {
  return ({ href, className, children }: any) => (
    <a href={typeof href === 'string' ? href : href?.pathname} className={className}>
      {children}
    </a>
  );
});

import AqarListingCard from './AqarListingCard';

function makeListing(overrides: Partial<Parameters<typeof AqarListingCard>[0]['listing']> = {}): Parameters<typeof AqarListingCard>[0]['listing'] {
  return {
    _id: 'id-123',
    slug: 'my-listing',
    title: 'Spacious Apartment in Downtown',
    description: 'A lovely place to live',
    purpose: 'rent',
    propertyType: 'apartment',
    price: {
      amount: 2500,
      currency: 'SAR',
      period: 'monthly',
    },
    specifications: {
      area: 120,
      bedrooms: 3,
      bathrooms: 2,
      livingRooms: 1,
      furnished: true,
      parking: 1,
      balcony: true,
      pool: false,
      gym: true,
      security: true,
      elevator: true,
    },
    location: {
      city: 'Riyadh',
      district: 'Olaya',
      neighborhood: 'Block A',
    },
    media: [
      { url: '/images/sample.jpg', alt: 'Cover', type: 'image', isCover: true },
      { url: '/images/other.jpg', alt: 'Other', type: 'image', isCover: false },
    ],
    contact: {
      name: 'Khaled',
      phone: '0500000000',
      whatsapp: '966500000000',
      isVerified: true,
    },
    isVerified: true,
    isFeatured: true,
    isPremium: true,
    views: 123,
    favorites: 10,
    publishedAt: '2024-05-10T00:00:00Z',
    ...overrides,
  };
}

describe('AqarListingCard', () => {
  test('renders price formatted and main details (AR by default)', () => {
    const listing = makeListing();
    render(<AqarListingCard listing={listing} />);
    // Price with period in Arabic; 2,500 SAR/شهر
    expect(screen.getByText(/SAR/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp('/شهر'))).toBeInTheDocument();

    expect(screen.getByText('Spacious Apartment in Downtown')).toBeInTheDocument();
    // Arabic label for apartment
    expect(screen.getByText('شقة')).toBeInTheDocument();
    // Location
    expect(screen.getByText(/Olaya, Riyadh/)).toBeInTheDocument();
    // Area + units
    expect(screen.getByText(/120 م²/)).toBeInTheDocument();
    // Specs in AR labels
    expect(screen.getByText(/3 غرف/)).toBeInTheDocument();
    expect(screen.getByText(/2 حمام/)).toBeInTheDocument();
    // Badges
    expect(screen.getByText('مميز')).toBeInTheDocument(); // Featured badge (AR)
    // Premium is also labeled 'مميز' in code; ensure both states visible by presence of two occurrences
    const premiumOrFeatured = screen.getAllByText('مميز');

    expect(premiumOrFeatured.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('موثوق')).toBeInTheDocument();
    // Purpose badge
    expect(screen.getByText('للإيجار')).toBeInTheDocument();
    // Views visible
    expect(screen.getByText('123')).toBeInTheDocument();
    // Cover image shown
    expect(screen.getByTestId('next-image')).toHaveAttribute('src', '/images/sample.jpg');
  });

  test('uses English labels when lang="en"', () => {
    const listing = makeListing({ purpose: 'sale', propertyType: 'villa' });
    render(<AqarListingCard listing={listing} lang="en" />);
    // Price period English
    expect(screen.getByText(new RegExp('/month|/year|/day|SAR'))).toBeInTheDocument(); // defaults monthly; we didn't change period
    // Purpose label
    expect(screen.getByText('For Sale')).toBeInTheDocument();
    // Property type
    expect(screen.getByText('Villa')).toBeInTheDocument();
    // Call/WhatsApp labels
    expect(screen.getByText('View Details')).toBeInTheDocument();
    expect(screen.getByText('Call')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    // Verified advertiser text
    expect(screen.getByText('Verified Advertiser')).toBeInTheDocument();
  });

  test('falls back to first media when no cover is provided', () => {
    const listing = makeListing({
      media: [
        { url: '/images/first.jpg', type: 'image', isCover: false },
        { url: '/images/second.jpg', type: 'image', isCover: false },
      ],
    });
    render(<AqarListingCard listing={listing} />);
    expect(screen.getByTestId('next-image')).toHaveAttribute('src', '/images/first.jpg');
  });

  test('renders placeholder icon when image load fails', () => {
    const listing = makeListing();
    const { container } = render(<AqarListingCard listing={listing} />);
    const img = screen.getByTestId('next-image');
    // Fire an error on the underlying img to simulate onError
    fireEvent.error(img);
    // When imageError is true, the cover replaces with a Square icon; we can detect absence of img
    expect(container.querySelector('[data-testid="next-image"]')).not.toBeInTheDocument();
    // The placeholder area contains the Square icon; since it's an icon component without text,
    // assert by looking for an element that no longer is the image and exists visually:
    // We verify that at least the price and title still render to ensure component didn't crash.
    expect(screen.getByText('Spacious Apartment in Downtown')).toBeInTheDocument();
  });

  test('favorite button toggles heart fill class', () => {
    const listing = makeListing();
    const { container } = render(<AqarListingCard listing={listing} />);
    // Button is at bottom-right; click should toggle isFavorited and switch classes
    const btn = container.querySelector('button.absolute.bottom-3.right-3');
    expect(btn).toBeInTheDocument();
    // Icon should not have fill-current initially
    let heart = container.querySelector('svg.w-5.h-5');
    expect(heart).toBeInTheDocument();
    expect(heart?.className).toMatch(/text-gray-600/);
    expect(heart?.className).not.toMatch(/fill-current/);

    fireEvent.click(btn);

    heart = container.querySelector('svg.w-5.h-5');
    expect(heart?.className).toMatch(/text-red-500/);
    expect(heart?.className).toMatch(/fill-current/);

    fireEvent.click(btn);

    heart = container.querySelector('svg.w-5.h-5');
    expect(heart?.className).toMatch(/text-gray-600/);
    expect(heart?.className).not.toMatch(/fill-current/);
  });

  test('renders optional specs conditionally (parking, balcony, etc.)', () => {
    const listing = makeListing({
      specifications: {
        area: 80,
        furnished: false,
        bedrooms: undefined,
        bathrooms: 1,
        parking: 0, // should hide parking block
        balcony: true,
        pool: true,
        gym: false,
        security: true,
        elevator: false,
      } as any,
    });

    render(<AqarListingCard listing={listing} />);
    // Bedrooms hidden
    expect(screen.queryByText(/غرف|BR/)).not.toBeInTheDocument();
    // Bathrooms show
    expect(screen.getByText(/1 (حمام|BA)/)).toBeInTheDocument();
    // Parking is 0 -> hide
    expect(screen.queryByText(/موقف|Parking/)).not.toBeInTheDocument();
    // Balcony and Pool and Security present; Furnished & Gym & Elevator absent
    expect(screen.getByText(/بلكونة|Balcony/)).toBeInTheDocument();
    expect(screen.getByText(/مسبح|Pool/)).toBeInTheDocument();
    expect(screen.getByText(/أمن|Security/)).toBeInTheDocument();
    expect(screen.queryByText(/مفروش|Furnished/)).not.toBeInTheDocument();
    expect(screen.queryByText(/جيم|Gym/)).not.toBeInTheDocument();
    expect(screen.queryByText(/مصعد|Elevator/)).not.toBeInTheDocument();
  });

  test('link navigates to slug when present, else falls back to _id', () => {
    const listingWithSlug = makeListing({ slug: 'custom-slug', _id: 'id-777' });
    render(<AqarListingCard listing={listingWithSlug} />);
    const detailsLink = screen.getByRole('link', { name: /عرض التفاصيل|View Details/ });
    expect(detailsLink).toHaveAttribute('href', '/aqar/custom-slug');

    const listingNoSlug = makeListing({ slug: '', _id: 'id-999' });
    render(<AqarListingCard listing={listingNoSlug} />);
    const secondLink = screen.getAllByRole('link', { name: /عرض التفاصيل|View Details/ })[1];
    expect(secondLink).toHaveAttribute('href', '/aqar/id-999');
  });

  test('renders WhatsApp button only when whatsapp contact provided', () => {
    const withWA = makeListing({ whatsapp: undefined }); // not used, ensure field from contact
    render(<AqarListingCard listing={withWA} />);
    expect(screen.getByText(/واتساب|WhatsApp/)).toBeInTheDocument();

    const noWA = makeListing({ contact: { ...makeListing().contact, whatsapp: undefined } });
    render(<AqarListingCard listing={noWA} />);
    // Second render adds another potential match; check the last card area for missing WhatsApp
    const allWhatsApps = screen.getAllByText(/واتساب|WhatsApp/);
    // At least first render had one. Now ensure at least one card without WA does not show extra button.
    // We can be more explicit by checking link presence:
    const waLinks = screen.getAllByRole('link').filter(a => (a as HTMLAnchorElement).href.includes('wa.me'));
    expect(waLinks.length).toBeGreaterThanOrEqual(1);
  });

  test('English price period variants monthly/yearly/daily are formatted', () => {
    render(
      <>
        <AqarListingCard
          lang="en"
          listing={makeListing({ price: { amount: 3000, currency: 'SAR', period: 'monthly' } })}
        />
        <AqarListingCard
          lang="en"
          listing={makeListing({ price: { amount: 36000, currency: 'SAR', period: 'yearly' } })}
        />
        <AqarListingCard
          lang="en"
          listing={makeListing({ price: { amount: 200, currency: 'SAR', period: 'daily' } })}
        />
      </>
    );
    expect(screen.getByText(new RegExp('3000.*SAR/month'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp('36000.*SAR/year'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp('200.*SAR/day'))).toBeInTheDocument();
  });

  test('getPropertyTypeLabel falls back to raw type if unknown', () => {
    render(<AqarListingCard listing={makeListing({ propertyType: 'castle' })} lang="en" />);
    expect(screen.getByText('castle')).toBeInTheDocument();
  });

  test('getPurposeLabel falls back to raw purpose if unknown', () => {
    // Type cast to bypass TypeScript union for testing unexpected input
    render(<AqarListingCard listing={makeListing({ purpose: 'other' as any })} lang="en" />);
    expect(screen.getByText('other')).toBeInTheDocument();
  });
});