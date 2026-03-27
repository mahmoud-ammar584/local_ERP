import en from './en.json';
import ar from './ar.json';

const messages = {
  en,
  ar,
};

export const getTranslation = (locale, key) => {
  const keys = key.split('.');
  let value = messages[locale];

  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      return key; // Return the key if translation is not found
    }
  }

  return value || key;
};

export const isRTL = (locale) => locale === 'ar';

export default messages;
