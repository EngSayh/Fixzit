import type { Config } from 'tailwindcss';
import tailwindcssLogical from 'tailwindcss-logical';
import tailwindcssAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './app/**/*.{ts,tsx,js,jsx,mdx}',
    './components/**/*.{ts,tsx,js,jsx,mdx}',
    './pages/**/*.{ts,tsx,js,jsx,mdx}',
    './contexts/**/*.{ts,tsx,js,jsx,mdx}',
    './lib/**/*.{ts,tsx,js,jsx,mdx}',
    './hooks/**/*.{ts,tsx,js,jsx,mdx}',
    './providers/**/*.{ts,tsx,js,jsx,mdx}',
    './modules/**/*.{ts,tsx,js,jsx,mdx}',
    './core/**/*.{ts,tsx,js,jsx,mdx}',
    './domain/**/*.{ts,tsx,js,jsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        popover: 'hsl(var(--popover))',
        'popover-foreground': 'hsl(var(--popover-foreground))',
        primary: 'hsl(var(--primary))',
        'primary-foreground': 'hsl(var(--primary-foreground))',
        secondary: 'hsl(var(--secondary))',
        'secondary-foreground': 'hsl(var(--secondary-foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        accent: 'hsl(var(--accent))',
        'accent-foreground': 'hsl(var(--accent-foreground))',
        destructive: 'hsl(var(--destructive))',
        'destructive-foreground': 'hsl(var(--destructive-foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        'sidebar-background': 'hsl(var(--sidebar-background))',
        'sidebar-foreground': 'hsl(var(--sidebar-foreground))',
        'sidebar-primary': 'hsl(var(--sidebar-primary))',
        'sidebar-primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
        'sidebar-accent': 'hsl(var(--sidebar-accent))',
        'sidebar-accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
        'sidebar-border': 'hsl(var(--sidebar-border))',
        'sidebar-ring': 'hsl(var(--sidebar-ring))',
        brand: {
          50: '#f9f2ea',
          100: '#f4e5d6',
          200: '#eaccad',
          300: '#e0b284',
          400: '#d6995b',
          500: '#cc7f32',
          600: '#a36628',
          700: '#7a4c1e',
          800: '#513314',
          900: '#28190a',
          DEFAULT: 'hsl(var(--primary))',
        },
        success: {
          DEFAULT: '#1f7a4d',
          dark: '#17603c',
        },
        warning: {
          DEFAULT: '#b45309',
          dark: '#92400e',
        },
        danger: '#b91c1c',
        info: '#0f172a',
        'fz-blue': 'hsl(var(--primary))',
        'fz-orange': 'hsl(var(--accent))',
        'fz-green': 'hsl(var(--accent))',
        'fz-yellow': 'hsl(var(--accent))',
        'fixzit-blue': 'hsl(var(--primary))',
        'fixzit-green': 'hsl(var(--accent))',
        'fixzit-yellow': 'hsl(var(--accent))',
        'fixzit-dark': 'hsl(var(--foreground))',
        'fixzit-light-bg': 'hsl(var(--section-bg))',
        'fixzit-orange': 'hsl(var(--accent))',
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        arabic: ['Noto Sans Arabic', 'Tahoma', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        fxz: 'var(--card-shadow)',
        'fxz-lg': 'var(--card-shadow-lg)',
        card: '0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 12px 0 rgba(0, 0, 0, 0.1)',
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
        'glass-lg': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        soft: '0 2px 25px -2px rgba(0, 0, 0, 0.12)',
        aurora: '0 0 60px hsl(30 60% 40% / 0.15)',
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundImage: {
        'aurora-gradient':
          'linear-gradient(135deg, rgba(204, 127, 50, 0.12) 0%, rgba(133, 106, 85, 0.08) 50%, rgba(204, 127, 50, 0.05) 100%)',
        'aurora-strong':
          'linear-gradient(135deg, rgba(204, 127, 50, 0.2) 0%, rgba(133, 106, 85, 0.15) 50%, rgba(204, 127, 50, 0.08) 100%)',
        'glass-gradient':
          'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [
    function ({ addUtilities, addComponents }) {
      const rtlUtilities = {
        '.rtl-flip': {
          transform: 'scaleX(-1)',
        },
        '.rtl-rotate-180': {
          '[dir="rtl"] &': {
            transform: 'rotate(180deg)',
          },
        },
        '.rtl-mirror': {
          '[dir="rtl"] &': {
            transform: 'scaleX(-1)',
          },
        },
        '.ltr-only': {
          '[dir="rtl"] &': {
            display: 'none',
          },
        },
        '.rtl-only': {
          '[dir="ltr"] &': {
            display: 'none',
          },
        },
        '.rtl-mr-auto': {
          '[dir="rtl"] &': {
            marginRight: 'auto',
            marginLeft: '0',
          },
        },
        '.rtl-ml-auto': {
          '[dir="rtl"] &': {
            marginLeft: 'auto',
            marginRight: '0',
          },
        },
        '.rtl-text-left': {
          '[dir="rtl"] &': {
            textAlign: 'right',
          },
        },
        '.rtl-text-right': {
          '[dir="rtl"] &': {
            textAlign: 'left',
          },
        },
        '.rtl-float-left': {
          '[dir="rtl"] &': {
            float: 'right',
          },
        },
        '.rtl-float-right': {
          '[dir="rtl"] &': {
            float: 'left',
          },
        },
      };

      const rtlComponents = {
        '.arabic-font': {
          fontFamily: 'Noto Sans Arabic, Tahoma, Arial, sans-serif',
          fontFeatureSettings: '"liga" off',
        },
        '.sidebar-rtl': {
          '[dir="rtl"] &': {
            right: '0',
            left: 'auto',
          },
        },
        '.dropdown-rtl': {
          '[dir="rtl"] &': {
            right: '0',
            left: 'auto',
          },
        },
        '.glass': {
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
          '.dark &': {
            background: 'rgba(15, 15, 15, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          },
        },
        '.glass-weak': {
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
        },
        '.glass-dark': {
          '.dark &': {
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          },
        },
        '.bg-aurora': {
          background:
            'linear-gradient(-45deg, rgba(204, 127, 50, 0.12), rgba(133, 106, 85, 0.08), rgba(204, 127, 50, 0.05), rgba(80, 60, 45, 0.04))',
          backgroundSize: '400% 400%',
          animation: 'aurora 10s ease-in-out infinite alternate',
        },
        '.glass-card': {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 0, 0, 0.05)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.18)',
          '.dark &': {
            background: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          },
        },
        '.glass-button': {
          background: 'rgba(204, 127, 50, 0.12)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(204, 127, 50, 0.35)',
          borderRadius: '12px',
          transition: 'all 0.3s ease',
          '&:hover': {
            background: 'rgba(204, 127, 50, 0.2)',
            transform: 'translateY(-2px)',
            boxShadow: '0 12px 40px 0 rgba(204, 127, 50, 0.2)',
          },
        },
      };

      addUtilities(rtlUtilities);
      addComponents(rtlComponents);
    },
    tailwindcssLogical,
    tailwindcssAnimate,
  ],
};

export default config;
