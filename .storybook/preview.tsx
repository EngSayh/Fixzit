import type { Preview } from '@storybook/react';
import { withThemeByClassName } from '@storybook/addon-themes';
import React from 'react';
import '../app/globals.css';

/**
 * Storybook Preview Configuration
 * Global decorators and parameters
 * Created by [AGENT-0039]
 */

// RTL support decorator
const withRTLSupport = (Story: React.ComponentType, context: { globals: { direction?: string } }) => {
  const direction = context.globals?.direction || 'ltr';
  return (
    <div dir={direction} className={direction === 'rtl' ? 'font-arabic' : ''}>
      <Story />
    </div>
  );
};

const preview: Preview = {
  parameters: {
    // Action logging
    actions: { argTypesRegex: '^on[A-Z].*' },

    // Control types
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    // Viewport options (mobile-first)
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '667px' },
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1440px', height: '900px' },
        },
      },
    },

    // Backgrounds
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#0D121C' }, // Neutral-950 (Fixzit sidebar)
        { name: 'gray', value: '#f5f5f5' },
      ],
    },

    // Next.js specific
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: '/',
      },
    },
  },

  // Global toolbar options
  globalTypes: {
    direction: {
      name: 'Direction',
      description: 'Text direction for RTL support',
      defaultValue: 'ltr',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'ltr', title: 'LTR (English)' },
          { value: 'rtl', title: 'RTL (Arabic)' },
        ],
        dynamicTitle: true,
      },
    },
    locale: {
      name: 'Locale',
      description: 'Internationalization locale',
      defaultValue: 'en',
      toolbar: {
        icon: 'globe',
        items: [
          { value: 'en', title: 'English' },
          { value: 'ar', title: 'العربية' },
        ],
        dynamicTitle: true,
      },
    },
  },

  // Decorators (applied to all stories)
  decorators: [
    withRTLSupport,
    withThemeByClassName({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
  ],
};

export default preview;
