// tailwind.config.ts - Enhanced configuration for Fixzit Souq
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      // Fixzit Brand Colors
      colors: {
        // Brand colors
        fixzit: {
          blue: '#0061A8',
          'blue-dark': '#023047',
          orange: '#F6851F',
          green: '#00A859',
          yellow: '#FFB400',
        },
        // Semantic colors
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
          hover: 'hsl(var(--card-hover))',
        },
      },

      // Custom border radius
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },

      // Font families
      fontFamily: {
        sans: ['var(--font-sans)', 'IBM Plex Sans Arabic', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        arabic: ['IBM Plex Sans Arabic', 'Noto Sans Arabic', 'system-ui'],
      },

      // Custom spacing for RTL-friendly layouts
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      // Animations
      keyframes: {
        // Fade animations
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-out': {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(10px)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },

        // Slide animations
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-bottom': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-out-bottom': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0' },
        },

        // Scale animations
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'scale-out': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },

        // Skeleton shimmer
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },

        // Pulse for critical items
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },

        // Accordion animations
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },

        // Spin
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },

        // Bounce
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },

        // Row highlight
        'row-highlight': {
          '0%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(0, 97, 168, 0.1)' },
          '100%': { backgroundColor: 'transparent' },
        },

        // Toast slide
        'toast-slide-in': {
          '0%': { transform: 'translateX(calc(100% + 24px))' },
          '100%': { transform: 'translateX(0)' },
        },
        'toast-slide-out': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(calc(100% + 24px))' },
        },
      },

      animation: {
        // Fade
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.2s ease-out',
        'fade-in-up': 'fade-in-up 0.3s ease-out',

        // Slide
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'slide-in-bottom': 'slide-in-bottom 0.3s ease-out',
        'slide-out-bottom': 'slide-out-bottom 0.2s ease-out',

        // Scale
        'scale-in': 'scale-in 0.15s ease-out',
        'scale-out': 'scale-out 0.15s ease-out',

        // Utility
        shimmer: 'shimmer 1.5s infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'spin-slow': 'spin-slow 3s linear infinite',
        'bounce-soft': 'bounce-soft 1s ease-in-out infinite',
        'row-highlight': 'row-highlight 1s ease-out',

        // Accordion
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',

        // Toast
        'toast-slide-in': 'toast-slide-in 0.2s ease-out',
        'toast-slide-out': 'toast-slide-out 0.15s ease-in',
      },

      // Transitions
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
      },

      // Box shadows
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -4px rgba(0, 0, 0, 0.2)',
        'dropdown': '0 10px 38px -10px rgba(0, 0, 0, 0.35), 0 10px 20px -15px rgba(0, 0, 0, 0.2)',
        'dialog': '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        'glow-blue': '0 0 15px rgba(0, 97, 168, 0.5)',
        'glow-orange': '0 0 15px rgba(246, 133, 31, 0.5)',
      },

      // Z-index scale
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },

      // Background images
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
        'noise': "url('/images/noise.png')",
      },

      // Typography
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },

      // For RTL support - custom logical property utilities
      // These are automatically handled by Tailwind's RTL support
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
    // RTL plugin for logical properties
    function({ addUtilities, theme }: any) {
      const newUtilities = {
        // Custom utilities for RTL-safe animations
        '.animate-slide-in-start': {
          animation: 'slide-in-left 0.3s ease-out',
          '[dir="rtl"] &': {
            animation: 'slide-in-right 0.3s ease-out',
          },
        },
        '.animate-slide-in-end': {
          animation: 'slide-in-right 0.3s ease-out',
          '[dir="rtl"] &': {
            animation: 'slide-in-left 0.3s ease-out',
          },
        },
        // Text utilities
        '.text-balance': {
          textWrap: 'balance',
        },
        // Gradient text
        '.text-gradient': {
          background: 'linear-gradient(135deg, var(--fixzit-blue) 0%, var(--fixzit-orange) 100%)',
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          backgroundClip: 'text',
        },
      };
      addUtilities(newUtilities);
    },
  ],
};

export default config;
