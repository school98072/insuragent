import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enJSON from './locales/en.json';
import zhJSON from './locales/zh.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enJSON },
      zh: { translation: zhJSON },
    },
    lng: 'en', // default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
