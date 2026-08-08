import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import all language files
import en from './locales/en.json';
import fa from './locales/fa.json';
import ru from './locales/ru.json';
import zh from './locales/zh.json';
import de from './locales/de.json';
import sv from './locales/sv.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import tr from './locales/tr.json';
import pt from './locales/pt.json';

export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', dir: 'rtl' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', dir: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', dir: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', dir: 'ltr' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', dir: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', dir: 'ltr' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', dir: 'ltr' },
] as const;

export type LanguageCode = typeof supportedLanguages[number]['code'];

const resources = {
  en: { translation: en },
  fa: { translation: fa },
  ru: { translation: ru },
  zh: { translation: zh },
  de: { translation: de },
  sv: { translation: sv },
  fr: { translation: fr },
  es: { translation: es },
  ja: { translation: ja },
  ko: { translation: ko },
  tr: { translation: tr },
  pt: { translation: pt },
};

// Custom storage for Electron (uses localStorage as fallback)
const languageStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      // Try to get from electron store via IPC
      const settings = await window.electronAPI?.getSettings();
      return settings?.language || localStorage.getItem(key);
    } catch {
      return localStorage.getItem(key);
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    localStorage.setItem(key, value);
    try {
      // Also save to electron store
      const settings = await window.electronAPI?.getSettings();
      await window.electronAPI?.saveSettings({ ...settings, language: value });
    } catch {
      // Ignore if electron API not available
    }
  },
  removeItem: (key: string): void => {
    localStorage.removeItem(key);
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'translation',
    ns: ['translation'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    react: {
      useSuspense: false,
    },
  });

// Helper to change language and persist
export const changeLanguage = async (lng: LanguageCode) => {
  await i18n.changeLanguage(lng);
  await languageStorage.setItem('i18nextLng', lng);
  
  // Update document direction for RTL languages
  const langConfig = supportedLanguages.find((l) => l.code === lng);
  if (langConfig) {
    document.documentElement.dir = langConfig.dir;
    document.documentElement.lang = lng;
  }
};

// Initialize direction on load
const currentLang = i18n.language?.split('-')[0] as LanguageCode;
const langConfig = supportedLanguages.find((l) => l.code === currentLang);
if (langConfig) {
  document.documentElement.dir = langConfig.dir;
  document.documentElement.lang = currentLang;
}

export default i18n;