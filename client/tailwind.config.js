/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 游戏主题色
        'game-ocean': '#0ea5e9',
        'game-ship': '#f59e0b',
        'game-cargo': '#10b981',
        'game-gold': '#fbbf24',
        
        // 货物颜色
        'cargo-jade': '#059669',     // 翡翠绿
        'cargo-silk': '#2563eb',     // 丝绸蓝
        'cargo-ginseng': '#eab308',  // 人参黄
        'cargo-nutmeg': '#374151',   // 肉豆蔻黑
      },
      fontFamily: {
        'primary': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
        'display': ['Poppins', 'sans-serif'],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'dice-roll': 'diceRoll 1s ease-in-out',
        'ship-move': 'shipMove 0.5s ease-in-out',
        'card-flip': 'cardFlip 0.3s ease-in-out',
      },
      keyframes: {
        diceRoll: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        shipMove: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100px)' },
        },
        cardFlip: {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
      },
    },
  },
  plugins: [],
}
