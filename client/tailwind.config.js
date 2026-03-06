/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // === Legacy colors (admin pages still use blood) ===
        blood: {
          DEFAULT: '#8B0000',
          light: '#B22222',
          dark: '#5C0000',
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
        'realm-danger': {
          DEFAULT: '#8B2E2E',
          light: '#B22222',
        },
        'realm-warning': '#C9952B',

        // Semantic effect colors (map to raw Tailwind equivalents used in codebase)
        'realm-damage': {
          DEFAULT: '#EF4444',   // red-500 — damage, errors, negative indicators
          light: '#F87171',     // red-400 — damage text highlights
          muted: '#FCA5A5',     // red-300 — softer damage/warning text
        },
        'realm-heal': {
          DEFAULT: '#4ADE80',   // green-400 — healing, positive effects
          light: '#86EFAC',     // green-300 — heal highlights
        },
        'realm-magic': {
          DEFAULT: '#C084FC',   // purple-400 — magic, arcane, rare
          light: '#D8B4FE',     // purple-300 — magic highlights
        },
        'realm-info': {
          DEFAULT: '#60A5FA',   // blue-400 — informational, water, neutral highlights
          light: '#93C5FD',     // blue-300 — info highlights
        },
        'realm-caution': {
          DEFAULT: '#FBBF24',   // amber-400 — caution, warnings, desert
          light: '#FDE047',     // yellow-300 — caution highlights
        },
        'realm-neutral': {
          DEFAULT: '#9CA3AF',   // gray-400 — disabled, empty, muted
          light: '#D1D5DB',     // gray-300 — neutral highlights
          dark: '#6B7280',      // gray-500 — neutral badges
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Inter', 'sans-serif'],
        accent: ['Cinzel', 'serif'],
        mono: ['Fira Code', 'monospace'],
      },
      boxShadow: {
        'realm-glow': '0 0 15px rgba(212, 168, 67, 0.15)',
        'realm-glow-strong': '0 0 25px rgba(212, 168, 67, 0.3)',
        'realm-inner': 'inset 0 1px 0 rgba(212, 168, 67, 0.1)',
        'realm-panel': '0 4px 20px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(212, 168, 67, 0.08)',
      },
      backgroundImage: {
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
