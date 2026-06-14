/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enables dark mode toggling using a 'dark' class
  theme: {
    extend: {
      colors: {
        // Sleek primary colors
        chess: {
          950: '#070A13',
          900: '#0B0F19',
          800: '#151C2C',
          700: '#1E293B',
          600: '#334155',
          500: '#64748B',
          300: '#CBD5E1',
          100: '#F1F5F9'
        },
        board: {
          light: '#E2E8F0', // Sleek visual contrast board (light squares)
          dark: '#475569'  // Dark slate (dark squares)
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        }
      }
    },
  },
  plugins: [],
}
