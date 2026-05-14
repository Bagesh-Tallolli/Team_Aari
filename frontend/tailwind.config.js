/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        indigo: {
          600: '#4F46E5',
        },
        green: {
          500: '#22C55E',
        },
        red: {
          500: '#EF4444',
        },
        slate: {
          950: '#0F172A',
          900: '#0F172A',
          800: '#1E293B',
        },
      },
      backdropBlur: {
        md: '12px',
      },
      boxShadow: {
        'glow-indigo': '0 0 20px rgba(79, 70, 229, 0.3)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.3)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(79, 70, 229, 0.3)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 30px rgba(79, 70, 229, 0.5)' },
        },
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
