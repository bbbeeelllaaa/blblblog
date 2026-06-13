import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';

const resources = {
  'zh-CN': { translation: zhCN },
  'en': { translation: en },
};

const savedLang = localStorage.getItem('lang');
const browserLang = navigator.language || 'en';
const defaultLang = savedLang || (browserLang.startsWith('zh') ? 'zh-CN' : 'en');

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLang,
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    returnObjects: false,
  });

export default i18n;
