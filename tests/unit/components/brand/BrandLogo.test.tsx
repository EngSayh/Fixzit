import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrandLogo, BrandLogoWithCard } from '@/components/brand/BrandLogo';

// Mock fetch for org logo tests - save original for proper restoration
const originalFetch = global.fetch;
const mockFetch = vi.fn();

// Mock Next.js Image (we're in test env so native img is used, but mock for completeness)
vi.mock('next/image', () => ({
  default: ({ src, alt, width, height, className, onError, priority, 'data-testid': testId }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    className?: string;
    onError?: () => void;
    priority?: boolean;
    'data-testid'?: string;
  }) => (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={onError}
      data-priority={priority}
      data-testid={testId}
    />
  ),
}));

describe('BrandLogo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch; // Set mock before each test
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ logo: '/org-logo.png' }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    global.fetch = originalFetch; // Restore original fetch after each test
  });

  // Helper to ensure renders that trigger useEffect state updates are wrapped in act
  const renderLogo = async (ui: React.ReactElement) => {
    let utils: ReturnType<typeof render>;
    await act(async () => {
      utils = render(ui);
    });
    // @ts-expect-error initialized in act
    return utils as ReturnType<typeof render>;
  };

  describe('Size Presets', () => {
    test('renders with default md size preset', async () => {
      await renderLogo(<BrandLogo />);
      const img = screen.getByTestId('brand-logo');
      
      // Default md size: 48x48
      expect(img).toHaveAttribute('width', '48');
      expect(img).toHaveAttribute('height', '48');
      expect(img.className).toContain('w-12');
      expect(img.className).toContain('h-12');
    });

    test('renders with xs size preset', async () => {
      await renderLogo(<BrandLogo size="xs" />);
      const img = screen.getByTestId('brand-logo');
      
      expect(img).toHaveAttribute('width', '24');
      expect(img).toHaveAttribute('height', '24');
      expect(img.className).toContain('w-6');
      expect(img.className).toContain('h-6');
    });

    test('renders with lg size preset', async () => {
      await renderLogo(<BrandLogo size="lg" />);
      const img = screen.getByTestId('brand-logo');
      
      expect(img).toHaveAttribute('width', '64');
      expect(img).toHaveAttribute('height', '64');
      expect(img.className).toContain('w-16');
      expect(img.className).toContain('h-16');
    });

    test('renders with 2xl size preset', async () => {
      await renderLogo(<BrandLogo size="2xl" />);
      const img = screen.getByTestId('brand-logo');
      
      expect(img).toHaveAttribute('width', '120');
      expect(img).toHaveAttribute('height', '120');
      expect(img.className).toContain('w-[120px]');
      expect(img.className).toContain('h-[120px]');
    });
  });

  describe('Custom Dimensions (Regression: audit fix)', () => {
    /**
     * REGRESSION TEST: Custom dimensions should override size presets
     * 
     * This test ensures that when customWidth or customHeight is provided,
     * the component uses those values instead of the preset sizeClassName.
     * 
     * Fix applied in: components/brand/BrandLogo.tsx
     * Issue: Size preset classes were being applied even when custom dimensions were provided
     */
    test('customWidth overrides size preset width attribute', async () => {
      await renderLogo(<BrandLogo size="md" width={100} />);
      const img = screen.getByTestId('brand-logo');
      
      // Custom width should be used instead of md preset (48)
      expect(img).toHaveAttribute('width', '100');
      // Height should still use preset since not customized
      expect(img).toHaveAttribute('height', '48');
    });

    test('customHeight overrides size preset height attribute', async () => {
      await renderLogo(<BrandLogo size="md" height={100} />);
      const img = screen.getByTestId('brand-logo');
      
      // Width should use preset
      expect(img).toHaveAttribute('width', '48');
      // Custom height should be used
      expect(img).toHaveAttribute('height', '100');
    });

    test('both customWidth and customHeight override size preset', async () => {
      await renderLogo(<BrandLogo size="xs" width={200} height={150} />);
      const img = screen.getByTestId('brand-logo');
      
      // Both custom dimensions should be used
      expect(img).toHaveAttribute('width', '200');
      expect(img).toHaveAttribute('height', '150');
    });

    test('custom dimensions work with any size preset', async () => {
      const { rerender } = await renderLogo(<BrandLogo size="2xl" width={50} height={50} />);
      let img = screen.getByTestId('brand-logo');
      
      // Custom should override 2xl preset (120x120)
      expect(img).toHaveAttribute('width', '50');
      expect(img).toHaveAttribute('height', '50');

      // Try with another preset
      await act(async () => rerender(<BrandLogo size="xs" width={300} height={300} />));
      img = screen.getByTestId('brand-logo');
      
      // Custom should override xs preset (24x24)
      expect(img).toHaveAttribute('width', '300');
      expect(img).toHaveAttribute('height', '300');
    });
  });

  describe('Logo Variants', () => {
    test('applies rounded corners by default', async () => {
      await renderLogo(<BrandLogo />);
      const img = screen.getByTestId('brand-logo');
      
      expect(img.className).toContain('rounded-2xl');
    });

    test('rounded can be disabled', async () => {
      await renderLogo(<BrandLogo rounded={false} />);
      const img = screen.getByTestId('brand-logo');
      
      expect(img.className).not.toContain('rounded');
    });

    test('applies card variant styles', async () => {
      await renderLogo(<BrandLogo variant="card" />);
      const img = screen.getByTestId('brand-logo');
      
      expect(img.className).toContain('bg-card');
      expect(img.className).toContain('shadow-lg');
    });

    test('applies additional className', async () => {
      await renderLogo(<BrandLogo className="custom-class another-class" />);
      const img = screen.getByTestId('brand-logo');
      
      expect(img.className).toContain('custom-class');
      expect(img.className).toContain('another-class');
    });
  });

  describe('Logo Sources', () => {
    test('uses default logo when fetchOrgLogo is false', async () => {
      await renderLogo(<BrandLogo fetchOrgLogo={false} />);
      const img = screen.getByTestId('brand-logo');
      
      expect(img).toHaveAttribute('src', '/img/fixzit-logo.png');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('uses custom logoUrl when provided', async () => {
      await renderLogo(<BrandLogo logoUrl="/custom-logo.png" />);
      const img = screen.getByTestId('brand-logo');
      
      expect(img).toHaveAttribute('src', '/custom-logo.png');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    test('fetches org logo when fetchOrgLogo is true', async () => {
      await renderLogo(<BrandLogo fetchOrgLogo={true} />);
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/organization/settings',
          expect.objectContaining({
            cache: 'force-cache',
          })
        );
      });
    });

    test('updates logo src when org logo is fetched', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ logo: '/fetched-org-logo.png' }),
      });

      await renderLogo(<BrandLogo fetchOrgLogo={true} />);
      
      await waitFor(() => {
        const img = screen.getByTestId('brand-logo');
        expect(img).toHaveAttribute('src', '/fetched-org-logo.png');
      });
    });

    test('keeps default logo when fetch fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await renderLogo(<BrandLogo fetchOrgLogo={true} />);
      const img = screen.getByTestId('brand-logo');
      
      // Should still show default after fetch fails
      await waitFor(() => {
        expect(img).toHaveAttribute('src', '/img/fixzit-logo.png');
      });
    });
  });

  describe('Accessibility', () => {
    test('uses default alt text', async () => {
      await renderLogo(<BrandLogo />);
      const img = screen.getByTestId('brand-logo');
      
      expect(img).toHaveAttribute('alt', 'Fixzit');
    });

    test('uses custom alt text when provided', async () => {
      await renderLogo(<BrandLogo alt="Company Logo" />);
      const img = screen.getByTestId('brand-logo');
      
      expect(img).toHaveAttribute('alt', 'Company Logo');
    });

    test('uses custom data-testid', async () => {
      await renderLogo(<BrandLogo data-testid="custom-logo" />);
      
      expect(screen.getByTestId('custom-logo')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('calls onError callback when image fails to load', async () => {
      const handleError = vi.fn();
      await renderLogo(<BrandLogo onError={handleError} />);
      const img = screen.getByTestId('brand-logo');
      
      // Simulate image load error
      await act(async () => {
        img.dispatchEvent(new Event('error'));
      });
      
      expect(handleError).toHaveBeenCalled();
    });
  });
});

describe('BrandLogoWithCard', () => {
  test('wraps BrandLogo in a card container', () => {
    render(<BrandLogoWithCard data-testid="card-logo" />);
    
    const logo = screen.getByTestId('card-logo');
    const container = logo.parentElement;
    
    expect(container).toHaveClass('bg-card');
    expect(container).toHaveClass('rounded-2xl');
    expect(container).toHaveClass('shadow-lg');
  });

  test('uses xl size by default', () => {
    render(<BrandLogoWithCard />);
    const img = screen.getByTestId('brand-logo');
    
    // xl preset: 80x80
    expect(img).toHaveAttribute('width', '80');
    expect(img).toHaveAttribute('height', '80');
  });

  test('accepts custom size', () => {
    render(<BrandLogoWithCard size="sm" />);
    const img = screen.getByTestId('brand-logo');
    
    // sm preset: 32x32
    expect(img).toHaveAttribute('width', '32');
    expect(img).toHaveAttribute('height', '32');
  });
});
