/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // TraceGuard dark-first palette
        surface: {
          DEFAULT: '#09090b',  // zinc-950
          card: '#18181b',     // zinc-900
          border: '#27272a',   // zinc-800
          muted: '#3f3f46',    // zinc-700
        },
        brand: {
          DEFAULT: '#6366f1',  // indigo-500
          dim: '#4f46e5',      // indigo-600
          muted: '#312e81',    // indigo-900
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
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      keyframes: {
        'ring-fill': {
          '0%': { 'stroke-dashoffset': '251' },
          '100%': { 'stroke-dashoffset': 'var(--ring-offset)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'ring-fill': 'ring-fill 1s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'pulse-dot': 'pulse-dot 1.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
