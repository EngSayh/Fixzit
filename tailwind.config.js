/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: [
    './app/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './pages/**/*.{ts,tsx,js,jsx}',
    './contexts/**/*.{ts,tsx,js,jsx}',
    './lib/**/*.{ts,tsx,js,jsx}',
    './hooks/**/*.{ts,tsx,js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Design System - CSS Variable Mapped Colors for shadcn/ui compatibility
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: 'var(--brand-500, #2f78ff)',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: 'var(--accent-500, #00a859)', // Primary accent green
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        // Fixzit Phase 1 Brand Colors
        brand: {
          primary: '#0061A8',  // Fixzit Blue
          secondary: '#00A859', // Fixzit Green
          accent: '#FFB400',    // Fixzit Yellow
          dark: '#023047',      // Dark header bg
          DEFAULT: '#0061A8',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0061A8', // Primary brand blue
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a'
        },
        success: '#00a859', 
        warning: '#FFB400',
        danger: '#E74C3C',
        'fz-blue': {
          400: '#60a5fa',
          600: '#2563eb',
          700: '#1d4ed8'
        },
        'fz-orange': '#F6851F',
        'fz-green': '#00a859',
        'fz-yellow': '#FFB400'
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ],
        arabic: [
          'Noto Sans Arabic',
          'Tahoma',
          'Arial',
          'sans-serif'
        ]
      },
      boxShadow: {
        'card': '0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 12px 0 rgba(0, 0, 0, 0.1)',
        // Glass morphism shadows
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-lg': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'soft': '0 2px 25px -2px rgba(0, 0, 0, 0.12)',
        'aurora': '0 0 60px rgba(47, 120, 255, 0.1)'
      },
      backdropBlur: {
        'xs': '2px',
      },
      backgroundImage: {
        'aurora-gradient': 'linear-gradient(135deg, rgba(47, 120, 255, 0.1) 0%, rgba(0, 168, 89, 0.08) 50%, rgba(47, 120, 255, 0.05) 100%)',
        'aurora-strong': 'linear-gradient(135deg, rgba(47, 120, 255, 0.2) 0%, rgba(0, 168, 89, 0.15) 50%, rgba(47, 120, 255, 0.1) 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)'
      },
      animation: {
        'aurora': 'aurora 10s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'counter': 'counter 2s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out'
      },
      keyframes: {
        aurora: {
          '0%': {
            backgroundPosition: '0% 50%'
          },
          '50%': {
            backgroundPosition: '100% 50%'
          },
          '100%': {
            backgroundPosition: '0% 50%'
          }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        counter: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem'
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    },
  },
  // Custom RTL utilities
  corePlugins: {
    // Enable all core plugins
  },
  plugins: [
    // Custom RTL plugin
    function({ addUtilities, addComponents }) {
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
        // RTL spacing utilities
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
        // Glass morphism utilities
        '.glass': {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
        },
        '.glass-weak': {
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(5px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        },
        '.glass-dark': {
          '.dark &': {
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }
        },
        '.bg-aurora': {
          background: 'linear-gradient(-45deg, rgba(47, 120, 255, 0.1), rgba(0, 168, 89, 0.08), rgba(47, 120, 255, 0.05), rgba(0, 168, 89, 0.03))',
          backgroundSize: '400% 400%',
          animation: 'aurora 10s ease-in-out infinite alternate'
        }
      };

      const glassComponents = {
        '.glass-card': {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          '.dark &': {
            background: 'rgba(0, 0, 0, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }
        },
        '.glass-button': {
          background: 'rgba(47, 120, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(47, 120, 255, 0.3)',
          borderRadius: '12px',
          transition: 'all 0.3s ease',
          '&:hover': {
            background: 'rgba(47, 120, 255, 0.2)',
            transform: 'translateY(-2px)',
            boxShadow: '0 12px 40px 0 rgba(47, 120, 255, 0.2)'
          }
        }
      };

      addUtilities(rtlUtilities);
      addComponents(rtlComponents);
      addComponents(glassComponents);
    },
  ],
}

export default config;
