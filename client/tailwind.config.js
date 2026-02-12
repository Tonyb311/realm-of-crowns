/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // === Legacy colors (used by existing game pages — keep for backward compat) ===
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

        // === Arcane design system colors ===
        // Primary backgrounds
        'realm-bg': {
          900: '#0A0E1A',
          800: '#111827',
          700: '#151A2D',
          600: '#1A1F35',
          500: '#242B45',
        },
        // Gold accent system
        'realm-gold': {
          100: '#FFF3D4',
          200: '#F5E0A0',
          300: '#F5C542',
          400: '#D4A843',
          500: '#C9952B',
          600: '#8B6914',
          700: '#6B4F10',
        },
        // Bronze/copper secondary
        'realm-bronze': {
          300: '#D4956B',
          400: '#B87333',
          500: '#8B5A2B',
          600: '#6B4226',
        },
        // Teal secondary
        'realm-teal': {
          300: '#4D8FA8',
          400: '#2D5F7C',
          500: '#1B3A4B',
          600: '#142D3B',
        },
        // Purple accent (magic/rare)
        'realm-purple': {
          300: '#A855C7',
          400: '#7B2D8E',
          500: '#4A1942',
        },
        // Text colors
        'realm-text': {
          primary: '#E8DCC8',
          secondary: '#B0A48E',
          muted: '#6B6358',
          gold: '#D4A843',
        },
        // Status colors
        'realm-hp': '#C44536',
        'realm-hp-bg': '#3D1515',
        'realm-success': '#5A8F6E',
        'realm-danger': '#8B2E2E',
        'realm-warning': '#C9952B',
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Inter', 'sans-serif'],
        accent: ['Cinzel', 'serif'],
        // Legacy fonts (if needed explicitly)
        'display-legacy': ['MedievalSharp', 'serif'],
        'body-legacy': ['Crimson Text', 'Georgia', 'serif'],
        mono: ['Fira Code', 'monospace'],
      },
      boxShadow: {
        'realm-glow': '0 0 15px rgba(212, 168, 67, 0.15)',
        'realm-glow-strong': '0 0 25px rgba(212, 168, 67, 0.3)',
        'realm-inner': 'inset 0 1px 0 rgba(212, 168, 67, 0.1)',
        'realm-panel': '0 4px 20px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(212, 168, 67, 0.08)',
      },
      backgroundImage: {
        'parchment-texture': "url('/assets/images/parchment-bg.png')",
        'dark-stone': "url('/assets/images/stone-bg.png')",
        'realm-vignette': 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)',
        'realm-panel-gradient': 'linear-gradient(180deg, rgba(212,168,67,0.05) 0%, transparent 30%)',
      },
      borderColor: {
        'realm-border': 'rgba(212, 168, 67, 0.15)',
        'realm-border-strong': 'rgba(212, 168, 67, 0.3)',
      },
    },
  },
  plugins: [],
};
