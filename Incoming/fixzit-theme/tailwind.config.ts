import type { Config } from 'tailwindcss';

/**
 * Fixzit Design System - Tailwind Configuration
 * Based on Ejar.sa (Saudi Government Platforms Code)
 * RTL-First Arabic Support for Next.js 14
 * 
 * @author Sultan Al Hassni
 * @version 1.0.0
 */

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // ============================================
      // COLOR PALETTE (Ejar-Inspired)
      // ============================================
      colors: {
        // Primary Brand Colors (Ejar Green)
        primary: {
          50: '#E8F7EE',
          100: '#C7EAD8',
          200: '#8FD4B1',
          300: '#5FBD8E',
          400: '#3BA874',
          500: '#25935F', // Main brand color
          600: '#188352', // Hover state
          700: '#166A45', // Active/pressed
          800: '#0F5535',
          900: '#0A3D26',
          950: '#052918',
          DEFAULT: '#25935F',
        },

        // Secondary Brand Color (Lavender accent)
        secondary: {
          50: '#F5F0F8',
          100: '#EBE1F1',
          200: '#D7C3E3',
          300: '#C3A5D5',
          400: '#A177BE',
          500: '#80519F', // Main secondary
          600: '#6A4385',
          700: '#54356B',
          800: '#3E2751',
          900: '#281937',
          950: '#1A0F24',
          DEFAULT: '#80519F',
        },

        // Neutral/Gray Scale
        neutral: {
          50: '#F9FAFB',  // Page backgrounds
          100: '#F3F4F6', // Card backgrounds
          200: '#E5E7EB', // Dividers
          300: '#CFD4DB', // Light borders
          400: '#A8AEB8', // Borders
          500: '#8A919C', // Disabled text
          600: '#6C737F', // Placeholder text
          700: '#434B5A', // Muted text
          800: '#2D3340', // Secondary text
          900: '#1A1F2B', // Headings
          950: '#0D121C', // Primary text / Dark backgrounds
        },

        // Semantic Colors
        success: {
          50: '#ECFDF5',
          100: '#D4F4E5',
          200: '#A7E9CA',
          300: '#6DDAA5',
          400: '#34C77D',
          500: '#17B26A', // Main success
          600: '#0F9A58',
          700: '#0F8A51',
          800: '#106B41',
          900: '#0F5835',
          950: '#05311D',
        },

        error: {
          50: '#FEF3F2',
          100: '#FEEAE9',
          200: '#FECDCA',
          300: '#FDA29B',
          400: '#F97066',
          500: '#F04438', // Main error
          600: '#D92D20',
          700: '#B42318',
          800: '#912018',
          900: '#7A271A',
          950: '#55160C',
        },

        warning: {
          50: '#FFFAEB',
          100: '#FEF3E7',
          200: '#FEDF89',
          300: '#FEC84B',
          400: '#FDB022',
          500: '#F79009', // Main warning
          600: '#DC6803',
          700: '#B54708',
          800: '#93370D',
          900: '#7A2E0E',
          950: '#4E1D09',
        },

        info: {
          50: '#EFF8FF',
          100: '#E7F3FF',
          200: '#B2DDFF',
          300: '#84CAFF',
          400: '#53B1FD',
          500: '#2E90FA', // Main info
          600: '#1570EF',
          700: '#175CD3',
          800: '#1849A9',
          900: '#194185',
          950: '#102A56',
        },

        // Special Colors
        gold: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F5BD02', // Ejar gold accent
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
          DEFAULT: '#F5BD02',
        },

        // Saudi National Colors (for government compliance)
        saudi: {
          green: '#006C35',
          white: '#FFFFFF',
        },

        // Background shortcuts
        background: {
          DEFAULT: '#F9FAFB',
          paper: '#FFFFFF',
          subtle: '#F3F4F6',
          muted: '#E5E7EB',
        },

        // Foreground/Text shortcuts
        foreground: {
          DEFAULT: '#0D121C',
          muted: '#6C737F',
          subtle: '#8A919C',
        },

        // Border shortcuts
        border: {
          DEFAULT: '#E5E7EB',
          muted: '#CFD4DB',
          strong: '#A8AEB8',
        },
      },

      // ============================================
      // TYPOGRAPHY
      // ============================================
      fontFamily: {
        // Arabic-first font stacks
        sans: [
          'var(--font-ibm-plex-arabic)',
          'var(--font-ibm-plex-sans)',
          'Tajawal',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        arabic: [
          'var(--font-ibm-plex-arabic)',
          'var(--font-tajawal)',
          'Noto Kufi Arabic',
          'sans-serif',
        ],
        english: [
          'var(--font-ibm-plex-sans)',
          'var(--font-inter)',
          'Roboto',
          'system-ui',
          'sans-serif',
        ],
        heading: [
          'var(--font-inter)',
          'var(--font-alexandria)',
          'var(--font-ibm-plex-arabic)',
          'sans-serif',
        ],
        mono: [
          'var(--font-ibm-plex-mono)',
          'IBM Plex Mono',
          'Fira Code',
          'monospace',
        ],
      },

      // Font sizes with line heights and weights
      fontSize: {
        // Display headings
        'display-2xl': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '200' }],
        'display-xl': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '200' }],
        'display-lg': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-md': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
        'display-sm': ['1.875rem', { lineHeight: '1.25', fontWeight: '600' }],
        'display-xs': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],

        // Text sizes
        'text-xl': ['1.25rem', { lineHeight: '1.5', fontWeight: '400' }],
        'text-lg': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }],
        'text-md': ['1rem', { lineHeight: '1.5', fontWeight: '400' }],
        'text-sm': ['0.875rem', { lineHeight: '1.43', fontWeight: '400' }],
        'text-xs': ['0.75rem', { lineHeight: '1.33', fontWeight: '400' }],
      },

      // ============================================
      // SPACING & SIZING
      // ============================================
      spacing: {
        '0.5': '0.125rem', // 2px
        '1.5': '0.375rem', // 6px
        '2.5': '0.625rem', // 10px
        '3.5': '0.875rem', // 14px
        '4.5': '1.125rem', // 18px
        '5.5': '1.375rem', // 22px
        '13': '3.25rem',   // 52px
        '15': '3.75rem',   // 60px
        '17': '4.25rem',   // 68px
        '18': '4.5rem',    // 72px (header height)
        '22': '5.5rem',    // 88px
        '26': '6.5rem',    // 104px
        '30': '7.5rem',    // 120px
        '34': '8.5rem',    // 136px
        '38': '9.5rem',    // 152px
        '42': '10.5rem',   // 168px
        '50': '12.5rem',   // 200px
        '58': '14.5rem',   // 232px
        '66': '16.5rem',   // 264px
        '74': '18.5rem',   // 296px
        '82': '20.5rem',   // 328px
        '90': '22.5rem',   // 360px
        '100': '25rem',    // 400px
        '120': '30rem',    // 480px
        '140': '35rem',    // 560px
        '160': '40rem',    // 640px
        '180': '45rem',    // 720px
        '200': '50rem',    // 800px
      },

      // Container sizes
      maxWidth: {
        'container-xs': '20rem',    // 320px
        'container-sm': '24rem',    // 384px
        'container-md': '28rem',    // 448px
        'container-lg': '32rem',    // 512px
        'container-xl': '36rem',    // 576px
        'container-2xl': '42rem',   // 672px
        'container-3xl': '48rem',   // 768px
        'container-4xl': '56rem',   // 896px
        'container-5xl': '64rem',   // 1024px
        'container-6xl': '72rem',   // 1152px
        'container-7xl': '80rem',   // 1280px
        'container-8xl': '87.5rem', // 1400px (Ejar max-width)
        'prose': '65ch',
      },

      // Min heights for sections
      minHeight: {
        'screen-75': '75vh',
        'screen-80': '80vh',
        'screen-90': '90vh',
      },

      // ============================================
      // BORDERS & RADIUS
      // ============================================
      borderRadius: {
        'none': '0',
        'xs': '0.125rem',   // 2px
        'sm': '0.25rem',    // 4px
        'md': '0.5rem',     // 8px (default for inputs)
        'lg': '0.75rem',    // 12px (cards)
        'xl': '1rem',       // 16px
        '2xl': '1.5rem',    // 24px
        '3xl': '2rem',      // 32px
        '4xl': '2.5rem',    // 40px
        'full': '9999px',
      },

      borderWidth: {
        '0': '0px',
        '1': '1px',
        '2': '2px',
        '3': '3px',
        '4': '4px',
      },

      // ============================================
      // SHADOWS & EFFECTS
      // ============================================
      boxShadow: {
        'none': 'none',
        'xs': '0 1px 2px 0 rgba(13, 18, 28, 0.05)',
        'sm': '0 1px 3px 0 rgba(13, 18, 28, 0.1), 0 1px 2px -1px rgba(13, 18, 28, 0.1)',
        'md': '0 4px 6px -1px rgba(13, 18, 28, 0.1), 0 2px 4px -2px rgba(13, 18, 28, 0.1)',
        'lg': '0 10px 15px -3px rgba(13, 18, 28, 0.1), 0 4px 6px -4px rgba(13, 18, 28, 0.1)',
        'xl': '0 20px 25px -5px rgba(13, 18, 28, 0.1), 0 8px 10px -6px rgba(13, 18, 28, 0.1)',
        '2xl': '0 25px 50px -12px rgba(13, 18, 28, 0.25)',
        '3xl': '0 35px 60px -15px rgba(13, 18, 28, 0.3)',
        // Semantic shadows
        'card': '0 2px 8px rgba(13, 18, 28, 0.08)',
        'card-hover': '0 8px 24px rgba(13, 18, 28, 0.12)',
        'header': '0 2px 8px rgba(13, 18, 28, 0.08)',
        'dropdown': '0 4px 16px rgba(13, 18, 28, 0.12)',
        'modal': '0 20px 40px rgba(13, 18, 28, 0.16)',
        'toast': '0 4px 12px rgba(13, 18, 28, 0.15)',
        // Focus rings
        'focus-primary': '0 0 0 3px rgba(37, 147, 95, 0.25)',
        'focus-error': '0 0 0 3px rgba(240, 68, 56, 0.25)',
        // Inner shadows
        'inner': 'inset 0 2px 4px 0 rgba(13, 18, 28, 0.05)',
        'inner-sm': 'inset 0 1px 2px 0 rgba(13, 18, 28, 0.05)',
      },

      // ============================================
      // TRANSITIONS & ANIMATIONS
      // ============================================
      transitionDuration: {
        '0': '0ms',
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',  // Fast
        '200': '200ms',  // Normal
        '250': '250ms',
        '300': '300ms',  // Slow
        '400': '400ms',
        '500': '500ms',
        '700': '700ms',
        '1000': '1000ms',
      },

      transitionTimingFunction: {
        'ease-in-out-custom': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },

      animation: {
        'fade-in': 'fadeIn 200ms ease-out',
        'fade-out': 'fadeOut 150ms ease-in',
        'slide-in-right': 'slideInRight 300ms ease-out',
        'slide-in-left': 'slideInLeft 300ms ease-out',
        'slide-in-up': 'slideInUp 300ms ease-out',
        'slide-in-down': 'slideInDown 300ms ease-out',
        'scale-in': 'scaleIn 200ms ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-gentle': 'bounceGentle 1s infinite',
        'shimmer': 'shimmer 2s infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(-5%)' },
          '50%': { transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },

      // ============================================
      // Z-INDEX SCALE
      // ============================================
      zIndex: {
        '0': '0',
        '10': '10',
        '20': '20',
        '30': '30',
        '40': '40',
        '50': '50',
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
        'dropdown': '1000',
        'sticky': '1020',
        'fixed': '1030',
        'modal-backdrop': '1040',
        'modal': '1050',
        'popover': '1060',
        'tooltip': '1070',
        'toast': '1080',
        'max': '9999',
      },

      // ============================================
      // RESPONSIVE BREAKPOINTS
      // ============================================
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
        // Max-width breakpoints
        'max-xs': { 'max': '474px' },
        'max-sm': { 'max': '639px' },
        'max-md': { 'max': '767px' },
        'max-lg': { 'max': '1023px' },
        'max-xl': { 'max': '1279px' },
        'max-2xl': { 'max': '1535px' },
      },

      // ============================================
      // ASPECT RATIOS
      // ============================================
      aspectRatio: {
        'auto': 'auto',
        'square': '1 / 1',
        'video': '16 / 9',
        'photo': '4 / 3',
        'portrait': '3 / 4',
        'wide': '21 / 9',
        'golden': '1.618 / 1',
      },

      // ============================================
      // BACKDROP BLUR
      // ============================================
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        '3xl': '40px',
      },
    },
  },

  // ============================================
  // PLUGINS
  // ============================================
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    require('@tailwindcss/typography'),
    require('@tailwindcss/container-queries'),
    // RTL plugin if installed
    // require('tailwindcss-rtl'),
  ],
};

export default config;
