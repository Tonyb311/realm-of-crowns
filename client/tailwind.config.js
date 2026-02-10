/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FDF8E8',
          100: '#F5EBCB',
          200: '#E8D49A',
          300: '#D4BA6A',
          400: '#C9A461',
          500: '#B8913A',
          600: '#9A7830',
          700: '#7C5F26',
          800: '#5E471C',
          900: '#402F12',
        },
        dark: {
          50: '#4A4A6E',
          100: '#3D3D5C',
          200: '#33334E',
          300: '#2D2D44',
          400: '#252538',
          500: '#1A1A2E',
          600: '#141424',
          700: '#0E0E1A',
          800: '#080810',
          900: '#040408',
        },
        parchment: {
          50: '#F5F0E4',
          100: '#EDE5D4',
          200: '#E8E0D0',
          300: '#D4C9B4',
          400: '#BFB49E',
          500: '#A89A80',
        },
        blood: {
          DEFAULT: '#8B0000',
          light: '#B22222',
          dark: '#5C0000',
        },
        forest: {
          DEFAULT: '#2D5A27',
          light: '#4A8C3F',
          dark: '#1A3A17',
        },
      },
      fontFamily: {
        display: ['MedievalSharp', 'serif'],
        body: ['Crimson Text', 'Georgia', 'serif'],
        mono: ['Fira Code', 'monospace'],
      },
      backgroundImage: {
        'parchment-texture': "url('/assets/images/parchment-bg.png')",
        'dark-stone': "url('/assets/images/stone-bg.png')",
      },
    },
  },
  plugins: [],
};
