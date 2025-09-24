/**
 * Tests for AqarSearchBar
 * Framework: Jest
 * Library: @testing-library/react (+ @testing-library/jest-dom)
 *
 * These tests focus on the diff-provided component logic:
 * - Initialization from URL params (useSearchParams)
 * - Building of search query and router.push on "Search"
 * - Toggling purpose tabs and advanced filters
 * - Input/select interactions (including furnished tri-state)
 * - Navigation buttons (Map Search, Saved Searches)
 * - Language/dir handling
 *
 * External dependencies (next/navigation) are mocked.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AqarSearchBar from './AqarSearchBar';

// Mock next/navigation
const pushMock = jest.fn();

// Simple mock for useSearchParams returning a URLSearchParams-like interface
const makeSearchParams = (params: Record<string, string | undefined>) => {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined) {
      usp.set(k, v);
    }
  });
  return {
    get: (key: string) => usp.get(key),
    // Provide minimal surface used by component
    toString: () => usp.toString(),
  } as unknown as ReturnType<any>;
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useSearchParams: () => makeSearchParams({}),
}));

// Helper to re-mock useSearchParams per test
const mockUseSearchParams = (params: Record<string, string | undefined>) => {
  jest.doMock('next/navigation', () => ({
    useRouter: () => ({
      push: pushMock,
    }),
    useSearchParams: () => makeSearchParams(params),
  }));
};

const rerenderWithParams = async (params: Record<string, string | undefined>, props?: { lang?: 'ar' | 'en' }) => {
  jest.resetModules();
  pushMock.mockClear();

  mockUseSearchParams(params);
  const Comp = (await import('./AqarSearchBar')).default;
  return render(<Comp {...props} />);
};

describe('AqarSearchBar', () => {
  beforeEach(() => {
    jest.resetModules();
    pushMock.mockClear();
  });

  it('renders with Arabic labels and rtl by default', async () => {
    const { container } = render(<AqarSearchBar />);
    expect(container.firstChild).toHaveAttribute('dir', 'rtl');
    expect(screen.getByRole('button', { name: 'بحث' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'فلتر متقدم' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'بحث بالخريطة' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'البحث المحفوظ' })).toBeInTheDocument();
  });

  it('respects lang="en" with English labels and ltr direction', async () => {
    const { container } = render(<AqarSearchBar lang="en" />);
    expect(container.firstChild).toHaveAttribute('dir', 'ltr');
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Advanced Filters' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Map Search' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saved Searches' })).toBeInTheDocument();
  });

  it('initializes filters from URL params (happy path), including furnished=true/false', async () => {
    await rerenderWithParams({
      purpose: 'rent',
      propertyType: 'villa',
      city: 'الرياض',
      district: 'النرجس',
      minPrice: '1000',
      maxPrice: '5000',
      minArea: '50',
      maxArea: '250',
      bedrooms: '3',
      bathrooms: '2',
      furnished: 'true',
      keywords: 'pool',
    }, { lang: 'en' });

    // Check selects/inputs reflect initial values
    expect(screen.getByLabelText('Property Type')).toHaveValue('villa');
    expect(screen.getByLabelText('City')).toHaveValue('الرياض');
    expect(screen.getByLabelText('District')).toHaveValue('النرجس');
    expect(screen.getByLabelText('Keywords')).toHaveValue('pool');

    // Advanced is hidden initially; toggle it to assert numeric fields
    fireEvent.click(screen.getByRole('button', { name: 'Advanced Filters' }));
    expect(screen.getByLabelText('Price From')).toHaveValue(1000);
    expect(screen.getByLabelText('Price To')).toHaveValue(5000);
    expect(screen.getByLabelText(/Area From/)).toHaveValue(50);
    expect(screen.getByLabelText(/Area To/)).toHaveValue(250);
    expect(screen.getByLabelText('Bedrooms')).toHaveValue('3');
    expect(screen.getByLabelText('Bathrooms')).toHaveValue('2');

    // Furnished true
    expect(screen.getByLabelText('Furnished')).toHaveValue('true');
  });

  it('maps unknown furnished value to null (empty option selected)', async () => {
    await rerenderWithParams({ furnished: 'foobar' }, { lang: 'en' });
    // Open Advanced
    fireEvent.click(screen.getByRole('button', { name: 'Advanced Filters' }));
    expect(screen.getByLabelText('Furnished')).toHaveValue('');
  });

  it('Search builds query with only non-empty values and pushes to /aqar', async () => {
    // Start with limited params (some empty)
    await rerenderWithParams({ purpose: 'sale', city: 'جدة', propertyType: '' });
    // Fill some fields
    fireEvent.change(screen.getByLabelText('المدينة'), { target: { value: 'الرياض' } });
    fireEvent.change(screen.getByLabelText('نوع العقار'), { target: { value: 'apartment' } });
    fireEvent.change(screen.getByLabelText('الحي'), { target: { value: 'اسم حي' } });
    fireEvent.change(screen.getByLabelText('كلمات البحث'), { target: { value: 'مسبح' } });

    // Open advanced and set a few more
    fireEvent.click(screen.getByRole('button', { name: 'فلتر متقدم' }));
    fireEvent.change(screen.getByLabelText('السعر من'), { target: { value: '1500' } });
    fireEvent.change(screen.getByLabelText('المساحة إلى (م²)'), { target: { value: '200' } });
    fireEvent.change(screen.getByLabelText('غرف النوم'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('دورات المياه'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('مفروش'), { target: { value: 'false' } });

    // Click Search
    fireEvent.click(screen.getByRole('button', { name: 'بحث' }));

    // Verify router.push called with expected query (order may vary in URLSearchParams)
    expect(pushMock).toHaveBeenCalledTimes(1);
    const url = pushMock.mock.calls[0][0] as string;

    expect(url.startsWith('/aqar?')).toBe(true);

    // Parse query for robust checking
    const qs = new URLSearchParams(url.split('?')[1]);
    expect(qs.get('purpose')).toBe('sale');
    expect(qs.get('city')).toBe('الرياض');
    expect(qs.get('propertyType')).toBe('apartment');
    expect(qs.get('district')).toBe('اسم حي');
    expect(qs.get('keywords')).toBe('مسبح');
    expect(qs.get('minPrice')).toBe('1500');
    // maxPrice intentionally not set; ensure it is absent
    expect(qs.get('maxPrice')).toBeNull();
    expect(qs.get('maxArea')).toBe('200');
    expect(qs.get('bedrooms')).toBe('2');
    expect(qs.get('bathrooms')).toBe('1');
    expect(qs.get('furnished')).toBe('false');
  });

  it('toggling purpose updates active state and affects built query', async () => {
    render(<AqarSearchBar lang="en" />);
    const forSale = screen.getByRole('button', { name: 'For Sale' });
    const forRent = screen.getByRole('button', { name: 'For Rent' });
    const dailyRent = screen.getByRole('button', { name: 'Daily Rent' });

    // Default is sale
    fireEvent.click(forRent);
    fireEvent.click(dailyRent);

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(pushMock).toHaveBeenCalledTimes(1);
    const qs = new URLSearchParams((pushMock.mock.calls[0][0] as string).split('?')[1]);
    expect(qs.get('purpose')).toBe('daily');
  });

  it('Advanced Filters toggle shows/hides extra fields', async () => {
    render(<AqarSearchBar lang="en" />);
    // Initially advanced fields not present
    expect(screen.queryByLabelText('Price From')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Advanced Filters' }));
    expect(screen.getByLabelText('Price From')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Advanced Filters' }));
    expect(screen.queryByLabelText('Price From')).not.toBeInTheDocument();
  });

  it('Map Search and Saved Searches navigate to the correct routes', async () => {
    render(<AqarSearchBar lang="en" />);
    fireEvent.click(screen.getByRole('button', { name: 'Map Search' }));
    expect(pushMock).toHaveBeenCalledWith('/aqar/map');

    fireEvent.click(screen.getByRole('button', { name: 'Saved Searches' }));
    expect(pushMock).toHaveBeenCalledWith('/aqar/saved');
  });

  it('furnished tri-state: empty -> null, true -> true, false -> false', async () => {
    render(<AqarSearchBar lang="en" />);
    // Open advanced
    fireEvent.click(screen.getByRole('button', { name: 'Advanced Filters' }));

    const furnished = screen.getByLabelText('Furnished') as HTMLSelectElement;
    // Start empty
    expect(furnished.value).toBe('');

    // Set to true
    fireEvent.change(furnished, { target: { value: 'true' } });
    expect(furnished.value).toBe('true');

    // Set to false
    fireEvent.change(furnished, { target: { value: 'false' } });
    expect(furnished.value).toBe('false');

    // Back to empty
    fireEvent.change(furnished, { target: { value: '' } });
    expect(furnished.value).toBe('');
  });
});