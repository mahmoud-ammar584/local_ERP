import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Funnel ERP — Luxury Retail Management',
  description: 'Enterprise ERP for luxury fashion boutiques and apparel retailers',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <body className="bg-[#050508] text-zinc-100 min-h-screen antialiased selection:bg-amber-500/30 selection:text-amber-200">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
