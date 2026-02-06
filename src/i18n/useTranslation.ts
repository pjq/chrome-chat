import { useMemo } from 'react';
import { t, setLocale, getCurrentLocale, getSupportedLocales } from './i18n';

// Custom hook for using translations
export function useTranslation() {
  return useMemo(() => ({
    t,
    i18n: {
      language: getCurrentLocale(),
      supportedLocales: getSupportedLocales(),
      changeLanguage: async (lng: string) => {
        await setLocale(lng);
        return lng;
      }
    }
  }), []);
}