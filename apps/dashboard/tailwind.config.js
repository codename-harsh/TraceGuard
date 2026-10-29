/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#09090b',  // zinc-950
          card: '#18181b',     // zinc-900
          border: '#27272a',   // zinc-800
          muted: '#3f3f46',    // zinc-700
          subtle: '#121215',
        },
        brand: {
          DEFAULT: '#6366f1',  // indigo-500
          hover: '#4f46e5',    // indigo-600
          muted: '#312e81',    // indigo-900
          light: '#818cf8',
        },
        risk: {
          minimal: '#22c55e',   // green-500
          low: '#84cc16',       // lime-500
          moderate: '#f59e0b',  // amber-500
          elevated: '#f97316',  // orange-500
          high: '#ef4444',      // red-500
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'ring-fill': {
          '0%': { strokeDashoffset: '251.2' },
          '100%': { strokeDashoffset: 'var(--ring-offset)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out forwards',
        'ring-fill': 'ring-fill 1s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      },
    },
  },
  plugins: [],
};
