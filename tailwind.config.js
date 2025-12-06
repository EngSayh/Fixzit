const tailwindcssLogical = require("tailwindcss-logical");
const tailwindcssAnimate = require("tailwindcss-animate");

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx,js,jsx,mdx}",
    "./components/**/*.{ts,tsx,js,jsx,mdx}",
    "./pages/**/*.{ts,tsx,js,jsx,mdx}",
    "./contexts/**/*.{ts,tsx,js,jsx,mdx}",
    "./lib/**/*.{ts,tsx,js,jsx,mdx}",
    "./hooks/**/*.{ts,tsx,js,jsx,mdx}",
    "./providers/**/*.{ts,tsx,js,jsx,mdx}",
    "./modules/**/*.{ts,tsx,js,jsx,mdx}",
    "./core/**/*.{ts,tsx,js,jsx,mdx}",
    "./domain/**/*.{ts,tsx,js,jsx,mdx}",
  ],
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        "card-foreground": "hsl(var(--card-foreground))",
        popover: "hsl(var(--popover))",
        "popover-foreground": "hsl(var(--popover-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        "primary-dark": "hsl(30 60% 30%)",
        secondary: "hsl(var(--secondary))",
        "secondary-foreground": "hsl(var(--secondary-foreground))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        accent: "hsl(var(--accent))",
        "accent-foreground": "hsl(var(--accent-foreground))",
        destructive: "hsl(var(--destructive))",
        "destructive-foreground": "hsl(var(--destructive-foreground))",
        "destructive-dark": "hsl(0 63% 25%)",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        "sidebar-background": "hsl(var(--sidebar-background))",
        "sidebar-foreground": "hsl(var(--sidebar-foreground))",
        "sidebar-primary": "hsl(var(--sidebar-primary))",
        "sidebar-primary-foreground": "hsl(var(--sidebar-primary-foreground))",
        "sidebar-accent": "hsl(var(--sidebar-accent))",
        "sidebar-accent-foreground": "hsl(var(--sidebar-accent-foreground))",
        "sidebar-border": "hsl(var(--sidebar-border))",
        "sidebar-ring": "hsl(var(--sidebar-ring))",
        success: "hsl(var(--accent))",
        "success-foreground": "hsl(var(--accent-foreground))",
        "success-dark": "hsl(30 45% 30%)",
        warning: "hsl(35 85% 45%)",
        "warning-foreground": "hsl(24 15% 15%)",
        "warning-dark": "hsl(30 70% 38%)",
        info: "hsl(210 10% 35%)",
        "info-foreground": "hsl(var(--section-bg))",
        "section-bg": "hsl(var(--section-bg))",
        "section-alt": "hsl(var(--section-alt))",
        "fz-blue": "hsl(var(--primary))",
        "fxz-blue": "hsl(var(--primary))",
        "fz-orange": "hsl(var(--accent))",
        "fxz-orange": "hsl(var(--accent))",
        "fz-green": "hsl(var(--accent))",
        "fxz-green": "hsl(var(--accent))",
        "fz-yellow": "hsl(var(--accent))",
        "fxz-yellow": "hsl(var(--accent))",
        "fixzit-blue": "hsl(var(--primary))",
        "fixzit-green": "hsl(var(--accent))",
        "fixzit-yellow": "hsl(var(--accent))",
        "fixzit-dark": "hsl(var(--foreground))",
        "fixzit-light-bg": "hsl(var(--section-bg))",
        "fixzit-orange": "hsl(var(--accent))",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        arabic: ["Noto Sans Arabic", "Tahoma", "Arial", "sans-serif"],
      },
      boxShadow: {
        fxz: "var(--card-shadow)",
        "fxz-lg": "var(--card-shadow-lg)",
        card: "0 2px 4px 0 rgba(0, 0, 0, 0.06)",
        "card-hover": "0 4px 12px 0 rgba(0, 0, 0, 0.1)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.15)",
        "glass-lg": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        soft: "0 2px 25px -2px rgba(0, 0, 0, 0.12)",
        aurora: "0 0 60px hsl(30 60% 40% / 0.15)",
      },
      backdropBlur: {
        xs: "2px",
        "2xl": "40px",
        "3xl": "64px",
      },
      transitionDuration: {
        "400": "400ms",
        "600": "600ms",
      },
      backgroundImage: {
        "aurora-gradient":
          "linear-gradient(135deg, rgba(204, 127, 50, 0.12) 0%, rgba(133, 106, 85, 0.08) 50%, rgba(204, 127, 50, 0.05) 100%)",
        "aurora-strong":
          "linear-gradient(135deg, rgba(204, 127, 50, 0.2) 0%, rgba(133, 106, 85, 0.15) 50%, rgba(204, 127, 50, 0.08) 100%)",
        "glass-gradient":
          "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)",
        "mesh-gradient":
          "radial-gradient(at 40% 20%, hsl(28 75% 45% / 0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, hsl(28 60% 35% / 0.1) 0px, transparent 50%), radial-gradient(at 0% 50%, hsl(40 30% 50% / 0.08) 0px, transparent 50%)",
        "noise-overlay":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "shimmer-gradient":
          "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent)",
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "fade-up": "fade-up 0.5s ease-out",
        "fade-down": "fade-down 0.5s ease-out",
        "scale-in": "scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-in-left": "slide-in-left 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        "slide-in-right": "slide-in-right 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        "shimmer": "shimmer 2s linear infinite",
        "pulse-soft": "pulse-soft 3s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "gradient-shift": "gradient-shift 8s ease infinite",
        "spin-slow": "spin 8s linear infinite",
        "bounce-subtle": "bounce-subtle 2s ease-in-out infinite",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-down": {
          from: { opacity: "0", transform: "translateY(-16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-24px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(24px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "shimmer": {
          from: { backgroundPosition: "200% 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "glow": {
          from: { boxShadow: "0 0 20px hsl(28 75% 45% / 0.2)" },
          to: { boxShadow: "0 0 30px hsl(28 75% 45% / 0.4)" },
        },
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
      },
      spacing: {
        18: "4.5rem",
        88: "22rem",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [
    function ({ addUtilities, addComponents }) {
      const rtlUtilities = {
        ".rtl-flip": { transform: "scaleX(-1)" },
        ".rtl-rotate-180": {
          '[dir="rtl"] &': {
            transform: "rotate(180deg)",
          },
        },
        ".rtl-mirror": {
          '[dir="rtl"] &': {
            transform: "scaleX(-1)",
          },
        },
        ".ltr-only": {
          '[dir="rtl"] &': {
            display: "none",
          },
        },
        ".rtl-only": {
          '[dir="ltr"] &': {
            display: "none",
          },
        },
        ".rtl-mr-auto": {
          '[dir="rtl"] &': {
            marginRight: "auto",
            marginLeft: "0",
          },
        },
        ".rtl-ml-auto": {
          '[dir="rtl"] &': {
            marginLeft: "auto",
            marginRight: "0",
          },
        },
        ".rtl-text-left": {
          '[dir="rtl"] &': {
            textAlign: "right",
          },
        },
        ".rtl-text-right": {
          '[dir="rtl"] &': {
            textAlign: "left",
          },
        },
        ".rtl-float-left": {
          '[dir="rtl"] &': {
            float: "right",
          },
        },
        ".rtl-float-right": {
          '[dir="rtl"] &': {
            float: "left",
          },
        },
      };

      const rtlComponents = {
        ".arabic-font": {
          fontFamily: "Noto Sans Arabic, Tahoma, Arial, sans-serif",
          fontFeatureSettings: '"liga" off',
        },
        ".sidebar-rtl": {
          '[dir="rtl"] &': {
            right: "0",
            left: "auto",
          },
        },
        ".dropdown-rtl": {
          '[dir="rtl"] &': {
            right: "0",
            left: "auto",
          },
        },
        ".glass": {
          background: "rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.15)",
          ".dark &": {
            background: "rgba(15, 15, 15, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
          },
        },
        ".glass-weak": {
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(6px)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
        },
        ".glass-dark": {
          ".dark &": {
            background: "rgba(0, 0, 0, 0.35)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          },
        },
        ".bg-aurora": {
          background:
            "linear-gradient(-45deg, rgba(204, 127, 50, 0.12), rgba(133, 106, 85, 0.08), rgba(204, 127, 50, 0.05), rgba(80, 60, 45, 0.04))",
          backgroundSize: "400% 400%",
          animation: "aurora 10s ease-in-out infinite alternate",
        },
        ".glass-card": {
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          borderRadius: "16px",
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.18)",
          ".dark &": {
            background: "rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(255, 255, 255, 0.05)",
          },
        },
        ".glass-button": {
          background: "rgba(204, 127, 50, 0.12)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(204, 127, 50, 0.35)",
          borderRadius: "12px",
          transition: "all 0.3s ease",
          "&:hover": {
            background: "rgba(204, 127, 50, 0.2)",
            transform: "translateY(-2px)",
            boxShadow: "0 12px 40px 0 rgba(204, 127, 50, 0.2)",
          },
        },
        /* Shimmer effect for loading states */
        ".shimmer": {
          background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent)",
          backgroundSize: "200% 100%",
          animation: "shimmer 2s linear infinite",
        },
        /* Atmospheric noise overlay */
        ".noise-bg": {
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            inset: "0",
            opacity: "0.03",
            pointerEvents: "none",
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          },
        },
        /* Gradient text effect */
        ".gradient-text": {
          backgroundImage: "linear-gradient(135deg, hsl(28 75% 45%) 0%, hsl(28 60% 55%) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        },
        /* Enhanced card hover effect */
        ".card-hover-lift": {
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.15)",
          },
        },
        /* Glow ring effect */
        ".glow-ring": {
          position: "relative",
          "&::after": {
            content: '""',
            position: "absolute",
            inset: "-2px",
            borderRadius: "inherit",
            background: "linear-gradient(135deg, hsl(28 75% 45% / 0.4), hsl(28 75% 45% / 0.1))",
            zIndex: "-1",
            opacity: "0",
            transition: "opacity 0.3s ease",
          },
          "&:hover::after": {
            opacity: "1",
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

module.exports = config;
