import { create } from 'zustand';

const useThemeStore = create(() => ({
  theme: 'modern',
  initTheme: () => {},
}));

export default useThemeStore;
