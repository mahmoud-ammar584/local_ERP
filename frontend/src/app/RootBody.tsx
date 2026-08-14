'use client'

import { useLanguage } from '@/lib/i18n'

export function RootBody({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage()
  const isArabic = language === 'ar'

  return (
    <body
      className={`min-h-screen bg-[#050505] text-text-primary antialiased ${
        isArabic ? 'font-arabic' : 'font-sans'
      }`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      {children}
    </body>
  )
}
