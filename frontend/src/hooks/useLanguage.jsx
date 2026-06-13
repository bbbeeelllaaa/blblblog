import { useTranslation } from 'react-i18next';

export default function useLanguage() {
  const { t, i18n } = useTranslation();

  const currentLanguage = i18n.language;

  const changeLanguage = (lang) => {
    localStorage.setItem('lang', lang);
    i18n.changeLanguage(lang);
  };

  return { t, i18n, currentLanguage, changeLanguage };
}
