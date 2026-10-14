/** @type {import('tailwindcss').Config} */
// Design tokens mirror the production shop (see docs/SYNC.md, «Design tokens»): the same purple and clay,
// the same three font families. The colours are CSS variables written once in src/index.css.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Cairo', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Cairo', 'Inter', 'sans-serif'],
        arabic: ['Cairo', 'sans-serif'],
      },
      colors: {
        primary: 'rgb(var(--c-primary) / <alpha-value>)',
        'primary-dark': 'rgb(var(--c-primary-dark) / <alpha-value>)',
        'primary-tint': 'rgb(var(--c-primary-tint) / <alpha-value>)',
        secondary: 'rgb(var(--c-secondary) / <alpha-value>)',
        light: '#f9f9f9',
        dark: '#1f1f1f',
      },
      screens: {
        xs: '475px',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
