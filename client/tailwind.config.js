/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 航海主题色
        navy: {
          50: '#e8edf5',
          100: '#c5d0e6',
          200: '#9fb2d4',
          300: '#7893c1',
          400: '#5a7ab3',
          500: '#3c62a5',
          600: '#34579a',
          700: '#2a498a',
          800: '#1e3a5f',
          900: '#0f172a',
          950: '#080d19',
        },
        ocean: {
          300: '#67c5e8',
          400: '#38b2d8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        gold: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },

        // 货物颜色（饱和度更高）
        'cargo-jade': '#10b981',
        'cargo-silk': '#6366f1',
        'cargo-ginseng': '#f59e0b',
        'cargo-nutmeg': '#8b5cf6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(251, 191, 36, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(251, 191, 36, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'glow-gold': '0 0 20px rgba(251, 191, 36, 0.3)',
        'glow-ocean': '0 0 20px rgba(14, 165, 233, 0.3)',
        'glow-sm': '0 0 10px rgba(99, 102, 241, 0.2)',
      },
    },
  },
  plugins: [],
}
