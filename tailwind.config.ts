import type { Config } from 'tailwindcss';
import rtl from 'tailwindcss-rtl';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fixzit: {
          blue: '#0061A8',
          dark: '#023047',
          orange: '#F6851F',
          green: '#00A859',
          yellow: '#FFB400',
        },
      },
      boxShadow: {
        glass: '0 10px 30px rgba(2,48,71,0.15)',
      },
    },
  },
  plugins: [rtl()],
};
export default config;

