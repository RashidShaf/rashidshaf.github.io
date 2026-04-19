/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    screens: {
      sm: '640px',
      sm2: '700px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      '3xl': '2500px',
    },
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-light': 'var(--color-primary-light)',
        accent: 'var(--color-accent)',
        'accent-light': 'var(--color-accent-light)',
        secondary: 'var(--color-secondary)',
        surface: 'var(--color-surface)',
        'surface-alt': 'var(--color-surface-alt)',
        muted: 'var(--color-muted)',
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        arabic: 'var(--font-arabic)',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        fadeInUp: 'fadeInUp 0.5s ease-out',
        slideInLeft: 'slideInLeft 0.5s ease-out',
        scaleIn: 'scaleIn 0.3s ease-out',
      },
    },
  },
  plugins: [
    function ({ addVariant }) {
      addVariant('rtl', '[dir="rtl"] &');
    },
  ],
};
