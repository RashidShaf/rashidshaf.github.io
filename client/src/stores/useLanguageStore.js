import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import en from '../locales/en.json';
import ar from '../locales/ar.json';

const translations = { en, ar };

const useLanguageStore = create(
  persist(
    (set, get) => ({
      language: 'en',
      isRTL: false,

      setLanguage: (lang) => {
        const isRTL = lang === 'ar';
        document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', lang);
        set({ language: lang, isRTL });
      },

      t: (key, params) => {
        const { language } = get();
        const keys = key.split('.');
        let value = translations[language];
        for (const k of keys) {
          value = value?.[k];
        }
        if (!value) return key;
        if (params && typeof value === 'string') {
          return value.replace(/\{\{(\w+)\}\}/g, (_, k) => params[k] ?? '');
        }
        return value;
      },

      initLanguage: () => {
        const { language } = get();
        const isRTL = language === 'ar';
        document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', language);
        set({ isRTL });
      },
    }),
    {
      name: 'language-storage',
      partialize: (state) => ({ language: state.language }),
    }
  )
);

export default useLanguageStore;
