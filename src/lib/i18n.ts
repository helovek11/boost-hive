import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import en from './i18n/en';
import ru from './i18n/ru';
import es from './i18n/es';

export type Language = 'en' | 'ru' | 'es';
export type Theme = 'dark' | 'light';
export type Currency = 'RUB';

interface I18nState {
  language: Language;
  theme: Theme;
  currency: Currency;
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  setCurrency: (currency: Currency) => void;
}

export const useI18n = create<I18nState>()(
  persist(
    (set) => ({
      language: 'ru',
      theme: 'dark',
      currency: 'RUB' as Currency,
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setCurrency: (currency) => set({ currency }),
    }),
    { name: 'hive-i18n' }
  )
);

export const translations = { en, ru, es } as const;

export type TranslationKey = keyof typeof translations.en;

export const t = (key: TranslationKey): string => {
  const { language } = useI18n.getState();
  return translations[language][key] || translations.en[key] || key;
};
