import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
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
  plugins: [],
};
export default config;

