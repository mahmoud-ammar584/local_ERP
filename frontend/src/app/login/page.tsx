'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setSession, getDefaultRoute } from '@/lib/auth'
import { useLanguage } from '@/lib/i18n'
import { Sparkles, Lock, User, ArrowRight, AlertCircle } from 'lucide-react'

import { resolveApiUrl } from '@/lib/http'

export default function LoginPage() {
  const router = useRouter()
  const { t, language, setLanguage } = useLanguage()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(resolveApiUrl('/api/auth/login/'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || data.detail || 'Invalid username or password')
      } else {
        setSession(data.token, data.user)
        const destination = getDefaultRoute()
        router.push(destination)
      }
    } catch (err) {
      setError('Network connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Glow Background Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Language Switcher */}
      <button
        type="button"
        onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
        className="absolute top-6 right-6 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 transition"
      >
        {language === 'ar' ? 'English' : 'العربية'}
      </button>

      <div className="w-full max-w-md bg-[#0c0c10] border border-[#1e1e26] rounded-2xl p-8 shadow-2xl relative z-10">
        {/* Brand Icon & Heading */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
            <Sparkles className="w-6 h-6 text-zinc-950" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Funnel <span className="text-amber-400 font-semibold">ERP</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            {t('brandSubtitle')}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2.5 text-xs text-red-400 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {t('usernameOrEmail')}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute top-3.5 start-3.5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full ps-10 pe-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/80 transition"
                placeholder={language === 'ar' ? 'أدخل اسم المستخدم' : 'Enter your username'}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {t('password')}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-500 absolute top-3.5 start-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full ps-10 pe-4 py-2.5 bg-zinc-950/80 border border-zinc-800 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400/80 focus:ring-1 focus:ring-amber-400/80 transition"
                placeholder="••••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{loading ? t('authenticating') : t('signIn')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800/60 text-center">
          <p className="text-[11px] text-zinc-500">
            {language === 'ar'
              ? 'نظام مؤمن متعدد المستأجرين مع عزل كامل للبيانات وتدقيق أمني شامل'
              : 'Secure Multi-Tenant Architecture with Tenant-Level Isolation & Audit'}
          </p>
        </div>
      </div>
    </div>
  )
}
