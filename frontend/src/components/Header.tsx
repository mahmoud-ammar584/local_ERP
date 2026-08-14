'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/lib/i18n'
import { clearSession, getUser } from '@/lib/auth'
import { Globe, LogOut, Store } from 'lucide-react'

export function Header() {
  const router = useRouter()
  const { language, setLanguage, t } = useLanguage()
  const user = getUser()

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${localStorage.getItem('funnel_auth_token')}`,
          'Content-Type': 'application/json'
        }
      })
    } catch {
      // ignore network errors
    } finally {
      clearSession()
      router.push('/login')
    }
  }

  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar')
  }

  return (
    <header className="h-16 border-b border-[#1e1e24] bg-[#0c0c0f]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
          <Store className="w-4 h-4 text-amber-400" />
          <span>{user?.company_name || 'Funnel Boutique'}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white transition"
          title="Switch Language"
        >
          <Globe className="w-3.5 h-3.5 text-amber-400" />
          <span>{language === 'ar' ? 'English' : 'العربية'}</span>
        </button>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-xs font-semibold text-red-400 transition"
          title={t('logout')}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>{t('logout')}</span>
        </button>
      </div>
    </header>
  )
}
