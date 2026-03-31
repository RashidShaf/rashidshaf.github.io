/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: '#0F172A',
        'sidebar-hover': '#1E293B',
        'sidebar-active': '#1E40AF',
        'admin-bg': '#F8FAFC',
        'admin-card': '#FFFFFF',
        'admin-border': '#E2E8F0',
        'admin-input-border': '#CBD5E1',
        'admin-text': '#0F172A',
        'admin-muted': '#475569',
        'admin-accent': '#3B82F6',
        'admin-success': '#10B981',
        'admin-warning': '#F59E0B',
        'admin-danger': '#EF4444',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        arabic: ['Tajawal', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
