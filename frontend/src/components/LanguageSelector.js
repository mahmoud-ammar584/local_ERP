'use client';

import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LanguageSelector() {
  const { locale, changeLocale } = useLanguage();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      background: 'rgba(201, 168, 76, 0.1)',
      borderRadius: '0.5rem',
      padding: '0.25rem',
    }}>
      <button
        onClick={() => changeLocale('en')}
        style={{
          padding: '0.5rem 0.75rem',
          borderRadius: '0.375rem',
          transition: 'all 0.2s',
          border: 'none',
          background: locale === 'en' ? 'var(--gold)' : 'transparent',
          color: locale === 'en' ? '#fff' : 'var(--text-secondary)',
          fontWeight: locale === 'en' ? 600 : 400,
          cursor: 'pointer',
          fontSize: '0.875rem',
        }}
      >
        English
      </button>
      <button
        onClick={() => changeLocale('ar')}
        style={{
          padding: '0.5rem 0.75rem',
          borderRadius: '0.375rem',
          transition: 'all 0.2s',
          border: 'none',
          background: locale === 'ar' ? 'var(--gold)' : 'transparent',
          color: locale === 'ar' ? '#fff' : 'var(--text-secondary)',
          fontWeight: locale === 'ar' ? 600 : 400,
          cursor: 'pointer',
          fontSize: '0.875rem',
        }}
      >
        العربية
      </button>
    </div>
  );
}
