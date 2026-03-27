'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getTranslation, isRTL } from './locales';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load saved locale from localStorage
    const savedLocale = localStorage.getItem('locale') || 'en';
    setLocale(savedLocale);
    
    // Set HTML lang and dir attributes
    document.documentElement.lang = savedLocale;
    document.documentElement.dir = isRTL(savedLocale) ? 'rtl' : 'ltr';
    
    setIsLoading(false);
  }, []);

  const changeLocale = (newLocale) => {
    setLocale(newLocale);
    localStorage.setItem('locale', newLocale);
    
    // Update HTML attributes
    document.documentElement.lang = newLocale;
    document.documentElement.dir = isRTL(newLocale) ? 'rtl' : 'ltr';
    
    // Dispatch custom event for components to listen to
    window.dispatchEvent(new CustomEvent('localeChanged', { detail: { locale: newLocale } }));
  };

  const t = (key) => getTranslation(locale, key);

  const value = {
    locale,
    changeLocale,
    t,
    isRTL: isRTL(locale),
    isLoading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
