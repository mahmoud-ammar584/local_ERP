import type { Metadata } from 'next'
import './globals.css'
import { RootBody } from './RootBody'

export const metadata: Metadata = {
  title: 'Sarih — Radical Financial Truth',
  description: 'CFO-grade financial intelligence system. No comfort, only clarity.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&family=Inter:wght@300;400;600;700&family=Readex+Pro:wght@300;400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <RootBody>{children}</RootBody>
    </html>
  )
}
