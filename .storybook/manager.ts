/**
 * Storybook Manager Configuration
 * Theme and branding settings
 * Created by [AGENT-0039]
 */
import { addons } from '@storybook/manager-api';
import { create } from '@storybook/theming';

// Fixzit brand theme
const fixzitTheme = create({
  base: 'light',

  // Brand
  brandTitle: 'Fixzit Design System',
  brandUrl: 'https://fixzit.sa',
  brandTarget: '_blank',

  // Colors (Ejar.sa Design System)
  colorPrimary: '#25935F', // Primary Green
  colorSecondary: '#F5BD02', // Secondary/Accent Gold

  // UI
  appBg: '#f5f5f5',
  appContentBg: '#ffffff',
  appBorderColor: '#e5e5e5',
  appBorderRadius: 8,

  // Typography
  fontBase: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  fontCode: '"Fira Code", "JetBrains Mono", monospace',

  // Text colors
  textColor: '#0D121C', // Neutral-950
  textInverseColor: '#ffffff',

  // Toolbar
  barTextColor: '#6b7280',
  barSelectedColor: '#25935F',
  barBg: '#ffffff',

  // Form colors
  inputBg: '#ffffff',
  inputBorder: '#e5e5e5',
  inputTextColor: '#0D121C',
  inputBorderRadius: 6,
});

addons.setConfig({
  theme: fixzitTheme,
  sidebar: {
    showRoots: true,
  },
  toolbar: {
    title: { hidden: false },
    zoom: { hidden: false },
    eject: { hidden: false },
    copy: { hidden: false },
    fullscreen: { hidden: false },
  },
});
