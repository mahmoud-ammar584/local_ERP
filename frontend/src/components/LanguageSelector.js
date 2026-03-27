'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageSelector() {
  const { locale, changeLocale, t } = useLanguage();

  return (
    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => changeLocale('en')}
        className={`px-3 py-2 rounded transition-all ${
          locale === 'en'
            ? 'bg-blue-600 text-white font-semibold'
            : 'text-gray-700 hover:bg-gray-200'
        }`}
      >
        English
      </button>
      <button
        onClick={() => changeLocale('ar')}
        className={`px-3 py-2 rounded transition-all ${
          locale === 'ar'
            ? 'bg-blue-600 text-white font-semibold'
            : 'text-gray-700 hover:bg-gray-200'
        }`}
      >
        العربية
      </button>
    </div>
  );
}
