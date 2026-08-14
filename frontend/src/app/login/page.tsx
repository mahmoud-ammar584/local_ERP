'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setTokens } from '@/lib/auth'
import { fetchJson, ApiError } from '@/lib/http'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await fetchJson<{ access: string; refresh: string; workspace_id?: string }>(
        '/api/v1/auth/login/',
        { method: 'POST', body: JSON.stringify({ email, password }), skipAuth: true }
      )
      setTokens(data.access, data.refresh)
      if (data.workspace_id) {
        localStorage.setItem('sarih_workspace_id', data.workspace_id)
      } else {
        try {
          const me = await fetchJson<{ workspace_id?: string }>('/api/v1/auth/me/', { method: 'GET' })
          if (me.workspace_id) localStorage.setItem('sarih_workspace_id', me.workspace_id)
        } catch { /* continue */ }
      }
      router.push('/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      {/* Left amber accent bar */}
      <div className="fixed left-0 top-0 bottom-0 w-[3px] bg-signal-amber" />

      <div className="w-full max-w-[400px]">

        {/* Header */}
        <div className="mb-10">
          <div className="text-[7pt] font-bold tracking-[0.18em] text-signal-amber mb-3 uppercase">
            صريح  ·  SARIH
          </div>
          <h1 className="text-[28pt] font-bold text-text-primary leading-none">
            Radical Financial Truth.
          </h1>
          <p className="text-[10pt] text-text-muted mt-2">
            Access requires credentials. No exceptions.
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-void-border mb-8" />

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 border border-signal-critical/40 bg-[#1A0000] rounded-sm text-[9pt] text-signal-critical">
              ✕ {error}
            </div>
          )}
          <div>
            <label className="block text-[8pt] font-bold uppercase tracking-[0.1em] text-text-muted mb-2">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="sarih-input"
              placeholder="you@company.com"
              required
            />
          </div>
          <div>
            <label className="block text-[8pt] font-bold uppercase tracking-[0.1em] text-text-muted mb-2">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="sarih-input"
              required
            />
          </div>
          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            className="sarih-btn-primary w-full mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In  →'}
          </button>
        </form>

        {/* Footer link */}
        <p className="text-center text-[9pt] text-text-muted mt-6">
          No account?{' '}
          <a href="/signup" className="text-signal-amber hover:underline">
            Request access
          </a>
        </p>

        {/* Brand law */}
        <div className="mt-10 pt-6 border-t border-void-border">
          <p className="text-[8pt] text-text-muted text-center italic">
            &ldquo;We don&apos;t comfort. We warn.&rdquo;
          </p>
        </div>
      </div>
    </div>
  )
}
