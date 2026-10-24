/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        ink: {
          950: '#07090d',
          900: '#0b0f15',
          850: '#10151d',
          800: '#151b25',
          700: '#1f2733',
          600: '#2b3544',
        },
      },
      keyframes: {
        flash: {
          '0%': { backgroundColor: 'rgba(250, 204, 21, 0.35)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },
      animation: {
        flash: 'flash 1.6s ease-out',
      },
    },
  },
  plugins: [],
};
