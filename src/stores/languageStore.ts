import { create } from 'zustand';
import { translations, LanguageKey, TranslationKey } from '@/locales';

interface LanguageStore {
  language: LanguageKey;
  setLanguage: (lang: LanguageKey) => void;
  t: (key: TranslationKey) => string;
}

export const useLanguageStore = create<LanguageStore>((set, get) => {
  // Load language from localStorage, default to 'zh'
  const savedLanguage = (typeof localStorage !== 'undefined' 
    ? localStorage.getItem('language') 
    : null) as LanguageKey | null;
  const initialLanguage: LanguageKey = savedLanguage || 'zh';

  return {
    language: initialLanguage,
    setLanguage: (lang: LanguageKey) => {
      localStorage.setItem('language', lang);
      set({ language: lang });
    },
    t: (key: TranslationKey) => {
      const { language } = get();
      return translations[language]?.[key] || translations.zh[key] || key;
    },
  };
});

export function useI18n() {
  const { language, setLanguage, t } = useLanguageStore();
  return { language, setLanguage, t };
}
