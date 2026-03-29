import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'modern',

      setTheme: (theme) => {
        if (theme === 'modern') {
          document.documentElement.removeAttribute('data-theme');
        } else {
          document.documentElement.setAttribute('data-theme', theme);
        }
        set({ theme });
      },

      initTheme: () => {
        const { theme } = get();
        if (theme !== 'modern') {
          document.documentElement.setAttribute('data-theme', theme);
        }
      },
    }),
    {
      name: 'theme-storage',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);

export default useThemeStore;
