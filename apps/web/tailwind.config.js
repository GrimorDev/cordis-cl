/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Cordis dark theme colors
        bg: {
          primary: '#1a1a2e',    // deepest background
          secondary: '#16213e',  // sidebar background
          tertiary: '#0f3460',   // hover states
          elevated: '#1e1e3a',   // modals, cards
        },
        brand: {
          DEFAULT: '#7c3aed',    // primary purple
          light: '#a78bfa',
          dark: '#5b21b6',
        },
        surface: {
          DEFAULT: '#252540',
          hover: '#2d2d55',
        },
        text: {
          primary: '#e2e8f0',
          secondary: '#94a3b8',
          muted: '#64748b',
        },
        green: {
          online: '#22c55e',
        },
        yellow: {
          idle: '#eab308',
        },
        red: {
          dnd: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
